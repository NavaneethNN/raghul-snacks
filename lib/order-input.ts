import { z } from "zod";

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
});

const checkoutFields = z.object({
  customerName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
  email: z.string().trim().email(),
  password: z.string().max(128).optional(),
  confirmPassword: z.string().max(128).optional(),
  address: z.string().trim().min(8).max(300),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code."),
  items: z.array(orderItemSchema).min(1).max(20),
});

const passwordsMatch = (value: { password?: string; confirmPassword?: string }) => {
  if (!value.password && !value.confirmPassword) return true;
  return Boolean(value.password && value.password.length >= 8 && value.password === value.confirmPassword);
};
export const checkoutSchema = checkoutFields.refine(passwordsMatch, { message: "Enter matching passwords of at least 8 characters.", path: ["confirmPassword"] });

export const verifiedOrderSchema = checkoutFields.extend({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
}).refine(passwordsMatch, { message: "Enter matching passwords of at least 8 characters.", path: ["confirmPassword"] });

export const cashfreeVerifiedOrderSchema = checkoutFields.extend({
  cashfreeOrderId: z.string().min(1),
}).refine(passwordsMatch, { message: "Enter matching passwords of at least 8 characters.", path: ["confirmPassword"] });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
