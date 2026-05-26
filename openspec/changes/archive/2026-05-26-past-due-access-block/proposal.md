## Why

`subscription_status = "past_due"` significa que o pagamento mais recente falhou mas o Stripe ainda está tentando recobrar automaticamente. Atualmente o `subscription-guard` bloqueia apenas `expired` e `cancelled`, deixando `past_due` com acesso irrestrito. O comportamento correto é idêntico ao `expired`: o usuário deve conseguir apenas acessar `/billing/*` para regularizar o pagamento — qualquer outro endpoint operacional deve retornar `402 Payment Required`.

## What Changes

- Adicionar `"past_due"` na condição de bloqueio do `subscription-guard.ts` ao lado de `"expired"` e `"cancelled"`
- Atualizar a mensagem de erro para ser adequada ao contexto de pagamento atrasado (vs. assinatura expirada)

## Capabilities

### New Capabilities

(nenhuma)

### Modified Capabilities

- `subscription-guard`: `past_due` passa a ser tratado igual a `expired` — bloqueia todos os endpoints com `402` exceto `/billing/*`

## Impact

- Arquivo modificado: `src/interfaces/http/middlewares/subscription-guard.ts` (1 linha)
- Nenhuma mudança de schema, dependências ou contratos de API
- Testes de billing já cobrem o comportamento de `expired`; será necessário adicionar caso de teste para `past_due`
