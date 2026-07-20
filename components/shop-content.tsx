"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import styles from "./shop-content.module.css";

type Category = {
  id: number;
  name: string;
  slug: string;
};

type Product = any;
type Combo = any;

export function ShopContent({
  categories,
  products,
  combos
}: {
  categories: Category[];
  products: Product[];
  combos: Combo[]
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>(tabParam || 'products');

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  return (
    <>
      <div className="filter-row" style={{ marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('products')}
          style={{
            background: activeTab === 'products' ? 'var(--ink)' : 'transparent',
            color: activeTab === 'products' ? 'white' : 'inherit',
            border: '1px solid var(--line)',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: activeTab === 'products' ? '600' : '400',
          }}
        >
          All Products
        </button>
        <button
          onClick={() => setActiveTab('combos')}
          style={{
            background: activeTab === 'combos' ? 'var(--ink)' : 'transparent',
            color: activeTab === 'combos' ? 'white' : 'inherit',
            border: '1px solid var(--line)',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: activeTab === 'combos' ? '600' : '400',
          }}
        >
          Combos
        </button>
        {categories.map((category) => (
          <button
            key={category.slug}
            onClick={() => setActiveTab(category.slug)}
            style={{
              background: activeTab === category.slug ? 'var(--ink)' : 'transparent',
              color: activeTab === category.slug ? 'white' : 'inherit',
              border: '1px solid var(--line)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: activeTab === category.slug ? '600' : '400',
            }}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="product-grid">
        {activeTab === 'products' && products.map((product: any) => (
          <ProductCard key={product.id} product={product} />
        ))}

        {activeTab === 'combos' && combos.map((combo: any) => (
          <article key={combo.id} className="product-card">
            <Link href={`/combo/${combo.slug}`} className="product-visual">
              {combo.image ? (
                <img src={combo.image} alt={combo.title} />
              ) : (
                <div className="product-visual-placeholder">
                  <span className="placeholder-icon">✦</span>
                </div>
              )}
              <span className="category-label">Combo</span>
            </Link>
            <div className="product-copy">
              <p>{combo.items?.length || 0} items</p>
              <Link href={`/combo/${combo.slug}`}>
                <h3>{combo.title}</h3>
              </Link>
              <div className="price">
                <strong>₹{combo.discount && parseFloat(combo.discount) > 0 ? combo.discount : combo.price}</strong>
                {combo.discount && parseFloat(combo.discount) > 0 && (
                  <s>₹{combo.price}</s>
                )}
              </div>
              <Link href={`/combo/${combo.slug}`} className="button">
                View Combo
              </Link>
            </div>
          </article>
        ))}

        {activeTab !== 'products' && activeTab !== 'combos' &&
          products.filter((p: any) => p.categorySlug === activeTab).map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))
        }
      </div>
    </>
  );
}
