/**
 * Shared courier & shipping utility helpers (safe for both client and server).
 */

/**
 * Resolves the direct external tracking URL for a given courier partner and AWB code.
 * Supports ST Courier, DTDC, India Post, Delhivery, Blue Dart, The Professional Courier, and Shiprocket fallback.
 */
export function getCourierTrackingUrl(carrier?: string | null, awb?: string | null): string {
  if (!awb || !awb.trim()) return "#";
  const cleanAwb = awb.trim();
  const c = (carrier || "").toLowerCase();

  if (c.includes("st courier") || c.includes("stcourier")) {
    return `https://stcourier.com/track?awb=${encodeURIComponent(cleanAwb)}`;
  }
  if (c.includes("dtdc")) {
    return `https://www.dtdc.in/tracking/tracking_results.asp?trkid=${encodeURIComponent(cleanAwb)}`;
  }
  if (c.includes("post") || c.includes("speed post") || c.includes("india post")) {
    return `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
  }
  if (c.includes("delhivery")) {
    return `https://www.delhivery.com/track/package/${encodeURIComponent(cleanAwb)}`;
  }
  if (c.includes("blue dart") || c.includes("bluedart")) {
    return `https://www.bluedart.com/tracking?handler=traking&action=awb&awb=awb&numbers=${encodeURIComponent(cleanAwb)}`;
  }
  if (c.includes("professional")) {
    return "https://www.tpcindia.com/";
  }
  return `https://shiprocket.co/tracking/${encodeURIComponent(cleanAwb)}`;
}

