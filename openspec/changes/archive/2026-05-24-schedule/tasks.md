## 1. Database Schema & Migration

- [x] 1.1 Criar `src/infra/database/drizzle/schema/schedule.ts` com tabelas `work_schedules` e `holidays`
- [x] 1.2 Exportar os novos schemas em `src/infra/database/drizzle/schema/index.ts`
- [x] 1.3 Gerar migration Drizzle (`make migrate-gen`) e validar o SQL gerado
- [x] 1.4 Aplicar migration (`make migrate`)

## 2. Domain Layer

- [x] 2.1 Criar `src/domain/schedule/work-schedule.entity.ts` com tipo/interface da entidade `WorkSchedule`
- [x] 2.2 Criar `src/domain/schedule/holiday.entity.ts` com tipo/interface da entidade `Holiday`

## 3. Application Layer — Work Schedule

- [x] 3.1 Criar `src/application/schedule/get-work-schedule.use-case.ts` — retorna todos os registros do tenant
- [x] 3.2 Criar `src/application/schedule/upsert-work-schedule.use-case.ts` — substitui toda a grade do tenant (replace-all atômico)

## 4. Application Layer — Holiday

- [x] 4.1 Criar `src/application/schedule/list-holidays.use-case.ts` — retorna feriados ordenados por data
- [x] 4.2 Criar `src/application/schedule/create-holiday.use-case.ts` — cria feriado, valida data duplicada
- [x] 4.3 Criar `src/application/schedule/delete-holiday.use-case.ts` — remove feriado, valida propriedade do tenant

## 5. Application Layer — Available Slots

- [x] 5.1 Criar `src/application/schedule/get-available-slots.use-case.ts` — calcula slots livres para date + duration considerando grade e feriados

## 6. HTTP Interface

- [x] 6.1 Criar `src/interfaces/http/routes/schedule.ts` com os handlers dos endpoints:
  - `GET /schedule`
  - `PUT /schedule`
  - `GET /schedule/holidays`
  - `POST /schedule/holidays`
  - `DELETE /schedule/holidays/:id`
  - `GET /schedule/available-slots`
- [x] 6.2 Registrar as rotas de schedule em `src/main/server.ts`

## 7. Tests

- [x] 7.1 Criar `src/interfaces/http/routes/schedule.test.ts` com testes de integração para todos os endpoints (grade horária, feriados e slots disponíveis)
