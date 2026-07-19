"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-provider";
import { formatPrice, products } from "@/lib/catalog";
import { AddToCart } from "@/components/product/add-to-cart";

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const remaining = Math.max(0, 499 - subtotal);
  if (!items.length) return <section className="empty-state"><p className="eyebrow">Your bag is waiting</p><h1>Nothing here yet.</h1><p>Explore our pantry and find a new favourite.</p><Link className="button button-dark" href="/shop">Shop snacks</Link></section>;
  return <section className="cart-page"><div><p className="eyebrow">Your selection</p><h1>Your bag ({items.length})</h1><div className="shipping-progress"><p>{remaining ? `Add ${formatPrice(remaining)} for free shipping` : "You unlocked free shipping!"}</p><div><i style={{ width: `${Math.min(100, subtotal / 499 * 100)}%` }} /></div></div><div className="cart-items">{items.map((item) => <article className="cart-item" key={item.id}><div className="cart-thumb">{item.category}</div><div><h3>{item.name}</h3><p>{item.weight}</p><strong>{formatPrice(item.offerPrice)}</strong></div><div className="quantity"><button onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button></div><button className="remove" onClick={() => removeItem(item.id)}>Remove</button></article>)}</div></div><aside className="order-summary"><h2>Order summary</h2><p><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></p><p><span>Shipping</span><strong>{subtotal >= 499 ? "Free" : "Calculated at checkout"}</strong></p><div className="total"><span>Total</span><strong>{formatPrice(subtotal)}</strong></div><Link href="/checkout" className="button button-dark wide-button">Secure checkout →</Link><small>Safe payments powered by Razorpay</small><div className="cart-upsell"><p className="eyebrow">A perfect add-on</p><h3>Pepper Kadalai</h3><p>Crunchy, peppery and made for tea time.</p><AddToCart product={products[2]} /></div></aside></section>;
}
