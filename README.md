# Despensa e Validades

MVP em **TypeScript** para controlar lotes de alimentos e evitar desperdício, priorizando os itens com vencimento mais próximo (FEFO).

## Funcionalidades implementadas

- Cadastro validado de lotes com produto, quantidade inteira e validade ISO.
- Ordenação por data de vencimento e ID para desempate.
- Consumo e descarte de estoque por produto, sem permitir saldo negativo.
- Retirada automática dos lotes que vencem primeiro; movimentações mantêm os IDs e quantidades atendidos.
- Estado imutável e relatório em JSON para inspeção e futura interface.

## Executar

Instale Node.js 22+ e execute os comandos a partir da raiz:

```bash
npm install
npm test
node dist/cli.js examples/scenario.json
```

O arquivo `examples/scenario.json` cadastra dois lotes de arroz e um de feijão; depois consome quatro unidades de arroz e descarta uma de feijão. O relatório mostra que o lote mais próximo do vencimento é consumido primeiro.

## Testes

`npm test` compila o TypeScript e roda testes automatizados cobrindo ordem FEFO, empate, imutabilidade, histórico, datas inválidas, duplicidade, consumo e descarte.

## Limitações

Este primeiro incremento é **biblioteca de domínio com CLI de demonstração**. Ainda não há frontend React, IndexedDB, registro persistente de dados reais nem autenticação. Não utilizar informações pessoais nos exemplos. Quantidades representam unidades inteiras; pesagem fracionada requer nova modelagem e testes.


## Alertas de vencimento

O relatório opcional classifica os lotes ainda disponíveis como \`expired\` (validade anterior à data), \`due_soon\` (vence hoje ou dentro da janela) e \`fresh\` (fora da janela), com totais de lotes e unidades por categoria.

```bash
node dist/cli.js examples/scenario.json --as-of=2026-11-08
node dist/cli.js examples/scenario.json --as-of=2026-11-08 --window=14
```

As datas são comparadas como dias civis em UTC, sem depender do fuso horário da máquina. A janela é um inteiro de 0 a 3650 dias. Os relatórios não substituem a inspeção física dos alimentos nem determinam se um produto está próprio para consumo.

## Planejamento de reposicao por estoque util

O comando pode sugerir quanto comprar por produto a partir de um estoque minimo e de um objetivo definido manualmente. Lotes vencidos ou zerados **nao contam** como estoque disponivel; produtos que vencem exatamente na data da consulta ainda contam.

```bash
npm test
node dist/cli.js examples/scenario.json --as-of=2026-11-08 --restock=examples/restock-rules.json
```

O arquivo de regras e uma lista JSON com `product`, `minimumUnits` e `targetUnits`. Se o estoque utilizavel ficar abaixo do minimo, o relatorio `restock` calcula a quantidade necessaria para chegar ao alvo, sem modificar lotes. Nao ha compras automatizadas, consulta a precos ou garantia de qualidade dos alimentos. Os testes automatizados cobrem expiracao, limiares, dados invalidos e imutabilidade.


## Simulacao de consumo por data (FEFO)

O planejador `planConsumption(pantry, demands, asOf)` projeta o uso futuro de
estoque, priorizando os lotes que vencem primeiro (*first expiring, first out*).
Lotes vencidos antes da data da demanda nao sao utilizados; lotes que vencem
na propria data ainda podem ser consumidos. Demandas fora de ordem sao
organizadas cronologicamente, preservando a ordem de entrada no mesmo dia.

```bash
npm test
node dist/cli.js examples/scenario.json --as-of=2026-11-08 \
  --plan=examples/consumption-demands.json
```

O JSON de demandas contem objetos `{"product":"Arroz","date":"2026-11-09","units":3}`.
O relatorio `consumptionPlan` informa alocacoes por lote, demanda atendida,
faltas e saldos simulados. O estoque original permanece intacto. O limite
e de 1.000 demandas por execucao e 1.000.000 de unidades por demanda.

**Importante:** trata-se de uma projecao local, sem reserva real de estoque,
sem compras automaticas e sem previsao de demanda. A simulacao considera
quantidades e datas explicitamente informadas; nao substitui controles de
seguranca alimentar nem validacao operacional.

## Risco de vencimento por produto

A função pura `productExpiryRiskReport(pantry, asOf, windowDays)`, em `src/product-risk.ts`, agrupa quantidades de lotes **vencidos, vencendo na janela e ainda frescos** por nome de produto. O relatório ordena os produtos pelo volume vencido ou próximo do vencimento, apresenta `totalAtRiskUnits` e não modifica o estoque. O prazo padrão é de sete dias, com limite de 3650. Este é um sinal de priorização de estoque: não determina se alimentos podem ser consumidos.

## Documentação de desenvolvimento

O [guia de validação e evolução](docs/GUIA_DE_VALIDACAO.md) registra o estado atual, os testes e os próximos incrementos deste projeto.
