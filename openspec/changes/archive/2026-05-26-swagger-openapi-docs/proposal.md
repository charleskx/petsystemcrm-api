## Why

`@fastify/swagger` and `@fastify/swagger-ui` are already registered in `server.ts` and serve `/documentation`, but no route handler has a Fastify `schema` option — so the generated OpenAPI spec is empty. The Swagger UI exists but shows nothing useful. Adding schema annotations to every route produces a fully navigable, auto-generated API reference at zero runtime cost.

## What Changes

- Add Fastify `schema` objects (tags, summary, body, querystring, params, response) to every registered route handler
- Define reusable JSON schema components (shared body shapes, error responses) to avoid duplication
- No new dependencies — `@fastify/swagger` already handles schema → OpenAPI conversion

## Capabilities

### New Capabilities

- `openapi-route-schemas`: All route handlers annotated with Fastify JSON schemas that produce a complete, navigable OpenAPI 3.0 spec at `/documentation`

### Modified Capabilities

(none — no spec-level behavior changes, purely additive metadata)

## Impact

- Modified files: all route files under `src/interfaces/http/routes/` (14 files)
- `src/main/server.ts`: extend swagger config with shared component schemas if needed
- No API behavior changes — schemas are metadata only (Fastify validates inputs against them, which is additive/stricter)
- Input validation tightens: if a route currently passes invalid body shapes that aren't caught by Zod, Fastify schema validation may now reject them earlier — this is desirable
- No database changes
