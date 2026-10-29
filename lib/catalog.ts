export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  offerPrice: number;
  weight: string;
  approxWeight?: string | null;
  variantType?: string | null;
  description: string;
  ingredients: string;
  badge?: string;
  image?: string | null;
};

export const formatPrice = (price: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(price);

export const formatWeight = (weight: string) => {
  // If weight already has unit (g, kg, gm, etc), return as is
  if (/\d+\s*(g|kg|gm|gms|gram|grams|kilogram|kilograms)$/i.test(weight.trim())) {
    return weight;
  }

  // If weight is just a number, add 'g' unit
  const numericWeight = parseFloat(weight);
  if (!isNaN(numericWeight)) {
    // Convert to kg if >= 1000g
    if (numericWeight >= 1000) {
      return `${(numericWeight / 1000).toFixed(numericWeight % 1000 === 0 ? 0 : 1)}kg`;
    }
    return `${numericWeight}g`;
  }

  // Return as is if we can't parse it
  return weight;
};

/**
 * Parses any weight string (e.g. "250g", "500 g", "1kg", "1.5 kg", "100", "Pack of 3 (~150g)")
 * into a numeric weight in kilograms.
 * Defaults to 0.25 kg if unparseable or <= 0.
 */
export function parseWeightToKg(weight: string | number | null | undefined): number {
  if (weight === null || weight === undefined) return 0.25;
  if (typeof weight === "number") {
    if (weight <= 0) return 0.25;
    return weight >= 10 ? weight / 1000 : weight;
  }
  const str = String(weight).trim();
  if (!str) return 0.25;

  // Check for kilogram match: e.g. "1.5 kg", "1kg"
  const kgMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilogram|kilograms)\b/i);
  if (kgMatch) {
    const val = parseFloat(kgMatch[1]);
    return Number.isFinite(val) && val > 0 ? val : 0.25;
  }

  // Check for grams match: e.g. "250g", "150 gm", "750 grams", "(approx 150g)"
  const gMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|gms|gram|grams)\b/i);
  if (gMatch) {
    const val = parseFloat(gMatch[1]);
    return Number.isFinite(val) && val > 0 ? val / 1000 : 0.25;
  }

  // Pure numeric string: e.g. "500" -> assume grams if >= 10, else kg
  const num = parseFloat(str);
  if (Number.isFinite(num) && num > 0) {
    return num >= 10 ? num / 1000 : num;
  }

  return 0.25;
}
