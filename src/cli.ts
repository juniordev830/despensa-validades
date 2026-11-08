import { emptyPantry, moveStock, registerLot, report, Lot, MovementType } from "./pantry";
import { expiryReport } from "./expiry";

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

function parseOptions(flags: string[]): { asOf?: string; windowDays?: number } {
  let asOf: string | undefined;
  let windowDays: number | undefined;
  for (const flag of flags) {
    if (flag.startsWith("--as-of=")) {
      if (asOf !== undefined) throw new Error("Opcao --as-of duplicada");
      asOf = flag.slice("--as-of=".length);
    } else if (flag.startsWith("--window=")) {
      if (windowDays !== undefined) throw new Error("Opcao --window duplicada");
      const raw = flag.slice("--window=".length);
      if (!/^\d+$/.test(raw)) throw new Error("Janela precisa ser um inteiro nao negativo");
      windowDays = Number(raw);
    } else {
      throw new Error("Opcao desconhecida: " + flag);
    }
  }
  if (windowDays !== undefined && asOf === undefined) {
    throw new Error("Informe --as-of junto com --window");
  }
  return { asOf, windowDays };
}

try {
  if (process.argv.length < 3 || process.argv.length > 5) {
    throw new Error("Uso: node dist/cli.js examples/scenario.json [--as-of=AAAA-MM-DD] [--window=7]");
  }
  const { asOf, windowDays } = parseOptions(process.argv.slice(3));
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
  const baseReport = report(pantry);
  const output = asOf === undefined ? baseReport : {
    ...baseReport,
    expiry: expiryReport(pantry, asOf, windowDays ?? 7),
  };
  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
} catch (error) {
  process.stderr.write("Erro: " + (error instanceof Error ? error.message : String(error)) + "\n");
  process.exitCode = 2;
}
