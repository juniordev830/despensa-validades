# Despensa e Validades — primeira versão web

Aplicação **React + TypeScript + IndexedDB** para organizar lotes de alimentos com persistência local no navegador.

## Entregue
- Cadastro de produtos, quantidade inteira positiva e data de validade válida.
- Listagem ordenada por data de vencimento.
- Consumo de uma unidade por vez e descarte do lote completo.
- Atualização do saldo sem permitir estoque negativo.
- Persistência via IndexedDB, sem conta, servidor ou coleta de dados.

## Executar
Requer Node.js 22+:
```bash
npm install
npm run dev
```
Abra a URL exibida pelo Vite. Para compilar: `npm run build`. Para testar as regras de negócio: `npm test`.

## Critério de aceite
Cadastrar lotes de arroz e feijão com validades diferentes, consumir uma unidade e conferir o novo saldo e a ordem crescente de vencimento.

## Limites
Uso local no navegador (não sincroniza entre dispositivos). Sem alerta por push, lotes com unidade de medida diferente, usuários, login ou backups. O GitHub Actions executa os testes e build; confirme o resultado do workflow após abrir o PR.
