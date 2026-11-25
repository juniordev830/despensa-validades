const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const cli = path.join(__dirname, "../dist/cli.js");

function run(file, ...flags) {
  return spawnSync(process.execPath, [cli, file, ...flags], { encoding: "utf8", timeout: 10000 });
}

test("CLI exposes product risk with expiry window and preserves legacy output", t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pantry-cli-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "scenario.json");
  fs.writeFileSync(file, JSON.stringify({ lots: [
    { id: "a", product: "Arroz", expiresOn: "2026-11-07", quantity: 2 },
    { id: "b", product: "Arroz", expiresOn: "2026-11-09", quantity: 3 }
  ], movements: [] }));
  const legacy = run(file);
  assert.equal(legacy.status, 0, legacy.stderr);
  assert.equal(JSON.parse(legacy.stdout).productRisk, undefined);
  const result = run(file, "--as-of=2026-11-08", "--window=1");
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.equal(data.productRisk.totalAtRiskUnits, 5);
  assert.deepEqual(data.productRisk.products, [
    { product: "Arroz", expiredUnits: 2, expiringUnits: 3, freshUnits: 0, totalUnits: 5 }
  ]);
});

test("CLI rejects oversized JSON, invalid UTF-8 and directories", t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pantry-input-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "large.json");
  fs.writeFileSync(file, Buffer.alloc(5 * 1024 * 1024 + 1, 32));
  const oversized = run(file);
  assert.equal(oversized.status, 2);
  assert.match(oversized.stderr, /5 MiB/);
  assert.equal(oversized.stdout, "");
  fs.writeFileSync(file, Buffer.from([0xc3, 0x28]));
  const invalid = run(file);
  assert.equal(invalid.status, 2);
  assert.equal(invalid.stdout, "");
  const directory = run(dir);
  assert.equal(directory.status, 2);
  assert.equal(directory.stdout, "");
});
