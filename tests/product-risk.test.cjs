const test = require("node:test");
const assert = require("node:assert/strict");
const { emptyPantry, registerLot } = require("../dist/pantry.js");
const { productExpiryRiskReport } = require("../dist/product-risk.js");

function seed() {
  let state = emptyPantry();
  for (const lot of [
    { id: "a-old", product: "Arroz", expiresOn: "2026-11-07", quantity: 5 },
    { id: "a-soon", product: "Arroz", expiresOn: "2026-11-10", quantity: 3 },
    { id: "a-fresh", product: "Arroz", expiresOn: "2026-12-01", quantity: 7 },
    { id: "f-soon", product: "Feijao", expiresOn: "2026-11-09", quantity: 2 },
    { id: "f-depleted", product: "Feijao", expiresOn: "2026-11-08", quantity: 1 },
  ]) state = registerLot(state, lot);
  // A depleted lot should never be counted.
  state = { ...state, lots: state.lots.map(lot =>
    lot.id === "f-depleted" ? { ...lot, quantity: 0 } : lot) };
  return state;
}

test("aggregates expired, expiring and fresh units for each product", () => {
  const pantry = seed();
  const snapshot = structuredClone(pantry);
  const result = productExpiryRiskReport(pantry, "2026-11-08", 3);
  assert.equal(result.totalAtRiskUnits, 10);
  assert.deepEqual(result.products, [
    { product: "Arroz", expiredUnits: 5, expiringUnits: 3,
      freshUnits: 7, totalUnits: 15 },
    { product: "Feijao", expiredUnits: 0, expiringUnits: 2,
      freshUnits: 0, totalUnits: 2 },
  ]);
  assert.deepEqual(pantry, snapshot);
});

test("zero-day window counts only today's expiry as imminent", () => {
  const p = seed();
  const r = productExpiryRiskReport(p, "2026-11-09", 0);
  assert.deepEqual(r.products.map(x => [x.product, x.expiredUnits, x.expiringUnits]),
    [["Arroz", 5, 0], ["Feijao", 0, 2]]);
});

test("rejects invalid dates and window sizes", () => {
  assert.throws(() => productExpiryRiskReport(emptyPantry(), "2026-02-30"), /Data/);
  for (const n of [-1, 1.5, 3651, Infinity]) {
    assert.throws(() => productExpiryRiskReport(emptyPantry(), "2026-11-08", n), /Janela/);
  }
});

test("does not include empty lots and returns a stable empty result", () => {
  assert.deepEqual(productExpiryRiskReport(emptyPantry(), "2026-11-08"), {
    asOf: "2026-11-08", windowDays: 7, products: [], totalAtRiskUnits: 0
  });
});
