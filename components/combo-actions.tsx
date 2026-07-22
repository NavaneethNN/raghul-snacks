"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";

export function ComboActions({ combo }: { combo: any }) {
  const router = useRouter();
  const { addItem, getItemQuantity } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Convert combo to cart-compatible format
  const cartCombo = {
    id: String(combo.id),
    slug: combo.slug,
    name: combo.title,
    price: parseFloat(combo.price),
    offerPrice: combo.discount && parseFloat(combo.discount) > 0
      ? parseFloat(combo.discount)
      : parseFloat(combo.price),
    weight: `${combo.items?.length || 0} items`,
    description: `Combo with ${combo.items?.length || 0} products`,
    ingredients: combo.items?.map((item: any) => item.name).join(', ') || '',
    category: 'combo',
    image: combo.image || '',
  };

  const cartQuantity = getItemQuantity(combo.id);
  const inCart = cartQuantity > 0;

  function handleAddToCart() {
    if (inCart || added) return;
    addItem(cartCombo, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div style={{
      marginTop: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        border: '1.5px solid var(--line)',
        borderRadius: '8px',
        padding: '4px'
      }}>
        <button
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          style={{
            width: '36px',
            height: '36px',
            border: 'none',
            background: 'var(--cream)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'var(--ink)'
          }}
        >
          −
        </button>
        <span style={{
          minWidth: '40px',
          textAlign: 'center',
          fontWeight: '600',
          fontSize: '16px'
        }}>
          {quantity}
        </span>
        <button
          onClick={() => setQuantity(quantity + 1)}
          style={{
            width: '36px',
            height: '36px',
            border: 'none',
            background: 'var(--cream)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'var(--ink)'
          }}
        >
          +
        </button>
      </div>

      <button
        onClick={handleAddToCart}
        className="button"
        disabled={inCart || added}
        style={{
          flex: '1',
          minWidth: '200px',
          background: inCart || added ? '#16a34a' : 'var(--ink)',
          color: 'white',
          border: inCart || added ? '2px solid #16a34a' : '2px solid var(--ink)'
        }}
      >
        {inCart || added ? "✓ Added to Cart" : "Add to Cart"}
      </button>

      {inCart && (
        <button
          onClick={() => router.push('/cart')}
          className="button"
          style={{
            flex: '1',
            minWidth: '200px',
            background: 'transparent',
            color: 'var(--ink)',
            border: '2px solid var(--ink)'
          }}
        >
          Go to Cart →
        </button>
      )}
    </div>
  );
}
