export interface Lot {
  id: string;
  product: string;
  expiresOn: string;
  quantity: number;
}

export type MovementType = "consumed" | "discarded";
export interface Movement {
  kind: MovementType;
  product: string;
  quantity: number;
  allocations: { lotId: string; quantity: number }[];
}
export interface Pantry {
  lots: Lot[];
  movements: Movement[];
}

export const emptyPantry = (): Pantry => ({ lots: [], movements: [] });

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const instant = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(instant) &&
    new Date(instant).toISOString().slice(0, 10) === value;
}

function requireQuantity(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 1_000_000) {
    throw new Error("Quantidade precisa ser inteira, positiva e ate 1.000.000");
  }
}

function validName(value: string, label: string): void {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 120) {
    throw new Error(label + " obrigatorio, ate 120 caracteres");
  }
}

export function registerLot(pantry: Pantry, lot: Lot): Pantry {
  validName(lot.id, "ID do lote");
  validName(lot.product, "Produto");
  requireQuantity(lot.quantity);
  if (!validDate(lot.expiresOn)) throw new Error("Validade invalida: use AAAA-MM-DD");
  if (pantry.lots.some(current => current.id === lot.id)) {
    throw new Error("Lote duplicado: " + lot.id);
  }
  return {
    lots: [...pantry.lots, { ...lot, id: lot.id.trim(), product: lot.product.trim() }],
    movements: [...pantry.movements],
  };
}

export function byExpiry(pantry: Pantry): Lot[] {
  return pantry.lots.filter(lot => lot.quantity > 0)
    .map(lot => ({ ...lot }))
    .sort((a, b) =>
      a.expiresOn.localeCompare(b.expiresOn) ||
      a.product.localeCompare(b.product) ||
      a.id.localeCompare(b.id));
}

export function moveStock(pantry: Pantry, product: string, quantity: number, kind: MovementType): Pantry {
  validName(product, "Produto");
  requireQuantity(quantity);
  if (kind !== "consumed" && kind !== "discarded") {
    throw new Error("Movimento deve ser consumed ou discarded");
  }
  const eligible = pantry.lots.filter(lot => lot.product === product && lot.quantity > 0)
    .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn) || a.id.localeCompare(b.id));
  const available = eligible.reduce((sum, lot) => sum + lot.quantity, 0);
  if (available < quantity) throw new Error("Estoque insuficiente para " + product);
  let remaining = quantity;
  const selected = new Map<string, number>();
  for (const lot of eligible) {
    if (!remaining) break;
    const taken = Math.min(lot.quantity, remaining);
    selected.set(lot.id, taken);
    remaining -= taken;
  }
  const allocations = [...selected].map(([lotId, taken]) => ({ lotId, quantity: taken }));
  const lots = pantry.lots.map(lot => ({ ...lot, quantity: lot.quantity - (selected.get(lot.id) ?? 0) }));
  return {
    lots,
    movements: [...pantry.movements, { kind, product, quantity, allocations }],
  };
}

export function report(pantry: Pantry): { lots: Lot[]; movements: Movement[]; units: number } {
  const lots = byExpiry(pantry);
  return {
    lots,
    movements: pantry.movements.map(m => ({ ...m, allocations: m.allocations.map(a => ({ ...a })) })),
    units: lots.reduce((sum, lot) => sum + lot.quantity, 0),
  };
}
