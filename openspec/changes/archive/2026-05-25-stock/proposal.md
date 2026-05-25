## Why

O endpoint `GET /products/alerts` já expõe produtos com estoque baixo ou validade próxima, mas exige que o usuário consulte ativamente. Petshops precisam ser notificados proativamente via e-mail quando um produto atinge nível crítico de estoque ou está prestes a vencer, para evitar ruptura de estoque e descarte de produtos.

## What Changes

- Implementar cron job que roda diariamente e envia e-mail de alerta para o `owner` de cada tenant com:
  - Produtos com `quantity <= min_quantity` (estoque baixo)
  - Produtos com `expiry_date <= hoje + 30 dias` (próximos da validade)
- Criar template de e-mail React Email para o relatório de alertas de estoque
- Criar estrutura em `src/interfaces/jobs/` com o scheduler de alertas
- Omitir envio se nenhum produto atende aos critérios no dia

## Capabilities

### New Capabilities

- `stock-alert-job`: Cron job diário que verifica alertas de estoque e envia e-mail ao owner do tenant

### Modified Capabilities

- `stock-management`: Nenhuma alteração de requisito; o comportamento de `GET /products/alerts` permanece igual

## Impact

- Novos arquivos em `src/interfaces/jobs/` (scheduler + job)
- Novo template em `src/infra/email/templates/`
- Integração com Resend (já configurado no stack)
- Sem impacto nos endpoints HTTP existentes
- Sem novas tabelas no banco — reusa lógica de `get-product-alerts.use-case.ts`
