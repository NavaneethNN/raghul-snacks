import { getDb } from "@/lib/db";
import { packagingBoxes } from "@/drizzle/schema";
import { asc, eq } from "drizzle-orm";

export type PackagingBox = {
  id: number;
  name: string;
  length: number;
  breadth: number;
  height: number;
  boxWeightKg: number;
  maxCapacityKg: number;
  active: boolean;
  sortOrder: number;
};

export type BoxSelectionResult = {
  boxId: number | null;
  boxName: string;
  length: number;
  breadth: number;
  height: number;
  boxWeightKg: number;
  snackWeightKg: number;
  totalWeightKg: number;
  volumetricWeightKg: number;
};

export const DEFAULT_PACKAGING_BOXES: PackagingBox[] = [
  {
    id: 1,
    name: "Small Mailer / Pouch",
    length: 20,
    breadth: 15,
    height: 5,
    boxWeightKg: 0.05,
    maxCapacityKg: 0.35,
    active: true,
    sortOrder: 1,
  },
  {
    id: 2,
    name: "Standard Snack Box (2–4 Packs)",
    length: 22,
    breadth: 16,
    height: 10,
    boxWeightKg: 0.12,
    maxCapacityKg: 1.2,
    active: true,
    sortOrder: 2,
  },
  {
    id: 3,
    name: "Medium Box (5–8 Packs)",
    length: 28,
    breadth: 22,
    height: 14,
    boxWeightKg: 0.22,
    maxCapacityKg: 2.5,
    active: true,
    sortOrder: 3,
  },
  {
    id: 4,
    name: "Large Bulk Carton (9–15 Packs)",
    length: 35,
    breadth: 28,
    height: 20,
    boxWeightKg: 0.38,
    maxCapacityKg: 6.0,
    active: true,
    sortOrder: 4,
  },
];

export async function getActivePackagingBoxes(): Promise<PackagingBox[]> {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(packagingBoxes)
      .where(eq(packagingBoxes.active, true))
      .orderBy(asc(packagingBoxes.sortOrder), asc(packagingBoxes.maxCapacityKg));

    if (rows.length === 0) return DEFAULT_PACKAGING_BOXES;

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      length: parseFloat(r.length),
      breadth: parseFloat(r.breadth),
      height: parseFloat(r.height),
      boxWeightKg: parseFloat(r.boxWeightKg),
      maxCapacityKg: parseFloat(r.maxCapacityKg),
      active: r.active,
      sortOrder: r.sortOrder,
    }));
  } catch (error) {
    console.warn("[packaging] Unable to query packaging_boxes from DB, using fallback:", error);
    return DEFAULT_PACKAGING_BOXES;
  }
}

export async function getAllPackagingBoxes(): Promise<PackagingBox[]> {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(packagingBoxes)
      .orderBy(asc(packagingBoxes.sortOrder), asc(packagingBoxes.maxCapacityKg));

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      length: parseFloat(r.length),
      breadth: parseFloat(r.breadth),
      height: parseFloat(r.height),
      boxWeightKg: parseFloat(r.boxWeightKg),
      maxCapacityKg: parseFloat(r.maxCapacityKg),
      active: r.active,
      sortOrder: r.sortOrder,
    }));
  } catch (error) {
    console.warn("[packaging] Unable to query all packaging_boxes from DB, using fallback:", error);
    return DEFAULT_PACKAGING_BOXES;
  }
}

/**
 * Chooses the most compact active packaging box capable of holding the snack parcel weight.
 * Adds the tare box weight to the snack weight to get the exact billed weight.
 */
export function matchOptimalPackagingBox(
  snackWeightKg: number,
  boxes: PackagingBox[]
): BoxSelectionResult {
  const activeBoxes = boxes.filter((b) => b.active);
  const candidates = activeBoxes.length > 0 ? activeBoxes : DEFAULT_PACKAGING_BOXES;

  // Sort by maxCapacity ascending to pick the smallest box that fits
  const sorted = [...candidates].sort((a, b) => a.maxCapacityKg - b.maxCapacityKg);

  const matched =
    sorted.find((box) => box.maxCapacityKg >= snackWeightKg) ||
    sorted[sorted.length - 1]; // If it exceeds all, use the largest box

  const boxWeightKg = matched.boxWeightKg;
  const totalWeightKg = Math.max(
    0.15,
    Math.round((snackWeightKg + boxWeightKg) * 1000) / 1000
  );
  const volumetricWeightKg =
    Math.round(((matched.length * matched.breadth * matched.height) / 5000) * 1000) /
    1000;

  return {
    boxId: matched.id,
    boxName: matched.name,
    length: matched.length,
    breadth: matched.breadth,
    height: matched.height,
    boxWeightKg,
    snackWeightKg,
    totalWeightKg,
    volumetricWeightKg,
  };
}

export async function selectOptimalPackagingBox(
  snackWeightKg: number
): Promise<BoxSelectionResult> {
  const boxes = await getActivePackagingBoxes();
  return matchOptimalPackagingBox(snackWeightKg, boxes);
}
