/**
 * Indian Postal PIN Code Validation, Circle & City Resolver, and Delivery Estimator
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

export const PINCODE_DISTRICT_MAP: Record<string, string> = {
  // Tamil Nadu
  "600": "Chennai",
  "601": "Kanchipuram / Tiruvallur",
  "602": "Tiruvallur",
  "603": "Chengalpattu",
  "604": "Tindivanam",
  "605": "Puducherry / Cuddalore",
  "606": "Tiruvannamalai",
  "607": "Cuddalore",
  "608": "Chidambaram",
  "609": "Mayiladuthurai",
  "610": "Thiruvarur",
  "611": "Nagapattinam",
  "612": "Kumbakonam",
  "613": "Thanjavur",
  "614": "Pattukkottai",
  "620": "Tiruchirappalli (Trichy)",
  "621": "Perambalur / Ariyalur",
  "622": "Pudukkottai",
  "623": "Ramanathapuram",
  "624": "Dindigul",
  "625": "Madurai",
  "626": "Virudhunagar / Sivakasi",
  "627": "Tirunelveli / Tenkasi",
  "628": "Thoothukudi",
  "629": "Kanyakumari / Nagercoil",
  "630": "Karaikudi / Sivagangai",
  "631": "Ranipet / Arakkonam",
  "632": "Vellore",
  "635": "Krishnagiri / Hosur",
  "636": "Salem",
  "637": "Namakkal",
  "638": "Erode / Tiruppur",
  "639": "Karur",
  "641": "Coimbatore",
  "642": "Pollachi / Udumalpet",
  "643": "The Nilgiris (Ooty)",

  // Kerala
  "670": "Kannur",
  "671": "Kasaragod",
  "673": "Kozhikode (Calicut)",
  "676": "Malappuram",
  "678": "Palakkad",
  "679": "Ottapalam / Shoranur",
  "680": "Thrissur",
  "682": "Kochi / Ernakulam",
  "683": "Aluva",
  "685": "Idukki",
  "686": "Kottayam",
  "688": "Alappuzha",
  "689": "Pathanamthitta",
  "691": "Kollam",
  "695": "Thiruvananthapuram",

  // Karnataka
  "560": "Bengaluru",
  "561": "Bengaluru Rural",
  "562": "Ramanagara",
  "563": "Kolar Gold Fields",
  "570": "Mysuru (Mysore)",
  "571": "Mandya",
  "572": "Tumakuru",
  "573": "Hassan",
  "574": "Udupi",
  "575": "Mangaluru",
  "577": "Shivamogga / Davanagere",
  "580": "Hubballi-Dharwad",
  "583": "Ballari",
  "585": "Kalaburagi",
  "590": "Belagavi",

  // Andhra Pradesh & Telangana
  "500": "Hyderabad",
  "501": "Ranga Reddy",
  "502": "Medak",
  "503": "Nizamabad",
  "505": "Karimnagar",
  "506": "Warangal",
  "515": "Anantapur",
  "517": "Tirupati",
  "518": "Kurnool",
  "520": "Vijayawada",
  "522": "Guntur",
  "524": "Nellore",
  "530": "Visakhapatnam",
  "533": "Kakinada",

  // Major Metros & Capital Hubs
  "110": "New Delhi",
  "121": "Faridabad",
  "122": "Gurugram",
  "141": "Ludhiana",
  "160": "Chandigarh",
  "201": "Noida / Ghaziabad",
  "226": "Lucknow",
  "282": "Agra",
  "302": "Jaipur",
  "342": "Jodhpur",
  "380": "Ahmedabad",
  "390": "Vadodara",
  "395": "Surat",
  "400": "Mumbai",
  "401": "Thane",
  "411": "Pune",
  "440": "Nagpur",
  "452": "Indore",
  "462": "Bhopal",
  "492": "Raipur",
  "700": "Kolkata",
  "751": "Bhubaneswar",
  "781": "Guwahati",
  "800": "Patna",
  "834": "Ranchi",
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

export interface EstimatedDeliveryDetails {
  valid: boolean;
  serviceable: boolean;
  pincode: string;
  city: string;
  state: string;
  region: string;
  isLocal: boolean;
  isTamilNadu: boolean;
  isSouth: boolean;
  minDays: number;
  maxDays: number;
  prepDays: number;
  deliveryDateRange: string;
  deliveryDateShort: string;
  courierName: string;
  message: string;
}

function addDeliveryDays(startDate: Date, businessDays: number): Date {
  const d = new Date(startDate.getTime());
  let added = 0;
  while (added < businessDays) {
    d.setUTCDate(d.getUTCDate() + 1);
    // Sunday (0) is a non-delivery day for standard parcel couriers in India
    if (d.getUTCDay() !== 0) {
      added++;
    }
  }
  return d;
}

/**
 * Calculates realistic calendar estimated delivery dates based on origin in Coimbatore (TN 641017),
 * current Indian Standard Time (IST), baking/preparation cutoff, and regional transit times.
 */
export function calculateDeliveryDateRange(
  cleanPin: string,
  weightKg = 0.5
): EstimatedDeliveryDetails | null {
  const validation = validateIndianPincode(cleanPin);
  if (!validation.valid || !validation.state) {
    return null;
  }

  // Calculate current date & hour in Indian Standard Time (IST)
  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = istFormatter.formatToParts(now);
  const istYear = Number(parts.find((p) => p.type === "year")?.value);
  const istMonth = Number(parts.find((p) => p.type === "month")?.value) - 1;
  const istDay = Number(parts.find((p) => p.type === "day")?.value);
  const istHour = Number(parts.find((p) => p.type === "hour")?.value);

  const baseDate = new Date(Date.UTC(istYear, istMonth, istDay, 12, 0, 0));

  // If order is placed after 5:00 PM IST (17:00), fresh preparation queue starts next morning
  const cutoffOffset = istHour >= 17 ? 1 : 0;
  if (cutoffOffset > 0) {
    baseDate.setUTCDate(baseDate.getUTCDate() + cutoffOffset);
  }
  // If base starts on Sunday, dispatch queue begins Monday
  if (baseDate.getUTCDay() === 0) {
    baseDate.setUTCDate(baseDate.getUTCDate() + 1);
  }

  const prepDays = weightKg > 3 ? 2 : 1;
  const weightBuffer = weightKg > 3 ? 1 : 0;

  const prefix3 = cleanPin.slice(0, 3);
  const prefix2 = cleanPin.slice(0, 2);

  const city = PINCODE_DISTRICT_MAP[prefix3] || validation.state;
  const isLocal = ["641", "642", "638"].includes(prefix3); // Coimbatore, Pollachi, Tiruppur/Erode
  const isTN = ["60", "61", "62", "63", "64"].includes(prefix2) || prefix3 === "605";
  const isKerala = ["67", "68", "69"].includes(prefix2);
  const isSouth = isTN || isKerala || ["50", "51", "52", "53", "56", "57", "58", "59"].includes(prefix2);
  const isMajorMetro = ["110", "400", "411", "700", "560", "500", "380"].includes(prefix3);
  const isRemote = ["18", "19", "78", "79"].includes(prefix2); // J&K, North East

  let minDays = 4;
  let maxDays = 6;
  let courierName = "Pan-India Standard Courier";

  if (isLocal) {
    minDays = 2;
    maxDays = 3;
    courierName = "Local Fast Delivery (Coimbatore Hub)";
  } else if (isTN || isKerala) {
    minDays = 2;
    maxDays = 4;
    courierName = isTN ? "Tamil Nadu Express Delivery" : "South Express Delivery";
  } else if (isSouth) {
    minDays = 3;
    maxDays = 5;
    courierName = "South India Express";
  } else if (isMajorMetro) {
    minDays = 3;
    maxDays = 5;
    courierName = "Metro Air/Express Cargo";
  } else if (isRemote) {
    minDays = 6;
    maxDays = 9;
    courierName = "Special Regional Parcel";
  }

  const finalMinDays = minDays + weightBuffer;
  const finalMaxDays = maxDays + weightBuffer;

  const minDate = addDeliveryDays(baseDate, finalMinDays);
  const maxDate = addDeliveryDays(baseDate, finalMaxDays);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const formatWithDay = (d: Date) => `${daysOfWeek[d.getUTCDay()]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
  const formatShort = (d: Date) => `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;

  const deliveryDateRange = `${formatWithDay(minDate)} – ${formatWithDay(maxDate)}`;
  const deliveryDateShort = minDate.getUTCMonth() === maxDate.getUTCMonth()
    ? `${minDate.getUTCDate()} – ${formatShort(maxDate)}`
    : `${formatShort(minDate)} – ${formatShort(maxDate)}`;

  return {
    valid: true,
    serviceable: true,
    pincode: cleanPin,
    city,
    state: validation.state,
    region: validation.region || "India",
    isLocal,
    isTamilNadu: isTN,
    isSouth,
    minDays: finalMinDays,
    maxDays: finalMaxDays,
    prepDays,
    deliveryDateRange,
    deliveryDateShort,
    courierName,
    message: `Delivery by ${deliveryDateRange} to ${city}, ${validation.state}`,
  };
}
