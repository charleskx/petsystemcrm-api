## ADDED Requirements

### Requirement: Enviar alerta diário de estoque por e-mail
O sistema SHALL executar automaticamente, uma vez por dia (08h horário de Brasília), um job que verifica produtos com alerta de estoque baixo ou validade próxima em cada tenant ativo, e envia e-mail ao owner do tenant quando houver ao menos um produto crítico.

#### Scenario: Tenant com produtos em alerta recebe e-mail
- **WHEN** o job diário executa e o tenant possui ao menos um produto com `quantity <= min_quantity` ou `expiry_date <= hoje + 30 dias` e `active = true`
- **THEN** o sistema envia exatamente um e-mail ao owner do tenant listando os produtos agrupados por tipo de alerta (estoque baixo / validade próxima)

#### Scenario: Tenant sem produtos em alerta não recebe e-mail
- **WHEN** o job diário executa e o tenant não possui nenhum produto que atenda aos critérios de alerta
- **THEN** o sistema NÃO envia e-mail para o owner desse tenant

#### Scenario: Tenant com assinatura expirada ou cancelada é ignorado
- **WHEN** o job diário executa e o tenant possui `subscription_status = expired` ou `subscription_status = cancelled`
- **THEN** o sistema NÃO verifica nem envia alertas para esse tenant

#### Scenario: Isolamento por tenant
- **WHEN** o job diário executa para múltiplos tenants
- **THEN** cada tenant recebe somente alertas dos seus próprios produtos; os dados de um tenant NÃO aparecem no e-mail de outro tenant

---

### Requirement: Conteúdo do e-mail de alerta de estoque
O sistema SHALL incluir no e-mail de alerta informações suficientes para que o owner identifique e aja sobre cada produto crítico sem precisar acessar o sistema.

#### Scenario: E-mail com produtos de estoque baixo
- **WHEN** o tenant possui produtos com `quantity <= min_quantity`
- **THEN** o e-mail DEVE listar esses produtos com nome, quantidade atual e quantidade mínima

#### Scenario: E-mail com produtos próximos da validade
- **WHEN** o tenant possui produtos com `expiry_date <= hoje + 30 dias`
- **THEN** o e-mail DEVE listar esses produtos com nome e data de validade

#### Scenario: Produto com ambos os tipos de alerta aparece nas duas seções
- **WHEN** um produto tem `quantity <= min_quantity` E `expiry_date <= hoje + 30 dias`
- **THEN** o produto aparece em ambas as seções do e-mail (estoque baixo e validade próxima)

---

### Requirement: Falha de envio não interrompe outros tenants
O sistema SHALL processar todos os tenants independentemente, de forma que falha no envio de e-mail para um tenant não impeça o processamento dos demais.

#### Scenario: Erro de envio isolado
- **WHEN** o Resend retorna erro ao enviar e-mail para um tenant
- **THEN** o sistema registra o erro em log e continua processando os tenants restantes

#### Scenario: Erro de consulta isolado
- **WHEN** a query de alertas de um tenant falha com erro inesperado
- **THEN** o sistema registra o erro em log e continua processando os tenants restantes

---

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

---

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
