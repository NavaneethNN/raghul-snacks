import Link from "next/link";
import { notFound } from "next/navigation";
import { ComboActions } from "@/components/combo-actions";
import { getDb } from "@/lib/db";
import { combos, comboItems, products } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { formatPrice, formatWeight } from "@/lib/catalog";

export const revalidate = 120;

async function getCombo(slug: string) {
  try {
    const db = getDb();
    const result = await db.select().from(combos).where(eq(combos.slug, slug)).limit(1);
    if (!result || result.length === 0) return null;

    const combo = result[0];
    const items = await db
      .select({
        id: comboItems.id,
        productId: comboItems.productId,
        quantity: comboItems.quantity,
        name: products.name,
        slug: products.slug,
        image: products.image,
        weight: products.weight,
        price: products.price,
      })
      .from(comboItems)
      .leftJoin(products, eq(comboItems.productId, products.id))
      .where(eq(comboItems.comboId, combo.id));

    return { ...combo, items };
  } catch (error) {
    console.error('Error fetching combo:', error);
    return null;
  }
}

export default async function ComboDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const combo = await getCombo(slug);

  if (!combo) {
    notFound();
  }

  // If all items were deleted, treat the combo as unavailable
  if (!combo.items || combo.items.length === 0) {
    return (
      <section className="empty-state">
        <p className="eyebrow">Combo unavailable</p>
        <h1>This combo is no longer available.</h1>
        <p>The products in this combo have been removed. Check out our shop for other options.</p>
        <Link href="/shop" className="button button-dark">Browse products</Link>
      </section>
    );
  }

  const displayPrice = combo.discount && parseFloat(combo.discount) > 0
    ? parseFloat(combo.discount)
    : parseFloat(combo.price);
  const originalPrice = parseFloat(combo.price);
  const hasDiscount = combo.discount && parseFloat(combo.discount) > 0 && displayPrice < originalPrice;
  const savings = hasDiscount ? originalPrice - displayPrice : 0;

  return (
    <section className="product-page">
      <div className="product-breadcrumbs-row">
        <nav className="breadcrumbs" aria-label="Breadcrumbs">
          <Link href="/">Home</Link>
          <span className="crumb-sep">/</span>
          <Link href="/shop">Shop</Link>
          <span className="crumb-sep">/</span>
          <span className="crumb-current" aria-current="page">{combo.title}</span>
        </nav>
        <Link
          href="/shop"
          className="product-back-btn"
          aria-label="Back to shop"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 5l-7 7 7 7" />
          </svg>
          Back to Shop
        </Link>
      </div>

      <div className="product-large-visual">
        <img src={combo.image || "/hero.png"} alt={combo.title} />
        <span className="category-badge">Combo Pack</span>
      </div>

      <div className="product-detail">
        <p className="eyebrow">Value Combo Pack</p>
        <h1>{combo.title}</h1>

        <div className="price-section">
          <div className="price">
            <strong>{formatPrice(displayPrice)}</strong>
            {hasDiscount && <s>{formatPrice(originalPrice)}</s>}
          </div>
          {hasDiscount && <span className="savings">Save {formatPrice(savings)}</span>}
        </div>

        <p className="description">
          {combo.description || 'A carefully curated South Indian combo, crafted fresh in small batches and packed with care.'}
        </p>

        {combo.items && combo.items.length > 0 && (
          <div className="combo-items-wrapper">
            <div className="combo-items-header">
              <h2 className="combo-items-title">What&apos;s in this combo</h2>
              <span className="combo-items-count">{combo.items.length} Items</span>
            </div>
            <ul className="combo-items-list">
              {combo.items.map((item: any, idx: number) => (
                <li key={item.id || idx} className="combo-item-row">
                  <img
                    src={item.image || "/hero.png"}
                    alt={item.name || "Product"}
                    className="combo-item-img"
                  />
                  <div className="combo-item-info">
                    {item.slug ? (
                      <Link href={`/product/${item.slug}`} className="combo-item-name">
                        {item.name || "Product"}
                      </Link>
                    ) : (
                      <span className="combo-item-name">{item.name || "Product"}</span>
                    )}
                  </div>
                  <span className="combo-item-badge">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Qty: {item.quantity}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ComboActions combo={combo} />
      </div>
    </section>
  );
}
