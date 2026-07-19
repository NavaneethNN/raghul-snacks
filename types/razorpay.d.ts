interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; contact: string; email?: string };
  theme: { color: string };
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
}

declare class Razorpay {
  constructor(options: RazorpayCheckoutOptions);
  open(): void;
}

interface Window { Razorpay: typeof Razorpay; }
