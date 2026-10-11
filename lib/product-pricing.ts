import { formatPrice, formatWeight } from "@/lib/catalog";

/** A variant as it arrives from the API (numeric columns come back as strings). */
export type VariantLike = {
  id: number;
  weight?: string | null;
  price?: string | number | null;
  offerPrice?: string | number | null;
  sortOrder?: number;
};

export type CardPricing = {
  /** Price to display prominently (variant offer price when present). */
  displayPrice: number;
  /** Original price, only meaningful when `hasDiscount` is true. */
  originalPrice: number;
  hasDiscount: boolean;
  hasPrice: boolean;
  /** Weight of the variant in use, already formatted for display ("" when unknown). */
  displayWeight: string;
  /** True when the product has more than one purchasable variant. */
  hasVariants: boolean;
  /** Weight label of the variant in use, raw value ("" when unknown). */
  variantWeight: string;
};

/** Parses a numeric column, treating blanks, "-", NaN and non-positive values as unknown. */
export function toAmount(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const raw = typeof value === "string" ? value.trim() : value;
  if (raw === "" || raw === "-") return 0;
  const amount = typeof raw === "number" ? raw : parseFloat(String(raw));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

/** Returns a copy of the variants sorted so the first entry is the card default. */
export function sortVariants(variants: VariantLike[] | null | undefined): VariantLike[] {
  if (!Array.isArray(variants)) return [];
  return [...variants]
    .filter((variant): variant is VariantLike => Boolean(variant))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id);
}

/** The default variant shown on a product card: the first (lowest sort order) one. */
export function getDefaultVariant(variants: VariantLike[] | null | undefined): VariantLike | null {
  const sorted = sortVariants(variants);
  return sorted.length > 0 ? sorted[0] : null;
}

/**
 * Formats a weight for display, returning "" when there is nothing meaningful to show
 * so the UI never renders a bare "0" or "-".
 */
export function formatDisplayWeight(weight: string | number | null | undefined): string {
  const raw = weight === null || weight === undefined ? "" : String(weight).trim();
  if (!raw || raw === "-" || raw === "0") return "";
  // Placeholder text such as an em dash or "N/A" carries no digits — nothing to show.
  if (!/\d/.test(raw)) return "";

  const formatted = formatWeight(raw).trim();
  if (!formatted || formatted === "-") return "";
  // Reject values that collapse to a meaningless zero (e.g. "0 g", "0.0g").
  if (/^0+(\.0+)?\s*(g|gm|gms|kg)?$/i.test(formatted)) return "";
  return formatted;
}

/** Formatting helper that never produces a currency string for an unknown price. */
export function formatDisplayPrice(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return "";
  return formatPrice(price);
}

/**
 * Resolves what a product card should show. When the product has variants, the
 * first variant's price and weight win; otherwise the product's own values are used.
 */
export function resolveCardPricing(product: {
  price?: string | number | null;
  offerPrice?: string | number | null;
  weight?: string | null;
  variants?: VariantLike[] | null;
}): CardPricing {
  const defaultVariant = getDefaultVariant(product.variants);
  const hasVariants = sortVariants(product.variants).length > 0;

  const variantPrice = defaultVariant ? toAmount(defaultVariant.price) : 0;
  const variantOffer = defaultVariant ? toAmount(defaultVariant.offerPrice) : 0;
  const productPrice = toAmount(product.price);
  const productOffer = toAmount(product.offerPrice);

  const originalPrice = defaultVariant ? variantPrice || productPrice : productPrice;
  const offerCandidate = defaultVariant ? variantOffer || productOffer : productOffer;
  const displayPrice = offerCandidate > 0 && offerCandidate < originalPrice ? offerCandidate : originalPrice;

  const variantWeight = defaultVariant ? (defaultVariant.weight ?? "") : "";
  const rawWeight = defaultVariant ? variantWeight : (product.weight ?? "");

  return {
    displayPrice,
    originalPrice,
    hasDiscount: originalPrice > 0 && displayPrice > 0 && displayPrice < originalPrice,
    hasPrice: displayPrice > 0,
    displayWeight: formatDisplayWeight(rawWeight),
    hasVariants,
    variantWeight,
  };
}
