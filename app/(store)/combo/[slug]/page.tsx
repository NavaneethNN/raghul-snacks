import { notFound } from "next/navigation";
import Link from "next/link";
import { formatWeight } from "@/lib/catalog";

async function getCombo(slug: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/combos`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const combos = await res.json();
    return combos.find((c: any) => c.slug === slug) || null;
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
          {hasDiscount && <span className="savings">Save ₹{savings}</span>}
        </div>

        <p className="description">
          A carefully curated combo of {combo.items?.length || 0} delicious items,
          perfect for gifting or enjoying with family.
        </p>

        <div className="detail-list">
          <div className="detail-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            </svg>
            <div>
              <span>Items Included</span>
              <strong>{combo.items?.length || 0} products</strong>
            </div>
          </div>
          <div className="detail-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 6v6l4 2"></path>
            </svg>
            <div>
              <span>Freshness</span>
              <strong>Made to order</strong>
            </div>
          </div>
        </div>

        {combo.items && combo.items.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '16px', fontFamily: 'Playfair Display, serif' }}>
              What's in this combo
            </h3>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {combo.items.map((item: any, index: number) => (
                <li key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: 'var(--cream)',
                  borderRadius: '8px',
                  border: '1px solid var(--line)'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span style={{ flex: 1, fontWeight: 500 }}>{item.name || 'Product'}</span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    {formatWeight(item.quantity.toString())}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ marginTop: '32px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/shop?tab=combos" className="button" style={{
            background: 'var(--ink)',
            color: 'white',
            flex: '1',
            minWidth: '200px'
          }}>
            View All Combos
          </Link>
          <Link href="/shop" className="button" style={{
            background: 'transparent',
            color: 'var(--ink)',
            border: '2px solid var(--ink)',
            flex: '1',
            minWidth: '200px'
          }}>
            Continue Shopping
          </Link>
        </div>
      </div>
    </section>
  );
}
