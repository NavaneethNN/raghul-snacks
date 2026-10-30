import { z } from "zod";

const cleanPhone = (val: string) => {
  const digits = val.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
};

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(500),
});

const checkoutFields = z.object({
  customerName: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
  phone: z
    .string()
    .trim()
    .transform(cleanPhone)
    .refine((val) => /^[6-9]\d{9}$/.test(val), "Enter a valid 10-digit Indian mobile number."),
  email: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => val || "")
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Please enter a valid email address."
    ),
  address: z.string().trim().min(8, "Address must be at least 8 characters long.").max(300),
  city: z.string().trim().min(2, "District / City must be at least 2 characters.").max(80),
  state: z.string().trim().min(2, "Please select your state.").max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code."),
  items: z.array(orderItemSchema).min(1, "Your cart is empty.").max(100),
  couponCode: z.string().trim().max(40).optional().nullable(),
  shipping: z.number().min(0).optional().nullable(), // client-calculated shipping charge
});

export const checkoutSchema = checkoutFields;

export const verifiedOrderSchema = checkoutFields.extend({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const razorpayVerifiedOrderSchema = checkoutFields.extend({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const cashfreeVerifiedOrderSchema = checkoutFields.extend({
  cashfreeOrderId: z.string().min(1),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
