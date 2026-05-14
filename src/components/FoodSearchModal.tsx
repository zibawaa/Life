import { ChevronLeft, ChevronRight, RefreshCw, Search, Soup, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FoodEntry, LocalFood, MealSlot, ProductLookupResult } from '../types';
import { generateId, todayKey } from '../data/defaults';
import { enrichWithImages, searchOpenFoodFactsProducts } from '../data/openFoodFacts';

const MEAL_SLOTS: Array<{ key: MealSlot; label: string }> = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' }
];

const inferMealSlot = (): MealSlot => {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snacks';
};

const round = (value: number) => Math.round(value);
const PROMPT_EXAMPLES = ['aldi tuna', 'costco rotisserie chicken', 'tesco jacket potato', 'oatly oat milk'];

const productKey = (product: ProductLookupResult) =>
  product.barcode ? `barcode-${product.barcode}` : `search-${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

export function FoodSearchModal({
  open,
  onClose,
  onLog,
  onSaveLocalFood,
  defaultDate
}: {
  open: boolean;
  onClose: () => void;
  onLog: (entry: FoodEntry) => Promise<void>;
  onSaveLocalFood?: (food: LocalFood) => Promise<void>;
  defaultDate?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductLookupResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [selected, setSelected] = useState<ProductLookupResult | null>(null);
  const [grams, setGrams] = useState(100);
  const [mealSlot, setMealSlot] = useState<MealSlot>(inferMealSlot());
  const [saving, setSaving] = useState(false);
  const tokenRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setSelected(null);
    setSearching(false);
    setSearchMessage('');
    setGrams(100);
    setMealSlot(inferMealSlot());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setSearching(false);
      setSearchMessage('');
      return;
    }
    const token = ++tokenRef.current;
    setSearching(true);
    setSearchMessage('');
    const handle = window.setTimeout(() => {
      searchOpenFoodFactsProducts(trimmed)
        .then(async (items) => {
          if (token !== tokenRef.current) return;
          // Show fast with whatever images came back from the CGI search,
          // then enrich missing images in parallel via the v2 product API.
          setResults(items);
          setSearchMessage(items.length ? '' : `No matches for "${trimmed}". Try adding a brand name.`);
          setSearching(false);

          const needsEnrichment = items.some((item) => !item.imageUrl && item.barcode);
          if (!needsEnrichment) return;
          const enriched = await enrichWithImages(items);
          if (token !== tokenRef.current) return;
          setResults(enriched);
        })
        .catch(() => {
          if (token !== tokenRef.current) return;
          setSearchMessage('Search unavailable. Check your connection.');
          setSearching(false);
        });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [open, query]);

  const pick = (product: ProductLookupResult) => {
    setSelected(product);
    const initial = product.servingOptions?.[0]?.grams || product.baseGrams || 100;
    setGrams(Math.max(1, Math.round(initial)));
    setMealSlot(inferMealSlot());
  };

  const back = () => setSelected(null);

  const ratio = selected ? grams / (selected.baseGrams || 100) : 0;
  const macros = useMemo(
    () =>
      selected
        ? {
            calories: round(selected.calories * ratio),
            protein: round(selected.protein * ratio),
            carbs: round(selected.carbs * ratio),
            fat: round(selected.fat * ratio)
          }
        : { calories: 0, protein: 0, carbs: 0, fat: 0 },
    [selected, ratio]
  );

  const log = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const id = productKey(selected);
      if (onSaveLocalFood) {
        await onSaveLocalFood({
          id,
          barcode: selected.barcode || undefined,
          name: selected.name,
          brand: selected.brand,
          source: selected.barcode ? 'barcode' : 'manual',
          baseGrams: selected.baseGrams ?? 100,
          servingOptions: selected.servingOptions,
          unverified: selected.unverified,
          calories: selected.calories,
          protein: selected.protein,
          carbs: selected.carbs,
          fat: selected.fat,
          servingSize: selected.servingSize,
          imageUrl: selected.imageUrl,
          savedAt: now,
          updatedAt: now
        });
      }
      await onLog({
        id: generateId('food'),
        type: 'food',
        date: defaultDate ?? todayKey(),
        title: selected.name,
        notes: selected.unverified ? 'Unverified food entry.' : '',
        createdAt: now,
        updatedAt: now,
        meal: selected.name,
        mealSlot,
        foodId: id,
        foodName: selected.name,
        brand: selected.brand,
        servingLabel: `${grams}g`,
        servingGrams: grams,
        servingUnit: 'g',
        servingAmount: grams,
        isQuickAdd: false,
        isRecipe: false,
        unverified: selected.unverified,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        waterMl: 0,
        barcode: selected.barcode || undefined,
        source: selected.barcode ? 'barcode' : 'search'
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="food-search-modal" role="dialog" aria-modal="true" aria-label="Search foods">
      {selected ? (
        <FoodReview
          product={selected}
          grams={grams}
          onGramsChange={setGrams}
          mealSlot={mealSlot}
          onMealSlotChange={setMealSlot}
          macros={macros}
          saving={saving}
          onBack={back}
          onClose={onClose}
          onLog={() => void log()}
        />
      ) : (
        <FoodSearchPanel
          query={query}
          onQueryChange={setQuery}
          searching={searching}
          message={searchMessage}
          results={results}
          onPick={pick}
          onClose={onClose}
        />
      )}
    </div>
  );
}

function FoodSearchPanel({
  query,
  onQueryChange,
  searching,
  message,
  results,
  onPick,
  onClose
}: {
  query: string;
  onQueryChange: (q: string) => void;
  searching: boolean;
  message: string;
  results: ProductLookupResult[];
  onPick: (product: ProductLookupResult) => void;
  onClose: () => void;
}) {
  const showExamples = !searching && !message && query.trim().length < 3 && results.length === 0;
  const showStatus = !!message && results.length === 0;

  return (
    <>
      <header className="food-search-head">
        <button type="button" className="scanner-close" onClick={onClose} aria-label="Close search">
          <X size={22} />
        </button>
        <h2>Find a food</h2>
        <span className="scanner-spacer" aria-hidden="true" />
      </header>

      <div className="food-search-input">
        <Search size={20} />
        <input
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          placeholder="e.g. aldi tuna, costco rotisserie chicken"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {query && (
          <button type="button" className="food-search-clear" aria-label="Clear search" onClick={() => onQueryChange('')}>
            <X size={16} />
          </button>
        )}
      </div>

      <div className="food-search-results">
        {searching && (
          <p className="food-search-status">
            <RefreshCw size={14} className="spin" /> Searching Open Food Facts…
          </p>
        )}

        {showStatus && <p className="food-search-status">{message}</p>}

        {showExamples && (
          <div className="food-search-suggest">
            <p>Try a brand and a product:</p>
            <ul>
              {PROMPT_EXAMPLES.map((example) => (
                <li key={example}>
                  <button type="button" onClick={() => onQueryChange(example)}>
                    <Search size={14} /> {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {results.map((product) => (
          <button
            key={productKey(product)}
            type="button"
            className="food-search-row"
            onClick={() => onPick(product)}
          >
            {product.imageUrl ? (
              <img
                className="food-search-thumb"
                src={product.imageUrl}
                alt=""
                referrerPolicy="no-referrer"
                onError={(event) => {
                  (event.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                }}
              />
            ) : (
              <span className="food-search-thumb food-search-thumb--fallback" aria-hidden="true">
                <Soup size={18} />
              </span>
            )}
            <span className="food-search-row-body">
              <strong>{product.name}</strong>
              {product.brand && <em>{product.brand}</em>}
              <small>
                {product.calories} kcal / 100g · P {product.protein}g · C {product.carbs}g · F {product.fat}g
              </small>
            </span>
            <ChevronRight size={18} />
          </button>
        ))}
      </div>
    </>
  );
}

function FoodReview({
  product,
  grams,
  onGramsChange,
  mealSlot,
  onMealSlotChange,
  macros,
  saving,
  onBack,
  onClose,
  onLog
}: {
  product: ProductLookupResult;
  grams: number;
  onGramsChange: (grams: number) => void;
  mealSlot: MealSlot;
  onMealSlotChange: (slot: MealSlot) => void;
  macros: { calories: number; protein: number; carbs: number; fat: number };
  saving: boolean;
  onBack: () => void;
  onClose: () => void;
  onLog: () => void;
}) {
  return (
    <div className="food-search-review">
      <header className="food-search-review-head">
        <button type="button" className="search-back" onClick={onBack} aria-label="Back to results">
          <ChevronLeft size={22} />
        </button>
        {product.imageUrl ? (
          <img
            className="food-search-thumb large"
            src={product.imageUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={(event) => {
              (event.currentTarget as HTMLImageElement).style.visibility = 'hidden';
            }}
          />
        ) : (
          <span className="food-search-thumb large food-search-thumb--fallback" aria-hidden="true">
            <Soup size={26} />
          </span>
        )}
        <div className="food-search-product-info">
          <h3>{product.name}</h3>
          {product.brand && <span>{product.brand}</span>}
        </div>
        <button type="button" className="scanner-close" onClick={onClose} aria-label="Close">
          <X size={22} />
        </button>
      </header>

      <div className="scanner-macro-grid">
        <MacroTile label="Calories" value={macros.calories} unit="kcal" />
        <MacroTile label="Protein" value={macros.protein} unit="g" />
        <MacroTile label="Carbs" value={macros.carbs} unit="g" />
        <MacroTile label="Fat" value={macros.fat} unit="g" />
      </div>

      <div className="scanner-serving">
        <label>
          <span>Serving</span>
          <div className="scanner-serving-input">
            <button type="button" onClick={() => onGramsChange(Math.max(1, grams - 10))} aria-label="Decrease grams">-</button>
            <input
              type="number"
              inputMode="numeric"
              value={grams}
              min={1}
              onChange={(event) => onGramsChange(Math.max(1, Number.parseFloat(event.target.value) || 0))}
            />
            <span className="scanner-unit">g</span>
            <button type="button" onClick={() => onGramsChange(grams + 10)} aria-label="Increase grams">+</button>
          </div>
        </label>
        <p className="scanner-per100">
          Per 100g: {round(product.calories)} kcal · P {round(product.protein)}g · C {round(product.carbs)}g · F {round(product.fat)}g
        </p>
      </div>

      <div className="scanner-mealslot" role="radiogroup" aria-label="Meal">
        {MEAL_SLOTS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={mealSlot === key}
            className={mealSlot === key ? 'active' : ''}
            onClick={() => onMealSlotChange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="scanner-actions">
        <button type="button" className="secondary-button" onClick={onBack}>
          <ChevronLeft size={16} /> Back
        </button>
        <button type="button" className="primary-button" onClick={onLog} disabled={saving}>
          {saving ? 'Adding…' : `Add to ${MEAL_SLOTS.find((m) => m.key === mealSlot)?.label}`}
        </button>
      </div>
    </div>
  );
}

function MacroTile({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="scanner-macro">
      <strong>{value}</strong>
      <em>{unit}</em>
      <span>{label}</span>
    </div>
  );
}
