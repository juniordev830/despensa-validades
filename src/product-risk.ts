import { Pantry } from "./pantry";
import { expiryReport, ExpiryStatus } from "./expiry";

export interface ProductExpiryRisk {
  product: string;
  expiredUnits: number;
  expiringUnits: number;
  freshUnits: number;
  totalUnits: number;
}

export interface ProductExpiryRiskReport {
  asOf: string;
  windowDays: number;
  products: ProductExpiryRisk[];
  totalAtRiskUnits: number;
}

/**
 * Aggregate stock at risk by product and expiry window, without changing lots.
 * "At risk" is a stock-timing signal, not a food-safety determination.
 */
export function productExpiryRiskReport(
  pantry: Pantry, asOf: string, windowDays = 7
): ProductExpiryRiskReport {
  const report = expiryReport(pantry, asOf, windowDays);
  const grouped = new Map<string, ProductExpiryRisk>();

  for (const lot of report.entries) {
    const current = grouped.get(lot.product) ?? {
      product: lot.product,
      expiredUnits: 0,
      expiringUnits: 0,
      freshUnits: 0,
      totalUnits: 0,
    };
    const field: Record<ExpiryStatus, "expiredUnits" | "expiringUnits" | "freshUnits"> = {
      expired: "expiredUnits", due_soon: "expiringUnits", fresh: "freshUnits",
    };
    const nextStatusUnits = current[field[lot.status]] + lot.quantity;
    const nextTotal = current.totalUnits + lot.quantity;
    if (!Number.isSafeInteger(nextStatusUnits) || !Number.isSafeInteger(nextTotal)) {
      throw new RangeError("Quantidade por produto excede inteiro seguro");
    }
    current[field[lot.status]] = nextStatusUnits;
    current.totalUnits = nextTotal;
    grouped.set(lot.product, current);
  }

  const products = [...grouped.values()].sort((a, b) =>
    (b.expiredUnits + b.expiringUnits) - (a.expiredUnits + a.expiringUnits) ||
    a.product.localeCompare(b.product)
  );
  const totalAtRiskUnits = products.reduce((total, product) =>
    total + product.expiredUnits + product.expiringUnits, 0);
  if (!Number.isSafeInteger(totalAtRiskUnits)) {
    throw new RangeError("Quantidade total em risco excede inteiro seguro");
  }
  return { asOf, windowDays, products, totalAtRiskUnits };
}
