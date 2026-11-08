const test = require("node:test");
const assert = require("node:assert/strict");
const { emptyPantry, registerLot, moveStock, byExpiry, report } = require("../dist/pantry.js");

const seed = () => {
  let p = emptyPantry();
  p = registerLot(p, { id: "later", product: "Arroz", expiresOn: "2027-04-01", quantity: 5 });
  p = registerLot(p, { id: "earlier", product: "Arroz", expiresOn: "2026-12-01", quantity: 3 });
  return p;
};

test("register two lots, consume earliest first, preserve ordering and history", () => {
  const original = seed();
  assert.deepEqual(byExpiry(original).map(l => l.id), ["earlier", "later"]);
  const changed = moveStock(original, "Arroz", 4, "consumed");
  assert.deepEqual(byExpiry(changed).map(l => [l.id, l.quantity]), [["later", 4]]);
  assert.equal(changed.lots.find(l => l.id === "earlier").quantity, 0);
  assert.deepEqual(changed.movements[0].allocations, [
    { lotId: "earlier", quantity: 3 },
    { lotId: "later", quantity: 1 },
  ]);
  assert.equal(report(changed).units, 4);
  assert.equal(report(original).units, 8);
});

test("insufficient stock does not corrupt original state", () => {
  const original = seed();
  assert.throws(() => moveStock(original, "Arroz", 9, "consumed"), /insuficiente/);
  assert.equal(report(original).units, 8);
});

test("discard has explicit movement type, no negative stock", () => {
  const next = moveStock(seed(), "Arroz", 8, "discarded");
  assert.equal(report(next).units, 0);
  assert.equal(next.movements[0].kind, "discarded");
  assert.throws(() => moveStock(next, "Arroz", 1, "consumed"), /insuficiente/);
});

test("reject duplicate lot, bad date, and non-positive or fractional quantity", () => {
  const p = seed();
  assert.throws(() => registerLot(p, {
    id: "earlier", product: "Outro", expiresOn: "2026-12-01", quantity: 3
  }), /duplicado/);
  assert.throws(() => registerLot(p, {
    id: "date", product: "Outro", expiresOn: "2026-02-30", quantity: 3
  }), /Validade/);
  assert.throws(() => moveStock(p, "Arroz", 0, "consumed"), /Quantidade/);
  assert.throws(() => moveStock(p, "Arroz", 1.5, "consumed"), /Quantidade/);
});

test("same-expiry tie breaker is deterministic", () => {
  let p = emptyPantry();
  p = registerLot(p, { id: "z", product: "Feijao", expiresOn: "2026-12-01", quantity: 2 });
  p = registerLot(p, { id: "a", product: "Feijao", expiresOn: "2026-12-01", quantity: 2 });
  assert.equal(moveStock(p, "Feijao", 1, "consumed").movements[0].allocations[0].lotId, "a");
});
