/**
 * Indian Mobile Phone Number Utility
 * 
 * Accurately normalizes, validates, and formats Indian mobile numbers across:
 * - Standard 10 digits: "9876543210"
 * - Prefix "+91": "+919876543210", "+91 9876543210", "+91  98765 43210", "+91-98765-43210"
 * - Prefix "91" (country code without +): "919876543210", "91 9876543210"
 * - Leading zero / STD style: "09876543210", "0 9876543210"
 * - Combined "+91 0" or "(0)": "+91 09876543210", "+91 (0) 9876543210"
 * - International prefix "0091": "00919876543210", "0091 9876543210"
 * 
 * Correctly distinguishes actual 10-digit mobile numbers starting with 91 (e.g. "9123456789")
 * from numbers with the 91 country code prefix (e.g. "919876543210" or "+91 9123456789").
 */

/**
 * Normalizes an Indian mobile phone number into a canonical 10-digit string.
 * Strips formatting, country codes (+91 / 91 / 0091), and leading zeros.
 */
export function normalizeIndianPhone(input: string | null | undefined): string {
  if (!input) return "";

  let cleaned = String(input).trim();
  if (!cleaned) return "";

  // 1. Remove leading "+" or "+91"
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  // 2. Extract digits only
  let digits = cleaned.replace(/\D/g, "");

  // 3. Remove "0091" international dialing prefix if present
  if (digits.startsWith("0091") && digits.length >= 14) {
    digits = digits.slice(4);
  }

  // 4. Remove country code "91" only if total digits >= 12 and starts with 91
  // (Prevents cutting off valid 10-digit mobile numbers that naturally start with 91, e.g. 9123456789)
  if (digits.length >= 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  // 5. Remove leading zeroes (e.g. "09876543210" or remnant zero after "+91 0...")
  digits = digits.replace(/^0+/, "");

  return digits;
}

/**
 * Validates whether the given input resolves to a valid 10-digit Indian mobile number.
 * Indian telecom standards assign mobile numbers starting with 6, 7, 8, or 9.
 */
export function isValidIndianPhone(input: string | null | undefined): boolean {
  if (!input) return false;
  const normalized = normalizeIndianPhone(input);
  return /^[6-9]\d{9}$/.test(normalized);
}

/**
 * Formats an Indian mobile number for clean user-facing display.
 * Example: "9876543210" -> "+91 98765 43210" (or "98765 43210" if includeCountryCode is false)
 */
export function formatIndianPhone(input: string | null | undefined, includeCountryCode = true): string {
  const clean = normalizeIndianPhone(input);
  if (!/^[6-9]\d{9}$/.test(clean)) {
    return input ? String(input).trim() : "";
  }
  const formatted = `${clean.slice(0, 5)} ${clean.slice(5)}`;
  return includeCountryCode ? `+91 ${formatted}` : formatted;
}

