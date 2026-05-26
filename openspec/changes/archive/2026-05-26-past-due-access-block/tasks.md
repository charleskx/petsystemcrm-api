## 1. Middleware

- [x] 1.1 Em `src/interfaces/http/middlewares/subscription-guard.ts`, adicionar `"past_due"` na condição de bloqueio: `if (subscriptionStatus === "expired" || subscriptionStatus === "cancelled" || subscriptionStatus === "past_due")`
- [x] 1.2 Atualizar a mensagem de erro para ser genérica e cobrir os três casos: `"Pagamento necessário. Acesse /billing para regularizar sua assinatura."`

## 2. Testes

- [x] 2.1 Em `src/interfaces/http/routes/billing.test.ts` (ou arquivo de teste do subscription-guard), adicionar caso de teste: tenant com `subscription_status = "past_due"` recebe `402` em endpoint operacional (ex: `GET /services`)
- [x] 2.2 Adicionar caso de teste: tenant com `subscription_status = "past_due"` ainda consegue acessar `GET /billing/subscription` com `200`

## 3. Verificação

- [x] 3.1 Rodar `make test` — todos os testes passam
- [x] 3.2 Rodar `make typecheck` — sem erros de TypeScript
