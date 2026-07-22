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

export const products: Product[] = [
  { id: "thinai-laddu", slug: "thinai-laddu", name: "Thinai Laddu", category: "laddus", price: 180, offerPrice: 150, weight: "200 g", description: "A naturally sweet, nutty laddu made with wholesome foxtail millet.", ingredients: "Thinai, jaggery, ghee, cashews", badge: "Bestseller" },
  { id: "samai-laddu", slug: "samai-laddu", name: "Samai Laddu", category: "laddus", price: 180, offerPrice: 155, weight: "200 g", description: "Little millet and jaggery in a soft, traditional treat.", ingredients: "Samai, jaggery, ghee, cardamom" },
  { id: "pepper-kadalai", slug: "pepper-kadalai", name: "Pepper Kadalai", category: "kadalai", price: 195, offerPrice: 175, weight: "250 g", description: "Crunchy roasted peanuts with a warming pepper kick.", ingredients: "Peanuts, pepper, curry leaves, sea salt", badge: "Crowd favourite" },
  { id: "idly-podi", slug: "idly-podi", name: "Idly Podi", category: "podi", price: 140, offerPrice: 120, weight: "150 g", description: "A fragrant, stone-ground podi for idly, dosa and rice.", ingredients: "Lentils, sesame, red chilli, curry leaves" },
  { id: "varagu-laddu", slug: "varagu-laddu", name: "Varagu Laddu", category: "laddus", price: 180, offerPrice: 155, weight: "200 g", description: "Kodo millet laddus with the comfort of real jaggery.", ingredients: "Varagu, jaggery, ghee, cardamom" },
  { id: "festival-box", slug: "festival-box", name: "Festival Gift Box", category: "gift-boxes", price: 720, offerPrice: 599, weight: "800 g", description: "A ready-to-gift selection of our most-loved traditional snacks.", ingredients: "Assorted millet snacks", badge: "Gift-ready" },
];

export const categories = [
  { slug: "laddus", name: "Millet Laddus", detail: "Wholesome bites of tradition" },
  { slug: "kadalai", name: "Masala Kadalai", detail: "Bold, crunchy and roasted" },
  { slug: "podi", name: "Everyday Podi", detail: "Made for every meal" },
  { slug: "gift-boxes", name: "Gift Boxes", detail: "Thoughtful, delicious gifting" },
];

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
