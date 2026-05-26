## 1. Use Case

- [x] 1.1 Criar `src/application/dashboard/get-dashboard.use-case.ts` com a função `getDashboard({ tenantId, plan, subscriptionStatus })`
- [x] 1.2 Implementar query da seção `today`: contagem de `appointments` com `status = "scheduled"` e `"completed"` + soma de `total_amount` dos `completed` com `scheduled_at` dentro do dia atual (UTC)
- [x] 1.3 Implementar query da seção `subscription`: carregar `plan`, `subscriptionStatus` e `trialEndsAt` do tenant
- [x] 1.4 Adicionar guard de modo degradado: se `subscriptionStatus === "expired" || "cancelled"`, retornar apenas `subscription` + `today` com as demais seções como `null`
- [x] 1.5 Implementar query de `thisMonth`: contagem e soma de agendamentos `completed` no mês corrente + contagem de clientes criados no mês
- [x] 1.6 Implementar query de `totals`: `COUNT(clients)`, `COUNT(pets)`, `COUNT(products WHERE active = true)`
- [x] 1.7 Implementar query de `upcomingAppointments`: próximos 5 `scheduled` com `scheduled_at >= NOW()`, JOIN com `clients`, `pets` e `appointment_services` + `services` para montar a lista de nomes
- [x] 1.8 Implementar query de `productAlerts`: reusar a lógica de `getProductAlerts` — separar em `lowStock` (max 10) e `nearExpiry` (max 10)
- [x] 1.9 Implementar query de `revenueChart`: `GROUP BY DATE(scheduled_at)` nos últimos 30 dias para `appointments completed`, resultado como array `{ date, appointmentRevenue }`
- [x] 1.10 Implementar queries premium (`plan === "premium"`): `salesThisMonth` (count + revenue + byChannel de vendas `paid` do mês) e enriquecimento do `revenueChart` com `salesRevenue` por dia
- [x] 1.11 Executar todas as queries em paralelo com `Promise.all` agrupadas por dependência

## 2. Rota HTTP

- [x] 2.1 Criar `src/interfaces/http/routes/dashboard.ts` com `GET /dashboard`, `preHandler: authenticate`
- [x] 2.2 Chamar `getDashboard` passando `request.tenantId`, `plan` e `subscriptionStatus` do tenant (carregar tenant no handler ou no use case)
- [x] 2.3 Adicionar schema Fastify: tag `Dashboard`, summary, security, response 200 com shape completo (campos nullable documentados)
- [x] 2.4 Registrar `dashboardRoutes` em `src/main/server.ts`

## 3. Subscription Guard

- [x] 3.1 Adicionar `/dashboard` na lista de exceções do `subscription-guard` — o guard deve pular a verificação quando `request.url` começa com `/dashboard`

## 4. Testes

- [x] 4.1 Criar `src/interfaces/http/routes/dashboard.test.ts` com setup de tenant + dados de teste
- [x] 4.2 Testar `GET /dashboard` com plano essential ativo: verificar `today`, `thisMonth`, `totals`, `upcomingAppointments`, `productAlerts`, `revenueChart` presentes e `salesThisMonth === null`
- [x] 4.3 Testar `GET /dashboard` com plano premium ativo: verificar `salesThisMonth` presente com `count`, `revenue` e `byChannel`
- [x] 4.4 Testar modo degradado: tenant com `subscription_status = "expired"` recebe `200` com `thisMonth === null`, `totals === null` etc.
- [x] 4.5 Testar tenant `past_due`: recebe resposta completa (não degradada)
- [x] 4.6 Testar `GET /dashboard` sem autenticação: retorna `401`
- [x] 4.7 Testar isolamento: métricas de um tenant não aparecem na resposta de outro

## 5. Verificação

- [x] 5.1 Rodar `make test` — todos os testes passam
- [x] 5.2 Rodar `make typecheck` — sem erros de TypeScript
- [ ] 5.3 Verificar `/documentation` — endpoint `/dashboard` aparece documentado com schema completo
