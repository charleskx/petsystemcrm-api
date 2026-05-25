## Context

O endpoint `GET /products/alerts` já consulta produtos com `quantity <= min_quantity` ou `expiry_date <= hoje + 30 dias`, mas é pull-based. O diretório `src/interfaces/jobs/` existe na arquitetura mas está vazio. O stack inclui Resend para e-mail e o schema já tem `tenantMembers` + `user` para localizar o owner de cada tenant.

Estado atual:
- `get-product-alerts.use-case.ts` — lógica de query pronta e reutilizável
- `src/infra/email/resend.ts` — cliente Resend configurado com lazy singleton
- `tenantMembers` + `user` — join disponível para obter o e-mail do owner

## Goals / Non-Goals

**Goals:**
- Cron job diário que varre todos os tenants ativos/trial e envia e-mail de alerta ao owner quando há produtos críticos
- Template React Email responsivo com lista de alertas separados por tipo (estoque baixo / validade próxima)
- Silêncio quando não há alertas (não envia e-mail vazio)

**Non-Goals:**
- Configuração de frequência por tenant (sempre diário às 08h)
- Notificações para roles diferentes de `owner`
- Persistência de alertas enviados / controle de deduplicação entre dias
- Endpoints HTTP para disparar ou configurar o job

## Decisions

### 1. Biblioteca de agendamento: `node-cron`

`node-cron` roda in-process, sem dependência de infraestrutura externa (Redis, DB de jobs), e é suficiente para um job simples de frequência diária. Alternativas descartadas:
- **BullMQ / pg-boss** — overhead desnecessário para um único job sem retry ou persistência de estado
- **Cron do SO** — exigiria entrypoint separado e complicaria o deploy no Coolify

### 2. Inicialização: `startJobs()` chamado em `src/main/index.ts`

O scheduler é registrado no bootstrap da aplicação (junto com `buildApp()`), fora do servidor Fastify. Assim fica isolado do ciclo HTTP mas compartilha o mesmo processo e variáveis de ambiente.

### 3. Reuso de `getProductAlerts`

A query existente cobre os critérios de alerta. O job itera sobre tenants, chama `getProductAlerts(tenantId)` e só prossegue se o array retornado não estiver vazio. Sem duplicar lógica de negócio.

### 4. Busca do owner via join direto no banco

```sql
SELECT u.email, u.name
FROM tenant_members tm
JOIN user u ON u.id = tm.user_id
WHERE tm.tenant_id = $1 AND tm.role = 'owner'
LIMIT 1
```

Não há repositório de membros; a query Drizzle é feita diretamente no job, seguindo o padrão do restante do codebase.

### 5. Template React Email inline

Criado em `src/infra/email/templates/stock-alert.tsx`. Renderizado com `@react-email/render` para obter o HTML antes de chamar `resend.emails.send()`. Segue o padrão simples já adotado no projeto (sem sistema de template genérico).

## Risks / Trade-offs

- **Job in-process em escala**: com muitos tenants, o job pode demorar e consumir CPU. Mitigação: processar tenants em lotes pequenos (ex.: 10 por vez) com `Promise.all` em chunks.
- **Falha silenciosa no Resend**: erros de envio são logados mas não reiniciam o job. Aceitável para alertas não-críticos; se necessário, add retry no futuro.
- **Tenant com múltiplos owners**: o `LIMIT 1` envia para apenas um owner. Mitigation: aceito por ora; se a necessidade surgir, iterar sobre todos os owners.
- **Fuso horário**: `node-cron` usa o fuso do servidor. Configurar explicitamente `timezone: "America/Sao_Paulo"` na expressão cron para garantir envio às 08h horário local.

## Migration Plan

1. Instalar `node-cron` e `@types/node-cron`
2. Criar `src/interfaces/jobs/stock-alerts.job.ts`
3. Criar `src/interfaces/jobs/index.ts` com `startJobs()`
4. Criar template `src/infra/email/templates/stock-alert.tsx`
5. Atualizar `src/main/index.ts` para chamar `startJobs()` após `buildApp()`
6. Testar unitariamente o job com tenants mock

Rollback: remover a chamada `startJobs()` em `index.ts` — zero impacto no servidor HTTP.
