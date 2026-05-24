## Why

O sistema precisa gerenciar a disponibilidade do petshop para que agendamentos só possam ser criados em horários válidos. Sem grade horária e controle de feriados, qualquer horário seria aceito — o que tornaria o módulo de agendamentos inviável na prática.

## What Changes

- Novos endpoints REST para configurar a grade horária semanal do tenant (`WorkSchedule`)
- Novos endpoints para gerenciar feriados do tenant (`Holiday`)
- Endpoint de consulta de slots disponíveis para uma data e duração informadas
- Novas tabelas `work_schedules` e `holidays` no banco de dados
- Repositories e use cases para os três contextos (grade, feriados, slots)

## Capabilities

### New Capabilities

- `work-schedule-management`: CRUD da grade horária semanal — definir horário de abertura/fechamento e dias fechados por dia da semana
- `holiday-management`: Gerenciamento de feriados do tenant — listar, adicionar e remover datas bloqueadas
- `available-slots`: Cálculo e consulta de slots disponíveis para uma data e duração informadas, respeitando grade horária e feriados

### Modified Capabilities

## Impact

- Novas tabelas: `work_schedules`, `holidays`
- Nova migration Drizzle
- Novos schemas Drizzle em `src/infra/database/drizzle/schema/`
- Novos arquivos em `src/domain/schedule/`, `src/application/schedule/`, `src/infra/database/repositories/`
- Novas rotas em `src/interfaces/http/routes/schedule.ts`
- Registro das rotas em `src/main/server.ts`
- Middleware `subscription-guard` já cobre `/schedule` como rota essential — sem alterações necessárias
