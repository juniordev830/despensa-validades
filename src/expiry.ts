import { byExpiry, Lot, Pantry } from "./pantry";

export type ExpiryStatus = "expired" | "due_soon" | "fresh";

export interface ExpiryEntry extends Lot {
  daysUntilExpiry: number;
  status: ExpiryStatus;
}

export interface ExpiryReport {
  asOf: string;
  windowDays: number;
  entries: ExpiryEntry[];
  lotsByStatus: Record<ExpiryStatus, number>;
  unitsByStatus: Record<ExpiryStatus, number>;
}

/** Use date-only UTC arithmetic so time zones and daylight-saving never alter a day. */
function midnightUTC(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Data deve ter formato AAAA-MM-DD");
  }
  const stamp = Date.parse(value + "T00:00:00Z");
  if (!Number.isFinite(stamp) ||
      new Date(stamp).toISOString().slice(0, 10) !== value) {
    throw new Error("Data de calendario invalida: " + value);
  }
  return stamp;
}

/**
 * Pure summary of non-empty lots, sorted in the same FEFO order as the pantry.
 *
 * A lot expiring today is "due_soon"; a lot that expired yesterday is "expired".
 * windowDays=0 includes only items expiring today.
 */
export function expiryReport(pantry: Pantry, asOf: string, windowDays = 7): ExpiryReport {
  const base = midnightUTC(asOf);
  if (!Number.isSafeInteger(windowDays) || windowDays < 0 || windowDays > 3650) {
    throw new Error("Janela deve ser um inteiro entre 0 e 3650 dias");
  }

  const lotsByStatus: Record<ExpiryStatus, number> = {
    expired: 0, due_soon: 0, fresh: 0,
  };
  const unitsByStatus: Record<ExpiryStatus, number> = {
    expired: 0, due_soon: 0, fresh: 0,
  };

  const entries = byExpiry(pantry).map((lot): ExpiryEntry => {
    const daysUntilExpiry = Math.round((midnightUTC(lot.expiresOn) - base) / 86400000);
    const status: ExpiryStatus = daysUntilExpiry < 0 ? "expired" :
      daysUntilExpiry <= windowDays ? "due_soon" : "fresh";
    lotsByStatus[status]++;
    unitsByStatus[status] += lot.quantity;
    return { ...lot, daysUntilExpiry, status };
  });

  return {
    asOf, windowDays, entries, lotsByStatus, unitsByStatus,
  };
}
