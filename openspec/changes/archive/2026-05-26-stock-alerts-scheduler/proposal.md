## Why

The stock alerts job is implemented and `startJobs()` is called in `src/main/index.ts` after `app.listen()` — the happy path works. However, two gaps remain: (1) there is no `NODE_ENV !== "test"` guard, so if `start()` is ever executed in a test context the cron would leak into the test run; (2) there is no SIGTERM/SIGINT graceful shutdown hook to stop scheduled tasks before the process exits, which can cause unclean shutdowns in Docker/Coolify deployments; (3) the cron expression and timezone are not validated at startup beyond the `node-cron` library accepting them.

## What Changes

- Add `if (env.NODE_ENV !== "test")` guard around `startJobs()` in `src/main/index.ts`
- Register `SIGTERM` and `SIGINT` handlers in `index.ts` to call `app.close()` and stop the cron gracefully
- Export the scheduled task from `startJobs()` so it can be stopped on shutdown
- Add a startup log confirming the cron expression and timezone that was registered

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `stock-alert-job`: Add requirements for environment guard and graceful shutdown of the scheduled task

## Impact

- Modified files: `src/main/index.ts`, `src/interfaces/jobs/index.ts`
- No new dependencies
- No API changes, no database changes
- Tests unaffected — guard prevents cron from running in test environment
