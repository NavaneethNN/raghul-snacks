import { z } from "zod";

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
});

export const checkoutSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().min(12).max(500),
  items: z.array(orderItemSchema).min(1).max(20),
});

export const verifiedOrderSchema = checkoutSchema.extend({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
