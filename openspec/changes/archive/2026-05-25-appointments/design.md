## Context

O sistema já possui tenant, membros, clientes, pets, serviços (com precificação por porte), grade horária, feriados e cálculo de slots disponíveis. O módulo de agendamentos é o núcleo operacional do petshop: conecta cliente + pet + serviços em um horário validado.

Dependências diretas já implementadas:
- `ServicePricing` — resolve o preço do serviço pelo porte do pet no momento do agendamento
- `GetAvailableSlotsUseCase` — valida a disponibilidade do horário contra grade e feriados (precisa ser estendido para considerar agendamentos já existentes)

## Goals / Non-Goals

**Goals:**
- CRUD completo de agendamentos: criar, listar (com filtros), detalhe, atualizar observações/pagamento, alterar status e cancelar
- Validação de slot no momento da criação: o `scheduled_at` deve cair em um slot livre (grade + feriados + agendamentos existentes)
- Resolução automática de preço via `ServicePricing` pelo `pet.size` no momento da criação
- Extensão do `GetAvailableSlotsUseCase` para excluir slots já ocupados por agendamentos `scheduled` ou `in_progress`
- Autorização: leitura e criação abertas a todos os roles; atualização e cancelamento restritos a `owner` e `financial`
- Seguir a Clean Architecture já adotada no projeto

**Non-Goals:**
- Notificações/lembretes por e-mail ou SMS (implementação futura)
- Reagendamento como operação atômica (o cliente cancela e cria novo)
- Agendamentos recorrentes
- Múltiplos pets por agendamento

## Decisions

**1. `scheduled_at` como timestamp com timezone; validação de slot no use case**

Rationale: o horário agendado precisa de precisão de datetime para comparação com agendamentos existentes. A validação extrai a data e hora de `scheduled_at`, recalcula os slots disponíveis (grade + feriados + bookings existentes) e verifica se o horário solicitado está na lista — reutilizando a lógica já existente no `GetAvailableSlotsUseCase`.

Alternativa considerada: validar apenas contra grade/feriados e tratar conflitos de booking em uma tabela de locks — rejeitada por complexidade desnecessária na escala atual.

**2. Extensão do `getAvailableSlots` para excluir agendamentos existentes**

O use case atual retorna todos os slots da grade. Com appointments, cada slot de duração `D` a partir de `HH:MM` fica bloqueado se houver um agendamento `scheduled` ou `in_progress` com `scheduled_at = HH:MM` do mesmo tenant e mesma data.

A duração para bloquear o slot é derivada da soma das durações dos serviços do agendamento (`AppointmentService → Service.duration_minutes`). O use case de slots precisa de um novo parâmetro para receber a lista de slots bloqueados — ou consultar diretamente os agendamentos existentes dentro do próprio use case.

Decisão: o use case consulta diretamente os agendamentos existentes (mesma abordagem dos outros use cases que acessam o banco direto), mantendo a interface pública simples.

**3. Preço resolvido e congelado no momento da criação**

`AppointmentService.price` é preenchido com o valor de `ServicePricing` (filtrado por `serviceId` e `pet.size`) no momento de criar o agendamento. Mudanças futuras na tabela de preços não afetam agendamentos já criados.

Se não existir `ServicePricing` para o porte do pet, a criação falha com `422` — é um erro de configuração do tenant, não do cliente final.

**4. Cancelamento como mudança de status (`status = cancelled`)**

Não há DELETE físico. Isso preserva o histórico de agendamentos para fins de relatório (módulo financeiro futuro). O endpoint `DELETE /appointments/:id` realiza a transição `scheduled → cancelled` ou `in_progress → cancelled`.

**5. `total_amount` calculado automaticamente na criação**

Soma dos `price` de cada `AppointmentService`. Não é recalculado em atualizações posteriores (apenas observações e status mudam).

**6. Tabela `appointment_services` sem PK composta**

Diferente do CLAUDE.md que usa `(appointment_id, service_id)` como chave, usamos uma PK `id` para manter consistência com o padrão de todos os outros relacionamentos do projeto e evitar complexidade no ORM.

## Risks / Trade-offs

- **Race condition em slots**: dois requests simultâneos podem reservar o mesmo slot antes de um deles persistir. Sem lock pessimista, a validação é best-effort.
  → Aceitável para MVP; a escala de um petshop individual raramente gera concorrência real nesse ponto.

- **Slot bloqueado por duração composta**: a duração total do agendamento é a soma de múltiplos serviços. O algoritmo de slots disponíveis precisa usar essa duração para calcular o bloqueio corretamente.
  → Documentar no spec que `GET /schedule/available-slots?duration=` deve receber a duração total esperada.

- **`GET /appointments` sem paginação cursor-based**: usa paginação por offset (page/limit) como os outros endpoints do projeto.
  → Suficiente para a escala atual; cursor-based é otimização futura.

## Migration Plan

1. Gerar migration Drizzle com as tabelas `appointments` e `appointment_services`
2. Deploy da migration antes do código (tabelas aditivas, sem breaking changes)
3. Rollback: drop das duas tabelas (sem dados dependentes em outros módulos)
