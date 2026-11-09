const test = require("node:test");
const assert = require("node:assert/strict");
const { planConsumption } = require("../dist/meal-plan.js");

function sample() {
  return { lots: [
    { id: "rice-later", product: "Arroz", expiresOn: "2026-12-10", quantity: 5 },
    { id: "rice-first", product: "Arroz", expiresOn: "2026-11-10", quantity: 4 },
    { id: "beans", product: "Feijao", expiresOn: "2026-12-10", quantity: 3 },
    { id: "expired", product: "Arroz", expiresOn: "2026-11-01", quantity: 7 },
  ], movements: [] };
}

test("allocates first-expiring stock, skips expired lots, and preserves source", () => {
  const pantry = sample();
  const before = JSON.stringify(pantry);
  const result = planConsumption(pantry, [
    { product: "Arroz", date: "2026-11-08", units: 6 },
    { product: "Feijao", date: "2026-11-08", units: 2 },
  ], "2026-11-08");
  assert.deepEqual(result.demands[0].allocations, [
    { lotId: "rice-first", units: 4 },
    { lotId: "rice-later", units: 2 },
  ]);
  assert.equal(result.totalRequested, 8);
  assert.equal(result.totalAllocated, 8);
  assert.equal(result.totalMissing, 0);
  assert.equal(result.remainingLots[0].quantity, 3);
  assert.equal(result.remainingLots[1].quantity, 0);
  assert.equal(result.remainingLots[3].quantity, 7);
  assert.equal(JSON.stringify(pantry), before);
});

test("sorts demands by date while preserving input order on same day", () => {
  const result = planConsumption(sample(), [
    { product: "Arroz", date: "2026-11-12", units: 4 },
    { product: "Arroz", date: "2026-11-10", units: 2 },
    { product: "Arroz", date: "2026-11-10", units: 3 },
  ], "2026-11-08");
  assert.deepEqual(result.demands.map(d => d.date), ["2026-11-10", "2026-11-10", "2026-11-12"]);
  assert.deepEqual(result.demands.map(d => d.allocated), [2, 3, 4]);
  assert.equal(result.demands[1].allocations[0].lotId, "rice-first");
  assert.equal(result.demands[2].allocations[0].lotId, "rice-later");
});

test("lots expiring on demand day are usable, but not the following day", () => {
  const pantry = { lots: [{ id:"today", product:"Leite", expiresOn:"2026-11-08", quantity:2 }], movements:[] };
  const today = planConsumption(pantry, [{ product:"Leite", date:"2026-11-08", units:1 }], "2026-11-08");
  assert.equal(today.totalAllocated, 1);
  const tomorrow = planConsumption(pantry, [{ product:"Leite", date:"2026-11-09", units:1 }], "2026-11-08");
  assert.equal(tomorrow.totalAllocated, 0);
  assert.equal(tomorrow.totalMissing, 1);
});

test("shortages are reported without negative stock", () => {
  const result = planConsumption(sample(), [
    { product:"Arroz", date:"2026-11-08", units:10 },
    { product:"Arroz", date:"2026-11-09", units:1 },
    { product:"Outro", date:"2026-11-08", units:2 },
  ], "2026-11-08");
  assert.equal(result.totalRequested, 13);
  assert.equal(result.totalAllocated, 9);
  assert.equal(result.totalMissing, 4);
  assert.deepEqual(result.demands.map(d => d.missing), [1, 2, 1]);
  assert.ok(result.remainingLots.every(lot => lot.quantity >= 0));
});

test("accepts empty plan and empty pantry", () => {
  assert.deepEqual(planConsumption({ lots:[], movements:[] }, [], "2026-11-08"), {
    asOf:"2026-11-08", demands:[], totalRequested:0,
    totalAllocated:0, totalMissing:0, remainingLots:[],
  });
});

test("rejects invalid calendar dates and past demand dates", () => {
  const valid = { product:"Arroz", date:"2026-11-08", units:1 };
  for (const date of ["2026-02-30", "2026-13-01", "08/11/2026", "2026-11-07", ""]) {
    assert.throws(() => planConsumption(sample(), [{...valid, date}], "2026-11-08"), /Data|anterior/);
  }
  assert.throws(() => planConsumption(sample(), [valid], "2026-02-30"), /Data/);
});

test("rejects invalid units, names and list sizes", () => {
  const valid = { product:"Arroz", date:"2026-11-08", units:1 };
  for (const units of [0, -1, 1.5, Infinity, NaN, 1_000_001]) {
    assert.throws(() => planConsumption(sample(), [{...valid, units}], "2026-11-08"), /Demanda/);
  }
  for (const product of ["", "  ", "x".repeat(121), null]) {
    assert.throws(() => planConsumption(sample(), [{...valid, product}], "2026-11-08"), /Demanda/);
  }
  assert.throws(() => planConsumption(sample(), null, "2026-11-08"), /Plano/);
  assert.throws(() => planConsumption(sample(), Array(1001).fill(valid), "2026-11-08"), /Plano/);
});

test("rejects invalid inventory and never mutates malformed data", () => {
  const valid = { product:"Arroz", date:"2026-11-08", units:1 };
  assert.throws(() => planConsumption(null, [valid], "2026-11-08"), /Estoque/);
  for (const quantity of [-1, 1.2, 1_000_001, NaN]) {
    const pantry = sample(); pantry.lots[0].quantity = quantity;
    assert.throws(() => planConsumption(pantry, [valid], "2026-11-08"), /Lote/);
  }
  const invalid = sample(); invalid.lots[0].expiresOn = "2026-02-30";
  assert.throws(() => planConsumption(invalid, [valid], "2026-11-08"), /Data/);
});

test("bounded planning with 1000 independent demands", () => {
  const demands = Array.from({length:1000}, () => ({
    product:"Arroz", date:"2026-11-08", units:1,
  }));
  const result = planConsumption(sample(), demands, "2026-11-08");
  assert.equal(result.demands.length, 1000);
  assert.equal(result.totalAllocated, 9);
  assert.equal(result.totalMissing, 991);
  assert.equal(result.demands.filter(d => d.allocated === 0).length, 991);
});

test("CLI exposes the consumption plan and requires a reference date", () => {
  const { spawnSync } = require("node:child_process");
  const args = ["dist/cli.js", "examples/scenario.json",
    "--as-of=2026-11-08", "--plan=examples/consumption-demands.json"];
  const result = spawnSync(process.execPath, args, { encoding:"utf8" });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.consumptionPlan.asOf, "2026-11-08");
  assert.equal(parsed.consumptionPlan.demands.length, 3);
  assert.ok(parsed.consumptionPlan.totalRequested >= parsed.consumptionPlan.totalAllocated);
  const missingDate = spawnSync(process.execPath,
    ["dist/cli.js", "examples/scenario.json", "--plan=examples/consumption-demands.json"],
    { encoding:"utf8" });
  assert.equal(missingDate.status, 2);
  assert.match(missingDate.stderr, /--as-of/);
});
