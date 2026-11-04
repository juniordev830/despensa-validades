# Despensa e Validades

> Status: concepção. Este repositório contém apenas o escopo inicial; ainda não há aplicação executável ou funcionalidades implementadas.

## Ideia

Organizar alimentos por lote e validade para reduzir desperdício doméstico.

## Primeira versão planejada

- [ ] Cadastrar produto, quantidade e data de validade.
- [ ] Listar itens que vencem primeiro.
- [ ] Marcar consumo ou descarte.

## Modelo inicial

Produto, lote e movimentação.

## Regras e limites

Só aceitar quantidade positiva e datas válidas; consumo não pode deixar estoque negativo.

Escopo mantido pequeno: sem pagamentos, integrações externas, infraestrutura de produção ou uso de dados pessoais reais nesta etapa.

## Tecnologia proposta

TypeScript + React + IndexedDB.

A escolha é uma proposta para a futura implementação; nenhuma dependência foi instalada e a tecnologia ainda não foi implementada.

## Critério de conclusão do primeiro incremento

Cadastrar dois lotes e consumir um deve atualizar o saldo e manter a ordenação por validade.

## Próximos passos

1. Revisar este escopo antes de começar a implementação.
2. Preparar o ambiente mínimo da tecnologia escolhida.
3. Implementar um fluxo completo e validar o critério acima.
4. Documentar a execução e acrescentar exemplos demonstrativos.

## Possíveis evoluções

Depois de validar o fluxo principal, avaliar persistência, acessibilidade e uma interface mais completa conforme a plataforma. Evoluções não fazem parte da entrega atual.

## Como executar

Ainda não há comandos de execução. Eles serão adicionados quando existir uma primeira versão funcional.
