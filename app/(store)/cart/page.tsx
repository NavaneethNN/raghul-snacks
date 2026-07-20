"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatPrice } from "@/lib/catalog";
import { AddToCart } from "@/components/product/add-to-cart";
import { CartShippingEstimate } from "@/components/cart-shipping-estimate";

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const [upsellProduct, setUpsellProduct] = useState<any>(null);
  const remaining = Math.max(0, 499 - subtotal);

  useEffect(() => {
    // Fetch a random product not in cart for upsell
    async function fetchUpsellProduct() {
      try {
        const response = await fetch("/api/products");
        if (!response.ok) return;
        const products = await response.json();

        // Filter out products already in cart
        const cartIds = items.map(item => String(item.id));
        const availableProducts = products.filter((p: any) => !cartIds.includes(String(p.id)));

        if (availableProducts.length > 0) {
          // Pick a random product
          const randomProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)];
          setUpsellProduct({
            ...randomProduct,
            id: String(randomProduct.id),
            price: parseFloat(randomProduct.price),
            offerPrice: randomProduct.offerPrice ? parseFloat(randomProduct.offerPrice) : parseFloat(randomProduct.price),
          });
        }
      } catch (error) {
        console.error("Error fetching upsell product:", error);
      }
    }

    if (items.length > 0) {
      fetchUpsellProduct();
    }
  }, [items]);

  if (!items.length) {
    return (
      <section className="empty-state">
        <p className="eyebrow">Your bag is waiting</p>
        <h1>Nothing here yet.</h1>
        <p>Explore our pantry and find a new favourite.</p>
        <Link className="button button-dark" href="/shop">Shop snacks</Link>
      </section>
    );
  }

  return (
    <section className="cart-page">
      <div>
        <p className="eyebrow">Your selection</p>
        <h1>Your bag ({items.length})</h1>
        <div className="shipping-progress">
          <p>{remaining ? `Add ${formatPrice(remaining)} for free shipping` : "You unlocked free shipping!"}</p>
          <div>
            <i style={{ width: `${Math.min(100, subtotal / 499 * 100)}%` }} />
          </div>
        </div>
        <div className="cart-items">
          {items.map((item) => (
            <article className="cart-item" key={item.id}>
              <div className="cart-thumb">
                {item.image ? (
                  <img src={item.image} alt={item.name} />
                ) : (
                  <span className="cart-placeholder">✦</span>
                )}
              </div>
              <div>
                <h3>{item.name}</h3>
                <p>{item.weight}</p>
                <strong>{formatPrice(item.offerPrice)}</strong>
              </div>
              <div className="quantity">
                <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
              </div>
              <button className="remove" onClick={() => removeItem(item.id)}>Remove</button>
            </article>
          ))}
        </div>
      </div>

      <aside className="order-summary">
        <h2>Order summary</h2>
        <p>
          <span>Subtotal</span>
          <strong>{formatPrice(subtotal)}</strong>
        </p>
        <CartShippingEstimate items={items} subtotal={subtotal} />
        <Link href="/checkout" className="button button-dark wide-button">
          Secure checkout →
        </Link>
        <small>Safe payments powered by Cashfree</small>

        {upsellProduct && (
          <div className="cart-upsell">
            <p className="eyebrow">A perfect add-on</p>
            <h3>{upsellProduct.name}</h3>
            <p>{upsellProduct.description}</p>
            <AddToCart product={upsellProduct} />
          </div>
        )}
      </aside>
    </section>
  );
}
