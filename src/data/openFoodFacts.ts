import type { ProductLookupResult } from '../types';

interface OpenFoodFactsResponse {
  status?: number;
  product?: {
    product_name?: string;
    brands?: string;
    serving_size?: string;
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
    'nutriments'
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

  const nutriments = data.product.nutriments ?? {};
  const calories =
    numberField(nutriments, 'energy-kcal_serving') ||
    numberField(nutriments, 'energy-kcal_100g') ||
    numberField(nutriments, 'energy-kcal');

  return {
    barcode: cleanBarcode,
    name: data.product.product_name || `Barcode ${cleanBarcode}`,
    brand: data.product.brands,
    servingSize: data.product.serving_size,
    calories: Math.round(calories),
    protein: Math.round(numberField(nutriments, 'proteins_serving') || numberField(nutriments, 'proteins_100g')),
    carbs: Math.round(numberField(nutriments, 'carbohydrates_serving') || numberField(nutriments, 'carbohydrates_100g')),
    fat: Math.round(numberField(nutriments, 'fat_serving') || numberField(nutriments, 'fat_100g'))
  };
}

