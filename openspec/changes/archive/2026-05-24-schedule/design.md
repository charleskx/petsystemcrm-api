## Context

O sistema já possui tenant, usuário, cliente e pet management. O módulo de agendamentos (appointments) depende diretamente da grade horária para validar se um slot está disponível. Esta change entrega as três partes que sustentam essa validação: grade semanal (`WorkSchedule`), feriados (`Holiday`) e cálculo de slots disponíveis.

A grade é configurada por dia da semana (0–6) com `open_time`, `close_time` e flag `is_closed`. Feriados bloqueiam dias inteiros. O endpoint de slots disponíveis recebe `date` e `duration` e devolve intervalos livres calculados a partir da grade e dos feriados cadastrados.

## Goals / Non-Goals

**Goals:**
- CRUD de grade horária semanal por tenant (replace-all semântico via `PUT /schedule`)
- Listagem, criação e remoção de feriados por tenant
- Endpoint `GET /schedule/available-slots?date=&duration=` calculando slots livres
- Autorização: leitura aberta a todos os roles; escrita restrita a `owner` e `financial`
- Seguir a Clean Architecture já adotada no projeto

**Non-Goals:**
- Integração com criação de agendamentos (appointments é uma change separada)
- Grade por colaborador ou por serviço (grade é do tenant inteiro)
- Recorrência de feriados (cada feriado é uma data única)
- Disponibilidade em tempo real considerando agendamentos existentes (essa lógica pertence ao módulo de appointments)

## Decisions

**1. Grade horária como replace-all via `PUT /schedule`**

Rationale: a grade semanal é sempre gerenciada como um conjunto de 7 dias — não faz sentido atualizar um único dia em isolamento. Bulk PUT substitui todas as entradas do tenant em uma transação, mantendo a API simples e atômica.

Alternativa considerada: `PATCH` por `day_of_week` — rejeitada por adicionar complexidade sem ganho real dado o tamanho fixo do conjunto (máx. 7 linhas).

**2. Feriados sem recorrência anual automática**

Rationale: petshops têm calendários variáveis; feriados municipais, pontos facultativos e recessos precisam de controle manual. Recorrência automática introduziria lógica desnecessária na MVP.

**3. Cálculo de slots disponíveis no use case, sem persistência**

Rationale: slots são computados on-the-fly a partir da grade e dos feriados. Persistir slots pré-calculados adicionaria complexidade de invalidação de cache sem benefício mensurável para a escala atual.

O algoritmo:
1. Verificar se a data cai em feriado → retornar lista vazia
2. Buscar `WorkSchedule` do dia da semana correspondente
3. Se `is_closed = true` → retornar lista vazia
4. Iterar de `open_time` até `close_time - duration` em passos de `duration`, gerando os slots

**4. `open_time` / `close_time` armazenados como `time` (string HH:MM)**

Rationale: Drizzle suporta `time` nativamente e a representação string HH:MM é suficiente para comparação e serialização. Evita complexidade de timezone — horários são sempre no fuso do tenant.

**5. Autorização via CASL.js seguindo padrão existente**

Leitura (`read`) para todos os roles; escrita (`manage`) restrita a `owner` e `financial`, igual aos outros módulos.

## Risks / Trade-offs

- **Slots sem considerar agendamentos existentes**: o endpoint retorna slots baseados apenas na grade e feriados. Quando o módulo de appointments for implementado, o cálculo precisará ser estendido para excluir slots já ocupados.
  → Documentar claramente no spec que a verificação de conflito de agendamento é responsabilidade do módulo de appointments.

- **Grade não inicializada**: um tenant novo sem `WorkSchedule` cadastrado terá todos os dias como fechados (lista vazia de slots). O frontend deve orientar o usuário a configurar a grade antes de criar agendamentos.
  → Comportamento esperado; nenhuma inicialização automática.

- **Feriado com data passada**: não há restrição para cadastrar feriados em datas passadas. Isso pode gerar entradas inúteis no banco.
  → Decisão de UX; a API não bloqueia — o frontend pode filtrar se necessário.

## Migration Plan

1. Gerar migration Drizzle com as tabelas `work_schedules` e `holidays`
2. Deploy da migration antes do deploy do código (tabelas são aditivas)
3. Rollback: drop das duas tabelas (sem dependências de dados existentes)
