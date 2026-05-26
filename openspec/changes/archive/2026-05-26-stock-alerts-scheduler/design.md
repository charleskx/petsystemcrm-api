## Context

`src/main/index.ts` calls `startJobs()` after `app.listen()` completes. `startJobs()` in `src/interfaces/jobs/index.ts` schedules `runStockAlertsJob` at `0 8 * * *` (America/Sao_Paulo) via `node-cron`. The implementation is correct but incomplete:

1. No `NODE_ENV` guard — if `start()` were ever called in a test runner the cron would start. Tests currently call `buildApp()` directly so this hasn't caused issues, but the guard is standard defensive practice.
2. No graceful shutdown — when Docker sends SIGTERM, the Node process exits without stopping in-flight cron tasks, which can interrupt a job mid-execution if it happens to fire at shutdown time.
3. `startJobs()` returns `void` — the scheduled task handle is discarded, making it impossible to stop the cron on demand.

## Goals / Non-Goals

**Goals:**
- `NODE_ENV !== "test"` guard in `index.ts` before `startJobs()`
- `startJobs()` returns the `ScheduledTask` from `node-cron` so the caller can stop it
- `index.ts` registers SIGTERM and SIGINT handlers: stop the cron task, then call `app.close()`

**Non-Goals:**
- Changing the job schedule or timezone
- Adding a management API to trigger or disable the job at runtime
- Distributed job locking

## Decisions

### Return `ScheduledTask` from `startJobs()`

`node-cron`'s `schedule()` returns a `ScheduledTask` with a `.stop()` method. Returning it from `startJobs()` allows `index.ts` to call `.stop()` in the shutdown handler without `startJobs()` needing to know about process lifecycle.

### Shutdown order: stop cron first, then close HTTP server

Stopping the cron prevents new job invocations from starting. Closing the HTTP server (`app.close()`) drains in-flight HTTP requests. This order ensures no new work starts while existing work is draining.

## Risks / Trade-offs

- [Risk] A job that is mid-execution when SIGTERM arrives will not be interrupted — `node-cron` `.stop()` only prevents future firings → Mitigation: acceptable; the job is idempotent (sends email, doesn't mutate state that can't be retried). Full graceful drain would require a more complex job framework.

## Migration Plan

1. Modify `startJobs()` to return the `ScheduledTask`
2. Add `NODE_ENV` guard and shutdown handlers in `index.ts`
3. Run `make test` — all tests pass, no leaked timers
4. Deploy — no impact on scheduled behavior
