import { emptyPantry, moveStock, registerLot, report, Lot, MovementType } from "./pantry";

declare const require: (name: string) => any;
declare const process: {
  argv: string[];
  stdout: { write(value: string): void };
  stderr: { write(value: string): void };
  exitCode: number;
};
const fs = require("node:fs");

interface Scenario {
  lots: Lot[];
  movements: { product: string; quantity: number; kind: MovementType }[];
}

try {
  if (process.argv.length !== 3) throw new Error("Uso: node dist/cli.js examples/scenario.json");
  const raw: unknown = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Cenario invalido");
  const scenario = raw as Scenario;
  if (!Array.isArray(scenario.lots) || !Array.isArray(scenario.movements)) {
    throw new Error("Esperados lotes e movimentos em listas");
  }
  let pantry = emptyPantry();
  for (const lot of scenario.lots) pantry = registerLot(pantry, lot);
  for (const item of scenario.movements) {
    pantry = moveStock(pantry, item.product, item.quantity, item.kind);
  }
  process.stdout.write(JSON.stringify(report(pantry), null, 2) + "\n");
} catch (error) {
  process.stderr.write("Erro: " + (error instanceof Error ? error.message : String(error)) + "\n");
  process.exitCode = 2;
}
