## ADDED Requirements

### Requirement: Débito automático de estoque por venda
O sistema SHALL registrar automaticamente uma `StockMovement` de tipo `out` para cada item de uma venda no momento em que a venda é criada, vinculando o `referenceId` ao `id` da venda. O débito deve ocorrer dentro da mesma transação que persiste a venda.

#### Scenario: Estoque debitado na criação de venda
- **WHEN** `POST /sales` cria uma venda com sucesso
- **THEN** para cada `SaleItem`, o sistema cria um registro em `stock_movements` com `type = out`, `quantity` igual à quantidade do item, `reason = "Venda"` e `referenceId` igual ao `id` da venda, e decrementa `product.quantity` de forma atômica

#### Scenario: Falha em um item reverte tudo
- **WHEN** `POST /sales` falha por estoque insuficiente em qualquer item
- **THEN** nenhum registro de `stock_movements` é criado e nenhum `product.quantity` é alterado

#### Scenario: Cancelamento de venda não reverte estoque
- **WHEN** `PATCH /sales/:id/status` atualiza o status para `cancelled`
- **THEN** o sistema NÃO cria movimentação de estoque de devolução (comportamento v1 conhecido)
