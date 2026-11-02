/**
 * Indian Postal PIN Code Validation and Circle Resolver
 *
 * PIN codes in India are 6-digit numeric codes where:
 * - Digits 1-8 indicate geographical postal circles.
 * - Digit 9 indicates the Army Postal Service (APS) / Field Post Office (FPO),
 *   which cannot be delivered by commercial parcel couriers.
 * - Digits starting with 0 are invalid.
 */

export interface PincodeValidationResult {
  valid: boolean;
  state?: string;
  region?: string;
  error?: string;
}

export const VALID_PINCODE_CIRCLES: Record<string, { state: string; region: string }> = {
  // Northern Zone (1)
  "11": { state: "Delhi", region: "North" },
  "12": { state: "Haryana", region: "North" },
  "13": { state: "Haryana", region: "North" },
  "14": { state: "Punjab", region: "North" },
  "15": { state: "Punjab", region: "North" },
  "16": { state: "Punjab", region: "North" },
  "17": { state: "Himachal Pradesh", region: "North" },
  "18": { state: "Jammu and Kashmir", region: "North" },
  "19": { state: "Jammu and Kashmir", region: "North" },

  // Northern Zone (2)
  "20": { state: "Uttar Pradesh", region: "North" },
  "21": { state: "Uttar Pradesh", region: "North" },
  "22": { state: "Uttar Pradesh", region: "North" },
  "23": { state: "Uttar Pradesh", region: "North" },
  "24": { state: "Uttar Pradesh", region: "North" },
  "25": { state: "Uttar Pradesh", region: "North" },
  "26": { state: "Uttar Pradesh", region: "North" },
  "27": { state: "Uttar Pradesh", region: "North" },
  "28": { state: "Uttar Pradesh", region: "North" },

  // Western Zone (3)
  "30": { state: "Rajasthan", region: "North" },
  "31": { state: "Rajasthan", region: "North" },
  "32": { state: "Rajasthan", region: "North" },
  "33": { state: "Rajasthan", region: "North" },
  "34": { state: "Rajasthan", region: "North" },
  "36": { state: "Gujarat", region: "West" },
  "37": { state: "Gujarat", region: "West" },
  "38": { state: "Gujarat", region: "West" },
  "39": { state: "Gujarat", region: "West" },

  // Western / Central Zone (4)
  "40": { state: "Maharashtra", region: "West" },
  "41": { state: "Maharashtra", region: "West" },
  "42": { state: "Maharashtra", region: "West" },
  "43": { state: "Maharashtra", region: "West" },
  "44": { state: "Maharashtra", region: "West" },
  "45": { state: "Madhya Pradesh", region: "Central" },
  "46": { state: "Madhya Pradesh", region: "Central" },
  "47": { state: "Madhya Pradesh", region: "Central" },
  "48": { state: "Madhya Pradesh", region: "Central" },
  "49": { state: "Chhattisgarh", region: "Central" },

  // Southern Zone (5)
  "50": { state: "Telangana", region: "South" },
  "51": { state: "Andhra Pradesh", region: "South" },
  "52": { state: "Andhra Pradesh", region: "South" },
  "53": { state: "Andhra Pradesh", region: "South" },
  "56": { state: "Karnataka", region: "South" },
  "57": { state: "Karnataka", region: "South" },
  "58": { state: "Karnataka", region: "South" },
  "59": { state: "Karnataka", region: "South" },

  // Southern Zone (6)
  "60": { state: "Tamil Nadu", region: "South" },
  "61": { state: "Tamil Nadu", region: "South" },
  "62": { state: "Tamil Nadu", region: "South" },
  "63": { state: "Tamil Nadu", region: "South" },
  "64": { state: "Tamil Nadu", region: "South" },
  "67": { state: "Kerala", region: "South" },
  "68": { state: "Kerala", region: "South" },
  "69": { state: "Kerala", region: "South" },

  // Eastern Zone (7)
  "70": { state: "West Bengal", region: "East" },
  "71": { state: "West Bengal", region: "East" },
  "72": { state: "West Bengal", region: "East" },
  "73": { state: "West Bengal", region: "East" },
  "74": { state: "West Bengal", region: "East" },
  "75": { state: "Odisha", region: "East" },
  "76": { state: "Odisha", region: "East" },
  "77": { state: "Odisha", region: "East" },
  "78": { state: "Assam", region: "North East" },
  "79": { state: "North East", region: "North East" },

  // Eastern Zone (8)
  "80": { state: "Bihar", region: "East" },
  "81": { state: "Bihar", region: "East" },
  "82": { state: "Jharkhand", region: "East" },
  "83": { state: "Jharkhand", region: "East" },
  "84": { state: "Bihar", region: "East" },
  "85": { state: "Bihar", region: "East" },
};

export function validateIndianPincode(pincode: string | null | undefined): PincodeValidationResult {
  const clean = (pincode || "").trim();
  if (!clean) {
    return { valid: false, error: "Please enter a PIN code." };
  }
  if (!/^\d+$/.test(clean)) {
    return { valid: false, error: "PIN code must contain digits only." };
  }
  if (clean.length !== 6) {
    return { valid: false, error: "PIN code must be exactly 6 digits." };
  }
  if (clean.startsWith("0")) {
    return { valid: false, error: "Invalid PIN code. Indian PIN codes cannot start with 0." };
  }
  if (clean.startsWith("9")) {
    return {
      valid: false,
      error: "PIN codes starting with 9 belong to Army Postal Service and cannot be delivered by commercial couriers.",
    };
  }

  const prefix = clean.slice(0, 2);
  const circle = VALID_PINCODE_CIRCLES[prefix];
  if (!circle) {
    return {
      valid: false,
      error: `Invalid PIN code. ${clean} does not match any recognized Indian postal circle.`,
    };
  }

  return {
    valid: true,
    state: circle.state,
    region: circle.region,
  };
}

