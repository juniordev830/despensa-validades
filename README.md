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
