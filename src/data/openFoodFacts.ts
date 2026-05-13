import type { ProductLookupResult } from '../types';

interface OpenFoodFactsResponse {
  status?: number;
  count?: number;
  products?: OpenFoodFactsResponse['product'][];
  product?: {
    code?: string;
    product_name?: string;
    brands?: string;
    serving_size?: string;
    image_front_small_url?: string;
    image_front_url?: string;
    image_small_url?: string;
    image_url?: string;
    nutriments?: Record<string, number | string | undefined>;
  };
}

const numberField = (nutriments: Record<string, number | string | undefined>, key: string) => {
  const value = nutriments[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const parseServingGrams = (servingSize?: string) => {
  if (!servingSize) return undefined;
  const grams = servingSize.match(/(\d+(?:[.,]\d+)?)\s*g\b/i);
  if (grams) return Number.parseFloat(grams[1].replace(',', '.'));
  const ounces = servingSize.match(/(\d+(?:[.,]\d+)?)\s*oz\b/i);
  if (ounces) return Number.parseFloat(ounces[1].replace(',', '.')) * 28.3495;
  return undefined;
};

const mapProduct = (barcode: string, product: NonNullable<OpenFoodFactsResponse['product']>): ProductLookupResult => {
  const nutriments = product.nutriments ?? {};
  const servingGrams = parseServingGrams(product.serving_size);
  const calories100g = numberField(nutriments, 'energy-kcal_100g') || numberField(nutriments, 'energy-kcal');
  const protein100g = numberField(nutriments, 'proteins_100g');
  const carbs100g = numberField(nutriments, 'carbohydrates_100g');
  const fat100g = numberField(nutriments, 'fat_100g');

  const caloriesServing = numberField(nutriments, 'energy-kcal_serving');
  const proteinServing = numberField(nutriments, 'proteins_serving');
  const carbsServing = numberField(nutriments, 'carbohydrates_serving');
  const fatServing = numberField(nutriments, 'fat_serving');
  const useServing = !calories100g && Boolean(servingGrams);
  const baseGrams = useServing ? servingGrams ?? 100 : 100;

  const imageUrl =
    product.image_front_small_url ||
    product.image_front_url ||
    product.image_small_url ||
    product.image_url ||
    undefined;

  return {
    barcode,
    name: product.product_name || `Barcode ${barcode}`,
    brand: product.brands,
    servingSize: product.serving_size,
    baseGrams,
    servingOptions: servingGrams && product.serving_size ? [{ label: product.serving_size, grams: Math.round(servingGrams) }] : undefined,
    calories: Math.round(useServing ? caloriesServing : calories100g || caloriesServing),
    protein: Math.round(useServing ? proteinServing : protein100g || proteinServing),
    carbs: Math.round(useServing ? carbsServing : carbs100g || carbsServing),
    fat: Math.round(useServing ? fatServing : fat100g || fatServing),
    imageUrl
  };
};

export async function lookupOpenFoodFactsProduct(barcode: string): Promise<ProductLookupResult> {
  const cleanBarcode = barcode.replace(/\D/g, '');
  if (!cleanBarcode) {
    throw new Error('Enter a valid barcode number.');
  }

  const fields = [
    'code',
    'product_name',
    'brands',
    'serving_size',
    'nutriments',
    'image_front_small_url',
    'image_front_url',
    'image_small_url',
    'image_url'
  ].join(',');

  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json?fields=${fields}`,
    { headers: { Accept: 'application/json' } }
  );

  if (!response.ok) {
    throw new Error('Product lookup failed. Try again or add the food manually.');
  }

  const data = (await response.json()) as OpenFoodFactsResponse;
  if (data.status !== 1 || !data.product) {
    throw new Error('No product found for this barcode.');
  }

  return mapProduct(cleanBarcode, data.product);
}

async function fetchProductImage(barcode: string): Promise<string | undefined> {
  const cleaned = barcode.replace(/\D/g, '');
  if (!cleaned) return undefined;
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleaned)}.json?fields=image_front_small_url,image_front_url,image_small_url,image_url`,
      { headers: { Accept: 'application/json' } }
    );
    if (!response.ok) return undefined;
    const data = (await response.json()) as OpenFoodFactsResponse;
    if (data.status !== 1 || !data.product) return undefined;
    return (
      data.product.image_front_small_url ||
      data.product.image_front_url ||
      data.product.image_small_url ||
      data.product.image_url ||
      undefined
    );
  } catch {
    return undefined;
  }
}

/**
 * Search results from the CGI endpoint often omit image_front_small_url
 * even when the product has a photo. This fills the gap in parallel by
 * hitting the v2 product API for each result that's missing an image.
 */
export async function enrichWithImages(products: ProductLookupResult[]): Promise<ProductLookupResult[]> {
  return Promise.all(
    products.map(async (product) => {
      if (product.imageUrl || !product.barcode) return product;
      const imageUrl = await fetchProductImage(product.barcode);
      return imageUrl ? { ...product, imageUrl } : product;
    })
  );
}

export async function searchOpenFoodFactsProducts(query: string): Promise<ProductLookupResult[]> {
  const term = query.trim();
  if (term.length < 3) return [];

  const fields = [
    'code',
    'product_name',
    'brands',
    'serving_size',
    'nutriments',
    'image_front_small_url',
    'image_front_url',
    'image_small_url',
    'image_url'
  ].join(',');
  const params = new URLSearchParams({
    search_terms: term,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '8',
    fields
  });
  const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) return [];
  const data = (await response.json()) as OpenFoodFactsResponse;
  return (data.products ?? [])
    .filter((product): product is NonNullable<OpenFoodFactsResponse['product']> => Boolean(product?.product_name))
    .map((product) => mapProduct(product.code ?? product.product_name ?? term, product))
    .filter((product) => product.calories > 0);
}
