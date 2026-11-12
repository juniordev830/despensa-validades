# Despensa e Validades: guia técnico

## Escopo real

CLI TypeScript de lotes de alimento com consumo FEFO e geração de relatórios de estoque.

## Arquivos relacionados

`src/expiry.ts`, `src/pantry.ts`, `src/meal-plan.ts`, `src/restock.ts`, `src/cli.ts` e exemplos.

## Procedimento de validação

`npm install`, `npm test` e `node dist/cli.js examples/scenario.json`.

Se algo não puder ser executado, registrar como pendente, sem afirmar sucesso. Preservar resultados reais de CI vinculados aos commits relevantes.

## Casos para revisão

Testar duas validades iguais, consumo maior que saldo, lote já vencido, quantidade inválida e imutabilidade dos resultados.

## Próxima evolução

Antes de alertas automáticos, documentar política de data local/fuso e como registrar descarte sem duplicação.

## Para submeter uma mudança

- [ ] Especificar problema e comportamento esperado.
- [ ] Anexar evidência de teste ou reprodução real.
- [ ] Revisar acessibilidade, privacidade e licenças quando aplicável.
- [ ] Submeter em branch separada e revisar antes de merge.
