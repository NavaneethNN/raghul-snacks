type CashfreeCheckoutResult = { error?: { message?: string }; redirect?: boolean; paymentDetails?: unknown };

type CashfreeCheckout = { checkout: (options: { paymentSessionId: string; redirectTarget: "_modal" }) => Promise<CashfreeCheckoutResult> };

declare function Cashfree(options: { mode: "sandbox" | "production" }): CashfreeCheckout;

interface Window { Cashfree: typeof Cashfree; }
