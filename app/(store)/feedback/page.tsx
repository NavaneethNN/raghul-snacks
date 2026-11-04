import { eq } from "drizzle-orm";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { products } from "@/drizzle/schema";
import { FeedbackForm } from "@/components/feedback-form";

export const metadata = {
  title: "Customer Feedback | Raghul Delights",
  description: "Share your honest feedback and rating for our handcrafted snacks.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; productId?: string }>;
}) {
  const db = getDb();
  const allActiveProducts = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      image: products.image,
      price: products.price,
      weight: products.weight,
    })
    .from(products)
    .where(eq(products.active, true))
    .orderBy(products.name);

  const { product: productSlug, productId: productIdParam } = await searchParams;

  let initialProductId: number | null = null;
  if (productIdParam && !isNaN(Number(productIdParam))) {
    initialProductId = Number(productIdParam);
  } else if (productSlug) {
    const matched = allActiveProducts.find(
      (p) => p.slug.toLowerCase() === productSlug.toLowerCase()
    );
    if (matched) initialProductId = matched.id;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream, #f7f4ec)", padding: "32px 16px 80px" }}>
      <div style={{ maxWidth: 580, margin: "0 auto", boxSizing: "border-box" }}>

        {/* Back Link */}
        <div style={{ marginBottom: 20 }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13.5,
              fontWeight: 600,
              color: "#78716c",
              textDecoration: "none",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Raghul Delights
          </Link>
        </div>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--terracotta, #c95f3b)",
              background: "rgba(201, 95, 59, 0.08)",
              border: "1px solid rgba(201, 95, 59, 0.2)",
              padding: "4px 12px",
              borderRadius: 999,
              marginBottom: 10,
              fontFamily: "var(--font-dm-mono, monospace)",
            }}
          >
            Direct Customer Review
          </span>

          <h1
            style={{
              margin: "0 0 8px",
              fontFamily: "var(--font-playfair, Georgia, serif)",
              fontSize: "clamp(24px, 5vw, 32px)",
              fontWeight: 700,
              color: "var(--ink, #243127)",
              lineHeight: 1.2,
            }}
          >
            How was your snack?
          </h1>

          <p style={{ margin: "0 auto", fontSize: 14.5, color: "#57534e", maxWidth: 440, lineHeight: 1.5 }}>
            Thank you for tasting our homemade delights! Your honest review will be featured directly on the product page.
          </p>
        </div>

        {/* Feedback Form Card */}
        <FeedbackForm
          products={allActiveProducts}
          initialProductId={initialProductId}
        />

        {/* Footer Note */}
        <p
          style={{
            marginTop: 24,
            textAlign: "center",
            fontSize: 12.5,
            color: "#a8a29e",
            fontFamily: "var(--font-dm-mono, monospace)",
          }}
        >
          Raghul Delights • Traditional Taste, Homemade Goodness
        </p>

      </div>
    </div>
  );
}
