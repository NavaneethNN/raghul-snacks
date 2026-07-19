"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-provider";

export function StoreHeader() {
  const { count } = useCart();
  return <header className="site-header"><Link className="brand" href="/"><span>Raghul</span> Snacks</Link><nav><Link href="/shop">Shop</Link><Link href="/about">Our story</Link><Link href="/track">Track order</Link></nav><Link className="cart-link" href="/cart">Bag <span>{count}</span></Link></header>;
}
