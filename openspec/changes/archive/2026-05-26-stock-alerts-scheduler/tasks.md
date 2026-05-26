## 1. Hardening do startJobs

- [x] 1.1 Alterar `startJobs()` em `src/interfaces/jobs/index.ts` para retornar o `ScheduledTask` do `node-cron` (mudar retorno de `void` para `ScheduledTask`)
- [x] 1.2 Adicionar type import de `ScheduledTask` do `node-cron` na assinatura da função

## 2. Wiring no entry point

- [x] 2.1 Adicionar guard `if (env.NODE_ENV !== "test")` em torno da chamada `startJobs()` em `src/main/index.ts`
- [x] 2.2 Capturar o retorno de `startJobs()` em uma variável `cronTask`
- [x] 2.3 Registrar handler `process.on("SIGTERM", ...)` que chama `cronTask.stop()` e depois `app.close()` com log de encerramento
- [x] 2.4 Registrar handler `process.on("SIGINT", ...)` com o mesmo comportamento

## 3. Verificação

- [x] 3.1 Rodar `make test` — todos os 275 testes passam sem timer leaks
- [x] 3.2 Rodar `make typecheck` — sem erros de TypeScript
- [x] 3.3 Subir o servidor localmente (`make dev`) e confirmar que o log `[jobs] stock-alerts agendado` aparece no boot
