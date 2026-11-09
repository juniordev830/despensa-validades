import { Pantry } from "./pantry";
import { expiryReport } from "./expiry";

export interface RestockRule {
  product: string;
  minimumUnits: number;
  targetUnits: number;
}

export interface RestockSuggestion extends RestockRule {
  usableUnits: number;
  expiredUnits: number;
  orderUnits: number;
}

export interface RestockReport {
  asOf: string;
  suggestions: RestockSuggestion[];
  totalOrderUnits: number;
}

/**
 * Suggests restocking only when usable units fall below a configured minimum.
 * Expired and depleted lots do not count as available stock. All comparisons
 * use the caller's explicit date, never the machine's local timezone.
 */
export function restockReport(pantry: Pantry, rules: RestockRule[], asOf: string): RestockReport {
  if (!Array.isArray(rules)) throw new Error("Regras de reposicao devem ser uma lista");
  if (rules.length > 1000) throw new Error("Limite de 1000 regras de reposicao");
  const lots = expiryReport(pantry, asOf, 0).entries;
  const seen = new Set<string>();

  const suggestions = rules.map(rule => {
    if (!rule || typeof rule !== "object" ||
        typeof rule.product !== "string" || !rule.product.trim() ||
        rule.product.length > 120) {
      throw new Error("Produto de reposicao invalido");
    }
    const product = rule.product.trim();
    if (seen.has(product)) throw new Error("Regra duplicada para " + product);
    seen.add(product);

    if (!Number.isSafeInteger(rule.minimumUnits) ||
        !Number.isSafeInteger(rule.targetUnits) ||
        rule.minimumUnits < 0 || rule.targetUnits < 1 ||
        rule.targetUnits < rule.minimumUnits ||
        rule.targetUnits > 1_000_000) {
      throw new Error("Minimo e alvo devem ser inteiros validos, com alvo >= minimo");
    }

    let usableUnits = 0;
    let expiredUnits = 0;
    for (const lot of lots) {
      if (lot.product !== product) continue;
      if (lot.status === "expired") expiredUnits += lot.quantity;
      else usableUnits += lot.quantity;
    }
    if (!Number.isSafeInteger(usableUnits) || !Number.isSafeInteger(expiredUnits)) {
      throw new Error("Quantidade total excede o limite seguro");
    }

    return {
      product, minimumUnits: rule.minimumUnits, targetUnits: rule.targetUnits,
      usableUnits, expiredUnits,
      orderUnits: usableUnits < rule.minimumUnits ? Math.max(0, rule.targetUnits - usableUnits) : 0,
    };
  });

  suggestions.sort((a, b) => a.product.localeCompare(b.product));
  const totalOrderUnits = suggestions.reduce((sum, item) => sum + item.orderUnits, 0);
  if (!Number.isSafeInteger(totalOrderUnits)) throw new Error("Total excede o limite seguro");
  return { asOf, suggestions, totalOrderUnits };
}
