export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  offerPrice: number;
  weight: string;
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
