import { ProductCard } from "@/components/product/product-card";

async function getCategories() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/categories`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

async function getProducts() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/products`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export default async function ShopPage() {
  const categories = await getCategories();
  const products = await getProducts();

  return (
    <section className="section shop-page">
      <p className="eyebrow">The full pantry</p>
      <h1>Find your next favourite.</h1>
      <div className="filter-row">
        <span>All products</span>
        {categories.map((category: any) => (
          <a href={`/shop/${category.slug}`} key={category.slug}>
            {category.name}
          </a>
        ))}
      </div>
      <div className="product-grid">
        {products.map((product: any) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
