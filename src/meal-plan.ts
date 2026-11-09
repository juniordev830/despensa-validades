import { Lot, Pantry } from "./pantry";

export interface PlannedDemand {
  product: string;
  date: string;
  units: number;
}

export interface PlannedAllocation {
  lotId: string;
  units: number;
}

export interface DemandFulfillment {
  product: string;
  date: string;
  requested: number;
  allocated: number;
  missing: number;
  allocations: PlannedAllocation[];
}

export interface ConsumptionPlan {
  asOf: string;
  demands: DemandFulfillment[];
  totalRequested: number;
  totalAllocated: number;
  totalMissing: number;
  remainingLots: Lot[];
}

const MAX_DEMANDS = 1000;
const MAX_UNITS = 1_000_000;

function dayNumber(date: string): number {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Data deve ter formato AAAA-MM-DD");
  }
  const timestamp = Date.parse(date + "T00:00:00Z");
  if (!Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString().slice(0, 10) !== date) {
    throw new Error("Data de calendario invalida: " + date);
  }
  return timestamp / 86400000;
}

function safeAdd(left: number, right: number): number {
  const total = left + right;
  if (!Number.isSafeInteger(total)) throw new Error("Total excede inteiro seguro");
  return total;
}

/**
 * Projects stock consumption by date using FEFO (first expiring, first out).
 * Each demand consumes from an independent copy of the inventory; expired
 * lots are skipped for that date, while a lot expiring today remains usable.
 * Results are chronological with stable ordering for same-day demands.
 */
export function planConsumption(pantry: Pantry, demands: PlannedDemand[], asOf: string): ConsumptionPlan {
  const today = dayNumber(asOf);
  if (!Array.isArray(demands) || demands.length > MAX_DEMANDS) {
    throw new Error("Plano deve conter no maximo 1000 demandas");
  }
  if (!pantry || !Array.isArray(pantry.lots)) {
    throw new Error("Estoque invalido");
  }

  const ordered = demands.map((demand, index) => {
    if (!demand || typeof demand.product !== "string" ||
        demand.product.trim().length === 0 || demand.product.length > 120 ||
        !Number.isSafeInteger(demand.units) ||
        demand.units < 1 || demand.units > MAX_UNITS) {
      throw new Error("Demanda invalida na posicao " + (index + 1));
    }
    const day = dayNumber(demand.date);
    if (day < today) throw new Error("Demanda anterior a data de referencia");
    return { product: demand.product.trim(), date: demand.date, units: demand.units, day, index };
  }).sort((a, b) => a.day - b.day || a.index - b.index);

  const remaining = pantry.lots.map(lot => {
    if (!lot || !Number.isSafeInteger(lot.quantity) || lot.quantity < 0 ||
        lot.quantity > MAX_UNITS || typeof lot.product !== "string" ||
        typeof lot.id !== "string") {
      throw new Error("Lote de estoque invalido");
    }
    dayNumber(lot.expiresOn);
    return { ...lot };
  });
  const sorted = remaining.slice().sort((a, b) =>
    a.expiresOn.localeCompare(b.expiresOn) || a.id.localeCompare(b.id));

  const fulfilled: DemandFulfillment[] = [];
  let totalRequested = 0;
  let totalAllocated = 0;
  for (const demand of ordered) {
    let needed = demand.units;
    const allocations: PlannedAllocation[] = [];
    for (const lot of sorted) {
      if (needed === 0) break;
      if (lot.product !== demand.product || lot.quantity === 0 ||
          lot.expiresOn < demand.date) continue;
      const units = Math.min(needed, lot.quantity);
      lot.quantity -= units;
      needed -= units;
      allocations.push({ lotId: lot.id, units });
    }
    const allocated = demand.units - needed;
    totalRequested = safeAdd(totalRequested, demand.units);
    totalAllocated = safeAdd(totalAllocated, allocated);
    fulfilled.push({
      product: demand.product, date: demand.date, requested: demand.units,
      allocated, missing: needed, allocations,
    });
  }
  return {
    asOf, demands: fulfilled, totalRequested, totalAllocated,
    totalMissing: totalRequested - totalAllocated, remainingLots: remaining,
  };
}
