## 1. Dependências

- [x] 1.1 Instalar `node-cron` e `@types/node-cron` via pnpm
- [x] 1.2 Instalar `@react-email/render` e `@react-email/components` se ainda não presentes

## 2. Template de E-mail

- [x] 2.1 Criar `src/infra/email/templates/stock-alert.tsx` com componente React Email listando alertas de estoque baixo e validade próxima
- [x] 2.2 Garantir que o template recebe `tenantName`, `lowStockProducts` e `nearExpiryProducts` como props e renderiza seções separadas para cada tipo

## 3. Job de Alertas de Estoque

- [x] 3.1 Criar `src/interfaces/jobs/stock-alerts.job.ts` com função `runStockAlertsJob()` que:
  - Busca todos os tenants com `subscription_status IN ('trial', 'active')` e `active = true`
  - Para cada tenant, chama `getProductAlerts(tenantId)` e filtra se vazio
  - Busca o e-mail do owner via join `tenantMembers` + `user`
  - Renderiza o template e envia via Resend
  - Captura erros por tenant e loga sem interromper os demais
- [x] 3.2 Implementar processamento em chunks (lotes de 10 tenants) com `Promise.all` para evitar sobrecarga

## 4. Scheduler

- [x] 4.1 Criar `src/interfaces/jobs/index.ts` com função `startJobs()` que registra o cron `0 8 * * *` com `timezone: "America/Sao_Paulo"` apontando para `runStockAlertsJob`

## 5. Bootstrap

- [x] 5.1 Verificar se `src/main/index.ts` existe; se não, criá-lo com `buildApp()` + `app.listen()`
- [x] 5.2 Chamar `startJobs()` em `src/main/index.ts` após inicializar o servidor

## 6. Testes

- [x] 6.1 Criar testes unitários para `runStockAlertsJob` cobrindo:
  - Tenant com alertas envia e-mail ao owner
  - Tenant sem alertas não envia e-mail
  - Tenant com `subscription_status = expired` é ignorado
  - Erro de envio de um tenant não interrompe os demais
