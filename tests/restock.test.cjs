const test = require("node:test");
const assert = require("node:assert/strict");
const { emptyPantry, registerLot, moveStock } = require("../dist/pantry.js");
const { restockReport } = require("../dist/restock.js");

function seed() {
  let state = emptyPantry();
  for (const lot of [
    { id: "expired", product: "Arroz", expiresOn: "2026-11-07", quantity: 8 },
    { id: "today", product: "Arroz", expiresOn: "2026-11-08", quantity: 2 },
    { id: "future", product: "Arroz", expiresOn: "2026-12-01", quantity: 2 },
    { id: "beans", product: "Feijao", expiresOn: "2026-12-01", quantity: 5 },
  ]) state = registerLot(state, lot);
  return state;
}

test("restocks below minimum, ignores expired lots, respects today and sorts", () => {
  const state = seed();
  const result = restockReport(state, [
    { product: "Feijao", minimumUnits: 5, targetUnits: 10 },
    { product: " Arroz ", minimumUnits: 5, targetUnits: 10 },
  ], "2026-11-08");
  assert.deepEqual(result.suggestions.map(row => [row.product, row.usableUnits,
    row.expiredUnits, row.orderUnits]), [
    ["Arroz", 4, 8, 6],
    ["Feijao", 5, 0, 0],
  ]);
  assert.equal(result.totalOrderUnits, 6);
  assert.equal(state.lots.find(lot => lot.id === "expired").quantity, 8);
});

test("empty or depleted stock is handled without mutations", () => {
  const original = seed();
  const reduced = moveStock(original, "Feijao", 5, "consumed");
  const report = restockReport(reduced,
    [{ product: "Feijao", minimumUnits: 2, targetUnits: 6 },
     { product: "Outro", minimumUnits: 1, targetUnits: 3 }], "2026-11-08");
  assert.deepEqual(report.suggestions.map(row => row.orderUnits), [6, 3]);
  assert.equal(report.totalOrderUnits, 9);
  assert.equal(original.lots.find(lot => lot.id === "beans").quantity, 5);
});

test("rejects duplicated rules and invalid thresholds", () => {
  const state = seed();
  const run = (rules, day = "2026-11-08") => restockReport(state, rules, day);
  assert.throws(() => run([{ product: "Arroz", minimumUnits: 2, targetUnits: 4 },
                           { product: " Arroz ", minimumUnits: 1, targetUnits: 5 }]), /duplicada/);
  for (const [minimumUnits, targetUnits] of [[-1, 5], [3, 2], [1.5, 5],
                                               [1, 1000001], [0, 0]]) {
    assert.throws(() => run([{ product: "Arroz", minimumUnits, targetUnits }]), /inteiros/);
  }
  assert.throws(() => run([], "2026-02-30"), /Data/);
  assert.throws(() => run(null), /lista/);
});

test("does not order when minimum is zero, even with no inventory", () => {
  const result = restockReport(emptyPantry(),
    [{ product: "Leite", minimumUnits: 0, targetUnits: 10 }], "2026-11-08");
  assert.equal(result.totalOrderUnits, 0);
});

test("CLI prints optional reorder report and requires an explicit date", () => {
  const { spawnSync } = require("node:child_process");
  const args = ["dist/cli.js", "examples/scenario.json",
    "--as-of=2026-11-08", "--restock=examples/restock-rules.json"];
  const ok = spawnSync(process.execPath, args, { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  const parsed = JSON.parse(ok.stdout);
  assert.equal(parsed.restock.asOf, "2026-11-08");
  assert.ok(parsed.restock.suggestions.some(item => item.product === "Arroz"));

  const bad = spawnSync(process.execPath, [args[0], args[1], args[3]],
    { encoding: "utf8" });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /--as-of/);
});
