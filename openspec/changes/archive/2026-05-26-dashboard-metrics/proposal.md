## Why

O frontend precisa de um único endpoint que entregue todos os dados necessários para montar a dashboard do tenant: KPIs de hoje, receita do mês, agendamentos próximos, alertas de estoque e gráficos de evolução. Sem ele, a dashboard precisaria fazer 6–8 chamadas separadas e cruzar os dados no cliente, com risco de inconsistência e lentidão.

O endpoint deve respeitar o plano do tenant (essential x premium) retornando apenas as métricas disponíveis no plano contratado. Deve também estar acessível mesmo com assinatura expirada/vencida — o tenant precisa ver o estado do negócio para entender o valor do sistema e retomar a assinatura.

## What Changes

- Novo endpoint `GET /dashboard` acessível a qualquer usuário autenticado, independentemente do status da assinatura
- Resposta estruturada em seções; seções premium (vendas, receita combinada) são omitidas no plano essential
- Quando a assinatura está bloqueada (`expired`, `cancelled`, `past_due`), retorna apenas um subconjunto mínimo de métricas (sem gráficos) acompanhado do status da assinatura, suficiente para mostrar um resumo motivacional e o banner de reativação
- Nenhuma rota existente alterada

## Capabilities

### New Capabilities

- `dashboard-metrics`: endpoint único `GET /dashboard` que agrega métricas, KPIs, alertas e dados de gráfico respeitando plano e status de assinatura

### Modified Capabilities

(nenhuma)

## Impact

- Novo arquivo de rota: `src/interfaces/http/routes/dashboard.ts`
- Novo use case: `src/application/dashboard/get-dashboard.use-case.ts`
- Registrar rota em `src/main/server.ts`
- Excluir `/dashboard` da proteção do `subscription-guard` (acessível mesmo expirado)
- Nenhuma migration de banco necessária — apenas queries de leitura
