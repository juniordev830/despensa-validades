const test = require("node:test");
const assert = require("node:assert/strict");
const { emptyPantry, registerLot, moveStock } = require("../dist/pantry.js");
const { expiryReport } = require("../dist/expiry.js");

function pantry() {
  let state = emptyPantry();
  for (const lot of [
    { id: "expired", product: "Arroz", expiresOn: "2026-11-07", quantity: 4 },
    { id: "today", product: "Arroz", expiresOn: "2026-11-08", quantity: 3 },
    { id: "soon", product: "Feijao", expiresOn: "2026-11-15", quantity: 2 },
    { id: "future", product: "Feijao", expiresOn: "2026-11-16", quantity: 5 },
  ]) {
    state = registerLot(state, lot);
  }
  return state;
}

test("classifies overdue, today, seventh day and future; counts lots and units", () => {
  const result = expiryReport(pantry(), "2026-11-08");
  assert.deepEqual(result.entries.map(e => [e.id, e.daysUntilExpiry, e.status]), [
    ["expired", -1, "expired"],
    ["today", 0, "due_soon"],
    ["soon", 7, "due_soon"],
    ["future", 8, "fresh"],
  ]);
  assert.deepEqual(result.lotsByStatus, { expired: 1, due_soon: 2, fresh: 1 });
  assert.deepEqual(result.unitsByStatus, { expired: 4, due_soon: 5, fresh: 5 });
});

test("excludes depleted lots and does not change original state", () => {
  const original = pantry();
  const reduced = moveStock(original, "Arroz", 4, "discarded");
  const report = expiryReport(reduced, "2026-11-08");
  assert.equal(report.lotsByStatus.expired, 0);
  assert.equal(report.lotsByStatus.due_soon, 2);
  assert.equal(expiryReport(original, "2026-11-08").lotsByStatus.expired, 1);
});

test("zero-day window means only today's expiration is due soon", () => {
  const result = expiryReport(pantry(), "2026-11-08", 0);
  assert.equal(result.lotsByStatus.due_soon, 1);
  assert.equal(result.lotsByStatus.fresh, 2);
});

test("calendar and leap-day boundaries are independent of local timezone", () => {
  let state = registerLot(emptyPantry(), {
    id: "leap", product: "Produto", expiresOn: "2028-02-29", quantity: 1,
  });
  assert.equal(expiryReport(state, "2028-02-28", 1).entries[0].daysUntilExpiry, 1);
  assert.equal(expiryReport(state, "2028-03-01").entries[0].daysUntilExpiry, -1);
});

test("rejects invalid calendar dates and out-of-range windows", () => {
  const data = pantry();
  for (const badDate of ["2026-02-30", "2026-13-01", "08/11/2026"]) {
    assert.throws(() => expiryReport(data, badDate), /Data/);
  }
  for (const badWindow of [-1, 1.5, Infinity, 3651]) {
    assert.throws(() => expiryReport(data, "2026-11-08", badWindow), /Janela/);
  }
});
