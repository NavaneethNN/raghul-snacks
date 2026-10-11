/**
 * Corner marker shown on a product card when the product comes in multiple
 * pack sizes. Purely presentational — no hooks, so it works in server and
 * client trees alike.
 */
export function VariantStackFlag({ count }: { count: number }) {
  if (count < 1) return null;

  const label = count === 1 ? "1 pack size" : `${count} pack sizes`;

  return (
    <span className="variant-flag" title={label} aria-label={label}>
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3 3 7.5l9 4.5 9-4.5L12 3z" />
        <path d="m3 12.5 9 4.5 9-4.5" />
        <path d="m3 17 9 4.5 9-4.5" />
      </svg>
      <span className="variant-flag-count">{count}</span>
    </span>
  );
}
