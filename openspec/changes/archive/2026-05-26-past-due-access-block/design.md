## Context

O `subscription-guard.ts` atual bloqueia com `402` apenas quando:

```typescript
if (subscriptionStatus === "expired" || subscriptionStatus === "cancelled") {
  reply.status(402).send({ error: "Pagamento necessário..." })
}
```

`past_due` não está nessa condição. A correção é de uma linha.

O Stripe envia `past_due` quando uma cobrança recorrente falha (cartão recusado, saldo insuficiente, etc.) e há tentativas automáticas de recobrança em andamento. O acesso deve ser bloqueado imediatamente ao primeiro falha para motivar o usuário a atualizar o método de pagamento via `/billing/portal`.

## Goals / Non-Goals

**Goals:**
- `past_due` retorna `402` em todos os endpoints operacionais
- Mensagem de erro diferencia `past_due` de `expired` para orientar o usuário corretamente
- Teste de integração cobre o comportamento de `past_due`

**Non-Goals:**
- Enviar e-mail de notificação ao usuário (responsabilidade do Stripe / Resend em outro momento)
- Lógica de retry ou grace period — o bloqueio é imediato na detecção

## Decisions

### Mesma condição, mensagem ligeiramente diferente

`past_due` e `expired`/`cancelled` têm o mesmo efeito prático (bloqueio), mas origens diferentes:
- `past_due`: pagamento falhou, Stripe está tentando recobrar — usuário deve atualizar método de pagamento
- `expired`: trial expirou sem assinatura — usuário deve contratar
- `cancelled`: assinatura cancelada explicitamente

Unificar em uma única condição `|| "past_due"` é a mudança mais simples. A mensagem de erro pode ser genérica ("Regularize seu pagamento") para cobrir todos os casos, ou específica por status. Optamos por uma mensagem única e genérica para simplificar.

## Risks / Trade-offs

- [Risk] Usuário em `past_due` perde acesso imediatamente, mesmo com Stripe ainda tentando recobrar → aceito; o objetivo é motivar ação rápida e o portal de billing está acessível
- Sem riscos de regressão — a mudança é aditiva (adiciona um status à condição existente)
