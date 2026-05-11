import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  Copy,
  Heart,
  Plus,
  Save,
  ScanBarcode,
  Search,
  Soup,
  Star,
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { Card, EmptyState, Field } from '../components/Primitives';
import { generateId, todayKey } from '../data/defaults';
import {
  allFoods,
  applyServingToFood,
  calculateFoodTargets,
  groupFoodEntriesByMeal,
  mealSlots,
  searchFoods,
  sumFoodEntries
} from '../data/foodEngine';
import { searchOpenFoodFactsProducts } from '../data/openFoodFacts';
import type {
  AppSettings,
  DashboardEntry,
  FoodEntry,
  LocalFood,
  MealSlot,
  ProductLookupResult,
  ServingUnit,
  WeightLog
} from '../types';

const foodEntry = (entry: DashboardEntry): entry is FoodEntry => entry.type === 'food';

const productToLocalFood = (product: ProductLookupResult): LocalFood => ({
  id: product.barcode ? `barcode-${product.barcode}` : generateId('food'),
  barcode: product.barcode,
  name: product.name,
  brand: product.brand,
  source: 'barcode',
  baseGrams: product.baseGrams || 100,
  servingOptions: product.servingOptions,
  calories: product.calories,
  protein: product.protein,
  carbs: product.carbs,
  fat: product.fat,
  servingSize: product.servingSize,
  unverified: product.unverified,
  savedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

const round = (value: number) => Math.round(Number.isFinite(value) ? value : 0);

function dateOffset(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return todayKey(date);
}

export function FoodCalorieScreen({
  entries,
  settings,
  localFoods,
  weightLogs,
  onSaveEntry,
  onDeleteEntry,
  onSaveLocalFood,
  onSaveSettings,
  onSaveWeightLog
}: {
  entries: DashboardEntry[];
  settings: AppSettings;
  localFoods: LocalFood[];
  weightLogs: WeightLog[];
  onSaveEntry: (entry: DashboardEntry) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void> | void;
  onSaveLocalFood: (food: LocalFood) => Promise<void>;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onSaveWeightLog: (log: WeightLog) => Promise<void>;
}) {
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [openMeals, setOpenMeals] = useState<Record<MealSlot, boolean>>({
    breakfast: true,
    lunch: true,
    dinner: true,
    snacks: true
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addTab, setAddTab] = useState<'search' | 'barcode' | 'quick' | 'recipe'>('search');
  const [mealSlot, setMealSlot] = useState<MealSlot>('breakfast');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [message, setMessage] = useState('');
  const foodEntries = entries.filter(foodEntry);
  const dayEntries = foodEntries.filter((entry) => entry.date === selectedDate);
  const groupedMeals = groupFoodEntriesByMeal(dayEntries);
  const totals = sumFoodEntries(dayEntries);
  const targets = calculateFoodTargets(settings.profile);
  const foodDatabase = useMemo(() => allFoods(localFoods), [localFoods]);
  const previousDayWithFood = useMemo(() => {
    const priorDates = foodEntries
      .filter((entry) => entry.date < selectedDate)
      .map((entry) => entry.date)
      .sort();
    const prior = priorDates[priorDates.length - 1];
    return prior;
  }, [foodEntries, selectedDate]);

  const copyMeal = async (slot?: MealSlot) => {
    const sourceDate = previousDayWithFood ?? dateOffset(selectedDate, -1);
    const sourceEntries = foodEntries.filter((entry) => entry.date === sourceDate && (!slot || (entry.mealSlot ?? 'snacks') === slot));
    if (!sourceEntries.length) {
      setMessage('No previous meal found to copy.');
      return;
    }

    await Promise.all(
      sourceEntries.map((entry) =>
        onSaveEntry({
          ...entry,
          id: generateId('food'),
          date: selectedDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          title: entry.title
        })
      )
    );
    setMessage(`Copied ${sourceEntries.length} item${sourceEntries.length === 1 ? '' : 's'} from ${sourceDate}.`);
  };

  return (
    <div className="screen-stack food-screen">
      <section className="page-title">
        <h2>Food</h2>
        <p>Track calories, macros, meals, recipes, favourites, and weight trends.</p>
      </section>

      <div className="food-date-row">
        <button type="button" className="secondary-button" onClick={() => setSelectedDate(dateOffset(selectedDate, -1))}>Previous</button>
        <Field label="Day">
          <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </Field>
        <button type="button" className="secondary-button" onClick={() => setSelectedDate(dateOffset(selectedDate, 1))}>Next</button>
      </div>

      <DailyNutritionCard totals={totals} targets={targets} onAdd={() => setDrawerOpen(true)} onCopyDay={() => void copyMeal()} />

      {message && <p className="form-message">{message}</p>}

      <div className="meal-slot-list">
        {mealSlots.map(({ key, label }) => {
          const meal = groupedMeals[key];
          return (
            <section key={key} className="meal-slot-card">
              <button
                type="button"
                className="meal-slot-head"
                onClick={() => setOpenMeals((current) => ({ ...current, [key]: !current[key] }))}
              >
                <span>
                  <strong>{label}</strong>
                  <em>{meal.totals.calories} kcal - P {meal.totals.protein}g C {meal.totals.carbs}g F {meal.totals.fat}g</em>
                </span>
                <ChevronDown size={18} className={openMeals[key] ? 'open' : ''} />
              </button>

              {openMeals[key] && (
                <div className="meal-slot-body">
                  {meal.items.length === 0 ? (
                    <EmptyState title={`No ${label.toLowerCase()} yet`} body="Add food or copy a previous meal." />
                  ) : (
                    <div className="food-item-list">
                      {meal.items.map((entry) => (
                        <article key={entry.id} className="food-item-row">
                          <div>
                            <strong>{entry.foodName || entry.meal}</strong>
                            <span>{entry.servingLabel || entry.meal}{entry.brand ? ` - ${entry.brand}` : ''}</span>
                          </div>
                          <em>{entry.calories} kcal</em>
                          <button type="button" aria-label={`Delete ${entry.title}`} onClick={() => onDeleteEntry(entry.id)}>
                            <Trash2 size={16} />
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                  <div className="meal-slot-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setMealSlot(key);
                        setDrawerOpen(true);
                      }}
                    >
                      <Plus size={16} />
                      Add
                    </button>
                    <button type="button" className="secondary-button" onClick={() => void copyMeal(key)}>
                      <Copy size={16} />
                      Copy prev
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <ProfileTargetsPanel settings={settings} weightLogs={weightLogs} onSaveSettings={onSaveSettings} onSaveWeightLog={onSaveWeightLog} />

      <button type="button" className="food-fab" onClick={() => setDrawerOpen(true)} aria-label="Add food">
        <Plus size={28} />
      </button>

      {drawerOpen && (
        <FoodAddDrawer
          activeTab={addTab}
          onTabChange={setAddTab}
          mealSlot={mealSlot}
          onMealSlotChange={setMealSlot}
          selectedDate={selectedDate}
          foods={foodDatabase}
          onClose={() => setDrawerOpen(false)}
          onSaveEntry={onSaveEntry}
          onSaveLocalFood={onSaveLocalFood}
          onOpenScanner={() => {
            setDrawerOpen(false);
            setScannerOpen(true);
          }}
        />
      )}

      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onLog={onSaveEntry}
        onSaveLocalFood={onSaveLocalFood}
        defaultDate={selectedDate}
      />
    </div>
  );
}

function DailyNutritionCard({
  totals,
  targets,
  onAdd,
  onCopyDay
}: {
  totals: { calories: number; protein: number; carbs: number; fat: number };
  targets: { calories: number; protein: number; carbs: number; fat: number };
  onAdd: () => void;
  onCopyDay: () => void;
}) {
  const percent = Math.min(100, Math.round((totals.calories / targets.calories) * 100));
  return (
    <section className="food-daily-card">
      <div className="food-ring" style={{ '--food-progress': `${percent}%` } as React.CSSProperties}>
        <strong>{totals.calories}</strong>
        <span>{Math.max(0, targets.calories - totals.calories)} left</span>
      </div>
      <div className="food-daily-copy">
        <h3>Daily calories</h3>
        <p>{totals.calories} / {targets.calories} kcal</p>
        <MacroBar label="Protein" value={totals.protein} target={targets.protein} />
        <MacroBar label="Carbs" value={totals.carbs} target={targets.carbs} />
        <MacroBar label="Fat" value={totals.fat} target={targets.fat} />
        <div className="food-daily-actions">
          <button type="button" className="primary-button" onClick={onAdd}><Plus size={17} /> Add food</button>
          <button type="button" className="secondary-button" onClick={onCopyDay}><Copy size={17} /> Copy previous day</button>
        </div>
      </div>
    </section>
  );
}

function MacroBar({ label, value, target }: { label: string; value: number; target: number }) {
  const percent = Math.min(100, Math.round((value / Math.max(1, target)) * 100));
  return (
    <div className="macro-bar">
      <span>{label}</span>
      <strong>{value}g / {target}g</strong>
      <i><b style={{ width: `${percent}%` }} /></i>
    </div>
  );
}

function FoodAddDrawer({
  activeTab,
  onTabChange,
  mealSlot,
  onMealSlotChange,
  selectedDate,
  foods,
  onClose,
  onSaveEntry,
  onSaveLocalFood,
  onOpenScanner
}: {
  activeTab: 'search' | 'barcode' | 'quick' | 'recipe';
  onTabChange: (tab: 'search' | 'barcode' | 'quick' | 'recipe') => void;
  mealSlot: MealSlot;
  onMealSlotChange: (slot: MealSlot) => void;
  selectedDate: string;
  foods: LocalFood[];
  onClose: () => void;
  onSaveEntry: (entry: DashboardEntry) => Promise<void>;
  onSaveLocalFood: (food: LocalFood) => Promise<void>;
  onOpenScanner: () => void;
}) {
  const [query, setQuery] = useState('');
  const [onlineFoods, setOnlineFoods] = useState<LocalFood[]>([]);
  const [searchStatus, setSearchStatus] = useState('');
  const [selectedFood, setSelectedFood] = useState<LocalFood | null>(null);
  const [servingUnit, setServingUnit] = useState<ServingUnit>('g');
  const [servingAmount, setServingAmount] = useState(100);
  const [servingLabel, setServingLabel] = useState('');
  const [favourite, setFavourite] = useState(false);
  const [template, setTemplate] = useState(false);
  const [quick, setQuick] = useState({ name: 'Quick calories', calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [recipeName, setRecipeName] = useState('My recipe');
  const [recipeServings, setRecipeServings] = useState(4);
  const [ingredients, setIngredients] = useState([
    { id: generateId('ingredient'), name: 'Ingredient', grams: 100, calories: 0, protein: 0, carbs: 0, fat: 0 }
  ]);

  const localResults = searchFoods(query, foods);
  const combinedResults = useMemo(() => {
    const byId = new Map<string, LocalFood>();
    [...localResults, ...onlineFoods].forEach((food) => byId.set(food.id, food));
    return [...byId.values()].slice(0, 12);
  }, [localResults, onlineFoods]);

  useEffect(() => {
    if (query.trim().length < 3 || activeTab !== 'search') {
      setOnlineFoods([]);
      return;
    }

    const handle = window.setTimeout(() => {
      setSearchStatus('Searching food database...');
      searchOpenFoodFactsProducts(query)
        .then((results) => {
          setOnlineFoods(results.map(productToLocalFood));
          setSearchStatus(results.length ? 'Online foods added to suggestions.' : 'No online matches found yet.');
        })
        .catch(() => setSearchStatus('Online search unavailable. Local foods still work.'));
    }, 900);

    return () => window.clearTimeout(handle);
  }, [activeTab, query]);

  const calculated = selectedFood
    ? applyServingToFood(selectedFood, {
      unit: servingUnit,
      amount: servingAmount,
      servingLabel: servingUnit === 'serving' ? servingLabel : undefined
    })
    : null;

  const logSelectedFood = async () => {
    if (!selectedFood || !calculated) return;
    const now = new Date().toISOString();
    const foodToSave: LocalFood = {
      ...selectedFood,
      favourite: favourite || selectedFood.favourite,
      template: template || selectedFood.template,
      savedAt: selectedFood.savedAt || now,
      updatedAt: now
    };
    await onSaveLocalFood(foodToSave);
    await onSaveEntry({
      id: generateId('food'),
      type: 'food',
      date: selectedDate,
      title: selectedFood.name,
      notes: selectedFood.unverified ? 'Unverified local food.' : '',
      createdAt: now,
      updatedAt: now,
      meal: selectedFood.name,
      mealSlot,
      foodId: selectedFood.id,
      foodName: selectedFood.name,
      brand: selectedFood.brand,
      servingLabel: calculated.servingLabel,
      servingGrams: calculated.servingGrams,
      servingUnit,
      servingAmount,
      isQuickAdd: false,
      isRecipe: selectedFood.source === 'recipe',
      unverified: selectedFood.unverified,
      calories: calculated.calories,
      protein: calculated.protein,
      carbs: calculated.carbs,
      fat: calculated.fat,
      waterMl: 0,
      barcode: selectedFood.barcode,
      source: selectedFood.source === 'recipe' ? 'recipe' : selectedFood.barcode ? 'barcode' : 'search'
    });
    onClose();
  };

  const logQuick = async () => {
    const now = new Date().toISOString();
    await onSaveEntry({
      id: generateId('food'),
      type: 'food',
      date: selectedDate,
      title: quick.name || 'Quick add',
      notes: 'Quick calorie and macro entry.',
      createdAt: now,
      updatedAt: now,
      meal: quick.name || 'Quick add',
      mealSlot,
      foodName: quick.name || 'Quick add',
      servingLabel: 'Quick add',
      isQuickAdd: true,
      calories: round(quick.calories),
      protein: round(quick.protein),
      carbs: round(quick.carbs),
      fat: round(quick.fat),
      waterMl: 0,
      source: 'manual'
    });
    onClose();
  };

  const recipeTotals = ingredients.reduce(
    (totals, ingredient) => ({
      calories: totals.calories + round(ingredient.calories),
      protein: totals.protein + round(ingredient.protein),
      carbs: totals.carbs + round(ingredient.carbs),
      fat: totals.fat + round(ingredient.fat)
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const perServing = {
    calories: round(recipeTotals.calories / Math.max(1, recipeServings)),
    protein: round(recipeTotals.protein / Math.max(1, recipeServings)),
    carbs: round(recipeTotals.carbs / Math.max(1, recipeServings)),
    fat: round(recipeTotals.fat / Math.max(1, recipeServings))
  };

  const saveRecipe = async (logNow: boolean) => {
    const now = new Date().toISOString();
    const recipe: LocalFood = {
      id: generateId('recipe'),
      name: recipeName,
      source: 'recipe',
      baseGrams: 1,
      servingOptions: [{ label: '1 serving', grams: 1 }],
      calories: perServing.calories,
      protein: perServing.protein,
      carbs: perServing.carbs,
      fat: perServing.fat,
      servingSize: '1 serving',
      favourite: true,
      template: true,
      savedAt: now,
      updatedAt: now
    };
    await onSaveLocalFood(recipe);
    if (logNow) {
      setSelectedFood(recipe);
      await onSaveEntry({
        id: generateId('food'),
        type: 'food',
        date: selectedDate,
        title: recipe.name,
        notes: `${ingredients.length} ingredients, ${recipeServings} servings.`,
        createdAt: now,
        updatedAt: now,
        meal: recipe.name,
        mealSlot,
        foodId: recipe.id,
        foodName: recipe.name,
        servingLabel: '1 serving',
        servingGrams: 1,
        servingUnit: 'serving',
        servingAmount: 1,
        isRecipe: true,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        waterMl: 0,
        source: 'recipe'
      });
      onClose();
    }
  };

  return (
    <div className="food-drawer-backdrop">
      <section className="food-drawer" role="dialog" aria-modal="true" aria-label="Add food">
        <div className="food-drawer-head">
          <h3>Add food</h3>
          <button type="button" onClick={onClose} aria-label="Close add food"><X size={20} /></button>
        </div>

        <div className="food-drawer-tabs">
          {(['search', 'barcode', 'quick', 'recipe'] as const).map((tab) => (
            <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => onTabChange(tab)}>
              {tab}
            </button>
          ))}
        </div>

        <div className="form-grid two">
          <Field label="Meal">
            <select value={mealSlot} onChange={(event) => onMealSlotChange(event.target.value as MealSlot)}>
              {mealSlots.map((slot) => <option key={slot.key} value={slot.key}>{slot.label}</option>)}
            </select>
          </Field>
          <Field label="Date">
            <input value={selectedDate} disabled />
          </Field>
        </div>

        {activeTab === 'search' && (
          <div className="food-drawer-panel">
            <Field label="Food search" hint="Local foods show instantly. Online search starts after 3 characters.">
              <div className="food-search-input">
                <Search size={16} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Chicken breast, banana, yoghurt..." />
              </div>
            </Field>
            <FoodResultList foods={combinedResults} selectedFood={selectedFood} onSelect={setSelectedFood} />
            {searchStatus && <p className="form-message">{searchStatus}</p>}
            {selectedFood && (
              <SelectedServingPanel
                food={selectedFood}
                servingUnit={servingUnit}
                servingAmount={servingAmount}
                servingLabel={servingLabel}
                calculated={calculated}
                favourite={favourite}
                template={template}
                onServingUnit={setServingUnit}
                onServingAmount={setServingAmount}
                onServingLabel={setServingLabel}
                onFavourite={setFavourite}
                onTemplate={setTemplate}
                onLog={() => void logSelectedFood()}
              />
            )}
          </div>
        )}

        {activeTab === 'barcode' && (
          <div className="food-drawer-panel">
            <div className="scan-launch-card">
              <ScanBarcode size={42} />
              <h4>Open camera scanner</h4>
              <p>Full-screen view with a barcode viewfinder. Detects EAN-13 and UPC, fetches macros, and logs to your chosen meal slot.</p>
              <button type="button" className="primary-button" onClick={onOpenScanner}>
                <ScanBarcode size={18} /> Tap to scan
              </button>
            </div>
          </div>
        )}

        {activeTab === 'quick' && (
          <div className="food-drawer-panel">
            <div className="form-grid two">
              <Field label="Name">
                <input value={quick.name} onChange={(event) => setQuick((current) => ({ ...current, name: event.target.value }))} />
              </Field>
              <Field label="Calories">
                <input type="number" value={quick.calories} onChange={(event) => setQuick((current) => ({ ...current, calories: Number.parseFloat(event.target.value) || 0 }))} />
              </Field>
              <Field label="Protein g">
                <input type="number" value={quick.protein} onChange={(event) => setQuick((current) => ({ ...current, protein: Number.parseFloat(event.target.value) || 0 }))} />
              </Field>
              <Field label="Carbs g">
                <input type="number" value={quick.carbs} onChange={(event) => setQuick((current) => ({ ...current, carbs: Number.parseFloat(event.target.value) || 0 }))} />
              </Field>
              <Field label="Fat g">
                <input type="number" value={quick.fat} onChange={(event) => setQuick((current) => ({ ...current, fat: Number.parseFloat(event.target.value) || 0 }))} />
              </Field>
            </div>
            <button type="button" className="primary-button" onClick={() => void logQuick()}><Save size={17} /> Log quick add</button>
          </div>
        )}

        {activeTab === 'recipe' && (
          <div className="food-drawer-panel">
            <div className="form-grid two">
              <Field label="Recipe name">
                <input value={recipeName} onChange={(event) => setRecipeName(event.target.value)} />
              </Field>
              <Field label="Total servings">
                <input type="number" min="1" value={recipeServings} onChange={(event) => setRecipeServings(Number.parseInt(event.target.value, 10) || 1)} />
              </Field>
            </div>
            <div className="recipe-ingredient-list">
              {ingredients.map((ingredient) => (
                <div key={ingredient.id} className="recipe-ingredient-row">
                  <input value={ingredient.name} onChange={(event) => setIngredients((current) => current.map((item) => item.id === ingredient.id ? { ...item, name: event.target.value } : item))} />
                  <input type="number" aria-label="Ingredient calories" value={ingredient.calories} onChange={(event) => setIngredients((current) => current.map((item) => item.id === ingredient.id ? { ...item, calories: Number.parseFloat(event.target.value) || 0 } : item))} />
                  <input type="number" aria-label="Ingredient protein" value={ingredient.protein} onChange={(event) => setIngredients((current) => current.map((item) => item.id === ingredient.id ? { ...item, protein: Number.parseFloat(event.target.value) || 0 } : item))} />
                  <input type="number" aria-label="Ingredient carbs" value={ingredient.carbs} onChange={(event) => setIngredients((current) => current.map((item) => item.id === ingredient.id ? { ...item, carbs: Number.parseFloat(event.target.value) || 0 } : item))} />
                  <input type="number" aria-label="Ingredient fat" value={ingredient.fat} onChange={(event) => setIngredients((current) => current.map((item) => item.id === ingredient.id ? { ...item, fat: Number.parseFloat(event.target.value) || 0 } : item))} />
                </div>
              ))}
            </div>
            <div className="recipe-actions">
              <button type="button" className="secondary-button" onClick={() => setIngredients((current) => [...current, { id: generateId('ingredient'), name: 'Ingredient', grams: 100, calories: 0, protein: 0, carbs: 0, fat: 0 }])}>
                <Plus size={16} /> Add ingredient
              </button>
              <div className="recipe-total">
                <strong>{perServing.calories} kcal</strong>
                <span>P {perServing.protein}g C {perServing.carbs}g F {perServing.fat}g per serving</span>
              </div>
              <button type="button" className="secondary-button" onClick={() => void saveRecipe(false)}><Star size={16} /> Save recipe</button>
              <button type="button" className="primary-button" onClick={() => void saveRecipe(true)}><Save size={16} /> Save and log</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function setAddTabSafe(onTabChange: (tab: 'search' | 'barcode' | 'quick' | 'recipe') => void, tab: 'search' | 'barcode' | 'quick' | 'recipe') {
  window.setTimeout(() => onTabChange(tab), 300);
}

function FoodResultList({
  foods,
  selectedFood,
  onSelect
}: {
  foods: LocalFood[];
  selectedFood: LocalFood | null;
  onSelect: (food: LocalFood) => void;
}) {
  if (!foods.length) return <EmptyState title="No foods yet" body="Search online, scan a barcode, quick add, or build a recipe." />;
  return (
    <div className="food-result-list">
      {foods.map((food) => (
        <button key={food.id} type="button" className={selectedFood?.id === food.id ? 'active' : ''} onClick={() => onSelect(food)}>
          <span>
            <strong>{food.name}</strong>
            <em>{food.brand || food.source || 'generic'}{food.unverified ? ' - unverified' : ''}</em>
          </span>
          <b>{round(food.calories)} kcal</b>
        </button>
      ))}
    </div>
  );
}

function SelectedServingPanel({
  food,
  servingUnit,
  servingAmount,
  servingLabel,
  calculated,
  favourite,
  template,
  onServingUnit,
  onServingAmount,
  onServingLabel,
  onFavourite,
  onTemplate,
  onLog
}: {
  food: LocalFood;
  servingUnit: ServingUnit;
  servingAmount: number;
  servingLabel: string;
  calculated: ReturnType<typeof applyServingToFood> | null;
  favourite: boolean;
  template: boolean;
  onServingUnit: (unit: ServingUnit) => void;
  onServingAmount: (amount: number) => void;
  onServingLabel: (label: string) => void;
  onFavourite: (value: boolean) => void;
  onTemplate: (value: boolean) => void;
  onLog: () => void;
}) {
  useEffect(() => {
    if (servingUnit === 'serving' && !servingLabel && food.servingOptions?.[0]) {
      onServingLabel(food.servingOptions[0].label);
    }
  }, [food, onServingLabel, servingLabel, servingUnit]);

  return (
    <div className="selected-food-panel">
      <h4>{food.name}</h4>
      <div className="form-grid two">
        <Field label="Amount">
          <input type="number" min="0" value={servingAmount} onChange={(event) => onServingAmount(Number.parseFloat(event.target.value) || 0)} />
        </Field>
        <Field label="Serving">
          <select value={servingUnit} onChange={(event) => onServingUnit(event.target.value as ServingUnit)}>
            <option value="g">grams</option>
            <option value="oz">oz</option>
            <option value="serving">saved serving</option>
          </select>
        </Field>
      </div>
      {servingUnit === 'serving' && (
        <Field label="Saved serving size">
          <select value={servingLabel} onChange={(event) => onServingLabel(event.target.value)}>
            {(food.servingOptions?.length ? food.servingOptions : [{ label: food.servingSize || '1 serving', grams: food.baseGrams || 100 }]).map((option) => (
              <option key={option.label} value={option.label}>{option.label}</option>
            ))}
          </select>
        </Field>
      )}
      {calculated && (
        <div className="selected-food-macros">
          <span>{calculated.calories} kcal</span>
          <span>P {calculated.protein}g</span>
          <span>C {calculated.carbs}g</span>
          <span>F {calculated.fat}g</span>
        </div>
      )}
      <label className="food-check">
        <input type="checkbox" checked={favourite} onChange={(event) => onFavourite(event.target.checked)} />
        <Heart size={15} /> Save as favourite
      </label>
      <label className="food-check">
        <input type="checkbox" checked={template} onChange={(event) => onTemplate(event.target.checked)} />
        <CalendarDays size={15} /> Save as meal template
      </label>
      <button type="button" className="primary-button" onClick={onLog}><Save size={17} /> Log food</button>
    </div>
  );
}

function ProfileTargetsPanel({
  settings,
  weightLogs,
  onSaveSettings,
  onSaveWeightLog
}: {
  settings: AppSettings;
  weightLogs: WeightLog[];
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onSaveWeightLog: (log: WeightLog) => Promise<void>;
}) {
  const [profile, setProfile] = useState(settings.profile);
  const [weight, setWeight] = useState(settings.profile.weightKg);
  const targets = calculateFoodTargets(profile);
  const chartLogs = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date)).slice(-12);

  useEffect(() => setProfile(settings.profile), [settings.profile]);

  const saveProfile = async () => {
    await onSaveSettings({ ...settings, profile });
  };

  const saveWeight = async () => {
    const now = new Date().toISOString();
    await onSaveWeightLog({ id: generateId('weight'), date: todayKey(), weightKg: weight, createdAt: now });
    await onSaveSettings({ ...settings, profile: { ...profile, weightKg: weight } });
  };

  return (
    <Card title="Profile, targets, and weight">
      <div className="form-grid">
        <Field label="Height cm"><input type="number" value={profile.heightCm} onChange={(event) => setProfile((current) => ({ ...current, heightCm: Number.parseFloat(event.target.value) || 0 }))} /></Field>
        <Field label="Weight kg"><input type="number" value={profile.weightKg} onChange={(event) => setProfile((current) => ({ ...current, weightKg: Number.parseFloat(event.target.value) || 0 }))} /></Field>
        <Field label="Age"><input type="number" value={profile.age} onChange={(event) => setProfile((current) => ({ ...current, age: Number.parseInt(event.target.value, 10) || 18 }))} /></Field>
        <Field label="Activity">
          <select value={profile.activityLevel} onChange={(event) => setProfile((current) => ({ ...current, activityLevel: event.target.value as AppSettings['profile']['activityLevel'] }))}>
            <option value="sedentary">Sedentary</option>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="active">Active</option>
          </select>
        </Field>
        <Field label="Goal weight kg"><input type="number" value={profile.goalWeightKg} onChange={(event) => setProfile((current) => ({ ...current, goalWeightKg: Number.parseFloat(event.target.value) || 0 }))} /></Field>
        <Field label="Goal">
          <select value={profile.bodyGoal} onChange={(event) => setProfile((current) => ({ ...current, bodyGoal: event.target.value as AppSettings['profile']['bodyGoal'] }))}>
            <option value="lose">Lose weight</option>
            <option value="maintain">Maintain</option>
            <option value="gain">Gain weight</option>
          </select>
        </Field>
        <Field label="Protein %"><input type="number" value={profile.macroProteinPercent} onChange={(event) => setProfile((current) => ({ ...current, macroProteinPercent: Number.parseFloat(event.target.value) || 0 }))} /></Field>
        <Field label="Carbs %"><input type="number" value={profile.macroCarbsPercent} onChange={(event) => setProfile((current) => ({ ...current, macroCarbsPercent: Number.parseFloat(event.target.value) || 0 }))} /></Field>
        <Field label="Fat %"><input type="number" value={profile.macroFatPercent} onChange={(event) => setProfile((current) => ({ ...current, macroFatPercent: Number.parseFloat(event.target.value) || 0 }))} /></Field>
      </div>
      <div className="target-strip">
        <span>{targets.calories} kcal</span>
        <span>{targets.protein}g protein</span>
        <span>{targets.carbs}g carbs</span>
        <span>{targets.fat}g fat</span>
      </div>
      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={() => void saveProfile()}><Save size={16} /> Save targets</button>
      </div>

      <div className="weight-panel">
        <div className="form-grid two">
          <Field label="Today's weight kg">
            <input type="number" value={weight} onChange={(event) => setWeight(Number.parseFloat(event.target.value) || 0)} />
          </Field>
          <button type="button" className="primary-button weight-save" onClick={() => void saveWeight()}><BarChart3 size={16} /> Log weight</button>
        </div>
        <WeightChart logs={chartLogs} goalWeight={profile.goalWeightKg} />
      </div>
    </Card>
  );
}

function WeightChart({ logs, goalWeight }: { logs: WeightLog[]; goalWeight: number }) {
  if (!logs.length) {
    return <EmptyState title="No weight trend yet" body="Log weight to build your chart." />;
  }

  const values = logs.map((log) => log.weightKg);
  const min = Math.min(...values, goalWeight) - 1;
  const max = Math.max(...values, goalWeight) + 1;
  const range = Math.max(1, max - min);
  const points = logs.map((log, index) => {
    const x = logs.length === 1 ? 10 : 10 + (index / (logs.length - 1)) * 80;
    const y = 88 - ((log.weightKg - min) / range) * 74;
    return `${x},${y}`;
  }).join(' ');
  const goalY = 88 - ((goalWeight - min) / range) * 74;

  return (
    <div className="weight-chart">
      <svg viewBox="0 0 100 100" role="img" aria-label="Weight trend chart">
        <line x1="8" x2="92" y1={goalY} y2={goalY} />
        <polyline points={points} />
        {logs.map((log, index) => {
          const [x, y] = points.split(' ')[index].split(',').map(Number);
          return <circle key={log.id} cx={x} cy={y} r="2.5" />;
        })}
      </svg>
      <span>{logs[logs.length - 1]?.weightKg}kg latest - {goalWeight}kg goal</span>
    </div>
  );
}
