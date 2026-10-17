import Link from "next/link";
import { notFound } from "next/navigation";
import { ComboActions } from "@/components/combo-actions";
import { getDb } from "@/lib/db";
import { combos, comboItems, products } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

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
      <div className="product-large-visual">
        <img src={combo.image || "/hero.png"} alt={combo.title} />
        <span className="category-badge">Combo</span>
      </div>

      <div className="product-detail">
        <p className="eyebrow">Special Combo Deal</p>
        <h1>{combo.title}</h1>

        <div className="price-section">
          <div className="price">
            <strong>₹{displayPrice}</strong>
            {hasDiscount && <s>₹{originalPrice}</s>}
          </div>
          {hasDiscount && <span className="savings">You save ₹{savings.toFixed(0)}</span>}
        </div>

        <p className="description">
          {combo.description || 'A carefully curated combo, perfect for gifting or enjoying with family.'}
        </p>

        {combo.items && combo.items.length > 0 && (
          <div style={{ marginTop: '8px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '12px', fontFamily: 'Playfair Display, serif' }}>
              What&apos;s in this combo
            </h3>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {combo.items.map((item: any, index: number) => (
                <li key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  background: 'var(--cream)',
                  borderRadius: '8px',
                  border: '1px solid var(--line)'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--terracotta)" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span style={{ flex: 1, fontWeight: 500, fontSize: '15px' }}>{item.name || 'Product'}</span>
                  <span style={{ fontSize: '13px', color: '#6b7280', fontFamily: "'DM Mono', monospace" }}>
                    {item.quantity}g
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
