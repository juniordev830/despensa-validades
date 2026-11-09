import { emptyPantry, moveStock, registerLot, report, Lot, MovementType } from "./pantry";
import { expiryReport } from "./expiry";
import { restockReport, RestockRule } from "./restock";
import { planConsumption, PlannedDemand } from "./meal-plan";

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

function parseOptions(flags: string[]): { asOf?: string; windowDays?: number; restockPath?: string; planPath?: string } {
  let asOf: string | undefined;
  let windowDays: number | undefined;
  let restockPath: string | undefined;
  let planPath: string | undefined;
  for (const flag of flags) {
    if (flag.startsWith("--as-of=")) {
      if (asOf !== undefined) throw new Error("Opcao --as-of duplicada");
      asOf = flag.slice("--as-of=".length);
    } else if (flag.startsWith("--window=")) {
      if (windowDays !== undefined) throw new Error("Opcao --window duplicada");
      const raw = flag.slice("--window=".length);
      if (!/^\d+$/.test(raw)) throw new Error("Janela precisa ser um inteiro nao negativo");
      windowDays = Number(raw);
    } else if (flag.startsWith("--restock=")) {
      if (restockPath !== undefined) throw new Error("Opcao --restock duplicada");
      restockPath = flag.slice("--restock=".length);
      if (!restockPath.trim()) throw new Error("Arquivo de regras obrigatorio");
    } else if (flag.startsWith("--plan=")) {
      if (planPath !== undefined) throw new Error("Opcao --plan duplicada");
      planPath = flag.slice("--plan=".length);
      if (!planPath.trim()) throw new Error("Arquivo de demandas obrigatorio");
    } else {
      throw new Error("Opcao desconhecida: " + flag);
    }
  }
  if (windowDays !== undefined && asOf === undefined) {
    throw new Error("Informe --as-of junto com --window");
  }
  if (restockPath !== undefined && asOf === undefined) {
    throw new Error("Informe --as-of junto com --restock");
  }
  if (planPath !== undefined && asOf === undefined) {
    throw new Error("Informe --as-of junto com --plan");
  }
  return { asOf, windowDays, restockPath, planPath };
}

try {
  if (process.argv.length < 3 || process.argv.length > 7) {
    throw new Error("Uso: node dist/cli.js examples/scenario.json [--as-of=AAAA-MM-DD] [--window=7] [--restock=REGRAS.json] [--plan=DEMANDAS.json]");
  }
  const { asOf, windowDays, restockPath, planPath } = parseOptions(process.argv.slice(3));
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
    ...(restockPath === undefined ? {} : {
      restock: restockReport(pantry, JSON.parse(fs.readFileSync(restockPath, "utf8")) as RestockRule[], asOf),
    }),
    ...(planPath === undefined ? {} : {
      consumptionPlan: planConsumption(pantry, JSON.parse(fs.readFileSync(planPath, "utf8")) as PlannedDemand[], asOf),
    }),
  };
  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
} catch (error) {
  process.stderr.write("Erro: " + (error instanceof Error ? error.message : String(error)) + "\n");
  process.exitCode = 2;
}
