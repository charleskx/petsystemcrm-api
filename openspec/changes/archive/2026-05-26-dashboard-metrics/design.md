## Context

O sistema tem dois planos (`essential` e `premium`) e cinco status de assinatura (`trial`, `active`, `past_due`, `expired`, `cancelled`). O `subscription-guard` bloqueia com 402 qualquer rota que não seja `/billing/*` quando o status é bloqueante. A dashboard precisa ser exceção a essa regra — ela deve funcionar sempre para que o tenant veja o estado do negócio mesmo sem assinatura ativa.

Tabelas relevantes e seus volumes esperados:
- `appointments` — principal fonte de receita para plano essential; já tem índice em `(tenant_id, scheduled_at)` e `(tenant_id, status)`
- `sales` + `sale_items` — receita do PDV, premium only; índice em `(tenant_id, created_at)` e `(tenant_id, status)`
- `products` — alertas de estoque/validade; índices em `(tenant_id, quantity, min_quantity)` e `(tenant_id, expiry_date)`
- `clients` e `pets` — contagens simples

## Goals / Non-Goals

**Goals:**
- Um único request para a dashboard completa
- Respostas diferenciadas por plano (essential omite seções premium)
- Modo degradado quando assinatura está bloqueada (métricas mínimas + status)
- Queries eficientes usando os índices existentes
- Gráfico de receita dos últimos 30 dias (por dia), separado por fonte (appointments / sales)

**Non-Goals:**
- Filtros customizados por período (data de início/fim) — dashboard sempre usa períodos fixos (hoje, este mês, últimos 30 dias)
- Paginação dos alertas de produto — retorna os primeiros 10 por tipo
- Relatórios exportáveis (CSV, PDF) — escopo separado

## Decisions

### Estrutura de resposta com seções nullable por plano

```typescript
{
  subscription: { plan, status, trialEndsAt? },

  // sempre presentes (essential + premium + expirado)
  today: {
    appointmentsScheduled: number,
    appointmentsCompleted: number,
    appointmentRevenue: number,     // soma total_amount dos completed de hoje
  },

  // presentes quando assinatura ativa (trial | active | past_due)
  thisMonth?: {
    appointmentsCompleted: number,
    appointmentRevenue: number,
    newClients: number,
  },

  totals?: {
    clients: number,
    pets: number,
    activeProducts: number,        // essential+premium
  },

  upcomingAppointments?: [          // próximos 5 agendamentos (scheduled)
    { id, scheduledAt, clientName, petName, services: string[] }
  ],

  productAlerts?: {                 // essential + premium
    lowStock: [{ id, name, quantity, minQuantity }],   // max 10
    nearExpiry: [{ id, name, expiryDate, quantity }],  // max 10
  },

  revenueChart?: [                  // últimos 30 dias, um item por dia
    { date: "YYYY-MM-DD", appointmentRevenue: number, salesRevenue?: number }
  ],

  // premium only (null no essential)
  salesThisMonth?: {
    count: number,
    revenue: number,
    byChannel: { in_store: number, online: number },
  },
}
```

**Por que campos nullable em vez de dois endpoints?** O frontend pode checar `salesThisMonth !== null` para decidir o que renderizar. Evita manter dois contratos de API diferentes.

**Por que `past_due` acessa métricas completas?** O plano técnico ainda está ativo (Stripe está tentando recobrar). Bloquear a dashboard nesse estado seria pior UX sem benefício operacional.

### Modo degradado (expired / cancelled)

Quando o status é `expired` ou `cancelled`, o use case retorna apenas:
- `subscription` (status + plano)
- `today` (só contagens, sem detalhes)

Sem `thisMonth`, `totals`, `productAlerts`, `upcomingAppointments` ou `revenueChart`. O frontend usa esses campos ausentes para renderizar o banner de reativação em tela cheia.

### Execução das queries em paralelo com Promise.all

O use case executa todos os grupos de queries em paralelo para minimizar latência. Cada grupo é uma query independente. Queries premium só são executadas se `plan === "premium"`.

### Excluir `/dashboard` do subscription-guard via allowlist de prefixo

O `subscription-guard` bloqueia tudo exceto `/auth/*`, `/billing/*`, `/payments/*` e `/health`. Adicionar `/dashboard` à lista de exceções é a mudança mais simples e rastreável.

## Risks / Trade-offs

- [Risk] Consulta pesada em tenants com muitos dados → Mitigation: índices existentes cobrem todos os filtros; limitar `upcomingAppointments` a 5 e alertas a 10 por tipo
- [Risk] `revenueChart` de 30 dias faz GROUP BY por dia, potencialmente 30 agregações → Mitigation: query única com `GROUP BY DATE(scheduled_at)`, coberta pelo índice `(tenant_id, scheduled_at)`
- [Risk] Dar acesso ao dashboard para tenant expirado pode reduzir urgência de pagamento → aceito; ver o negócio parado motiva mais do que não ver nada
