## MODIFIED Requirements

### Requirement: Job diário é ativado automaticamente no start do servidor em ambientes não-test
O sistema SHALL chamar `startJobs()` somente quando `NODE_ENV !== "test"`. Em ambiente de teste o cron NÃO SHALL ser ativado para evitar vazamento de timers.

#### Scenario: Job registrado ao iniciar o servidor em produção
- **WHEN** o servidor inicia com `NODE_ENV=production`
- **THEN** `startJobs()` é chamado após `app.listen()` completar
- **AND** o log `[jobs] stock-alerts agendado para 08h (America/Sao_Paulo)` aparece no stdout

#### Scenario: Job NÃO registrado em ambiente de teste
- **WHEN** o servidor inicia com `NODE_ENV=test`
- **THEN** `startJobs()` NÃO é chamado
- **AND** nenhum cron timer é criado durante os testes

### Requirement: Servidor encerra o cron graciosamente ao receber SIGTERM ou SIGINT
Ao receber sinal de encerramento, o sistema SHALL parar o cron task antes de fechar o servidor HTTP, garantindo que nenhuma nova execução do job seja iniciada durante o shutdown.

#### Scenario: SIGTERM pára o cron e fecha o servidor
- **WHEN** o processo recebe SIGTERM
- **THEN** o `ScheduledTask` retornado por `startJobs()` tem `.stop()` chamado
- **AND** `app.close()` é chamado em seguida
- **AND** o processo encerra sem erros

#### Scenario: SIGINT (Ctrl+C) comporta-se igual ao SIGTERM
- **WHEN** o processo recebe SIGINT
- **THEN** o mesmo fluxo de shutdown gracioso é executado
