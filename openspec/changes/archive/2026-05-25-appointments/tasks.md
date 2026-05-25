## 1. Database Schema & Migration

- [x] 1.1 Criar `src/infra/database/drizzle/schema/appointments.ts` com tabelas `appointments` e `appointment_services` (referenciando `tenants`, `clients`, `pets`, `services`)
- [x] 1.2 Exportar os novos schemas em `src/infra/database/drizzle/schema/index.ts`
- [x] 1.3 Gerar migration Drizzle (`make migrate-gen`) e validar o SQL gerado
- [x] 1.4 Aplicar migration (`make migrate`)

## 2. Domain Layer

- [x] 2.1 Criar `src/domain/appointment/appointment.entity.ts` com tipo/interface da entidade `Appointment` (status enum: `scheduled | in_progress | completed | cancelled`, payment_method enum)
- [x] 2.2 Criar `src/domain/appointment/appointment-service.entity.ts` com tipo/interface de `AppointmentService`

## 3. Application Layer — Available Slots (update)

- [x] 3.1 Atualizar `src/application/schedule/get-available-slots.use-case.ts` para consultar agendamentos existentes com `status = scheduled` ou `status = in_progress` do tenant na data informada e excluir os slots correspondentes do resultado

## 4. Application Layer — Appointments

- [x] 4.1 Criar `src/application/appointment/create-appointment.use-case.ts` — valida que o `scheduled_at` corresponde a um slot disponível (usando `getAvailableSlots` com a duração total dos serviços), resolve preço de cada serviço via `ServicePricing` pelo `pet.size`, calcula `totalAmount` e persiste agendamento + serviços em transação
- [x] 4.2 Criar `src/application/appointment/list-appointments.use-case.ts` — retorna lista paginada filtrada por `date`, `status`, `clientId` e/ou `petId`, ordenada por `scheduled_at` decrescente
- [x] 4.3 Criar `src/application/appointment/get-appointment.use-case.ts` — retorna agendamento com dados de cliente, pet e serviços (nome, preço, duração); lança `AppointmentNotFoundError` se não existir ou for de outro tenant
- [x] 4.4 Criar `src/application/appointment/update-appointment.use-case.ts` — atualiza `notes` e/ou `paymentMethod`; lança erro se status for `cancelled`
- [x] 4.5 Criar `src/application/appointment/update-appointment-status.use-case.ts` — valida e executa transições de status (`scheduled → in_progress`, `in_progress → completed`); lança `InvalidStatusTransitionError` para transições inválidas
- [x] 4.6 Criar `src/application/appointment/cancel-appointment.use-case.ts` — transiciona status para `cancelled`; lança erro se já estiver `cancelled` ou `completed`

## 5. HTTP Interface

- [x] 5.1 Criar `src/interfaces/http/routes/appointments.ts` com handlers para todos os endpoints:
  - `POST /appointments`
  - `GET /appointments`
  - `GET /appointments/:id`
  - `PATCH /appointments/:id`
  - `PATCH /appointments/:id/status`
  - `DELETE /appointments/:id`
- [x] 5.2 Registrar as rotas de appointments em `src/main/server.ts`

## 6. Tests

- [x] 6.1 Criar `src/interfaces/http/routes/appointments.test.ts` com testes de integração cobrindo: criação (slot válido, slot inválido, pricing ausente), listagem (filtros), detalhe, atualização, transições de status (válidas e inválidas) e cancelamento
- [x] 6.2 Verificar que os testes de `schedule.test.ts` para `/schedule/available-slots` continuam passando com a lógica de exclusão de slots booked
