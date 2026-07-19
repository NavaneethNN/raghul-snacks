"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";

export function StoreHeader() {
  const { count } = useCart();
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  useEffect(() => {
    fetch("/api/auth/session").then(async (response) => {
      const data = await response.json() as { account?: { name: string; email: string } | null };
      setAccount(data.account || null);
    }).catch(() => setAccount(null));
  }, []);
  return <header className="site-header"><Link className="brand" href="/"><span>Raghul</span> Snacks</Link><nav><Link href="/shop">Shop</Link><Link href="/about">Our story</Link><Link href="/orders">Orders</Link><Link href={account ? "/orders" : "/login"}>{account ? "Account" : "Sign in"}</Link></nav><Link className="cart-link" href="/cart">Bag <span>{count}</span></Link></header>;
}
