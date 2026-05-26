## Context

Fastify's `schema` route option feeds `@fastify/swagger` to produce OpenAPI 3.0 output. Currently every route registers without a schema, so the generated spec has no paths. The plugin + UI are wired up and working — what's missing is the per-route annotation.

Fastify JSON Schema for a route looks like:
```typescript
app.get("/services", {
  schema: {
    tags: ["Services"],
    summary: "List services",
    security: [{ cookieAuth: [] }],
    querystring: { type: "object", properties: { ... } },
    response: { 200: { type: "array", items: { ... } } },
  },
}, handler)
```

## Goals / Non-Goals

**Goals:**
- Every route has `tags`, `summary`, `security`, and `response` for at least the happy path
- Body schemas on `POST`/`PATCH` routes (mirrors the Zod schema already in place)
- Common error response shapes (`400`, `401`, `402`, `403`, `404`, `422`) defined once and referenced
- `/documentation` returns a complete, navigable spec

**Non-Goals:**
- Replacing Zod validation with Fastify JSON schema validation — Zod stays as the authoritative validator; Fastify schemas are documentation-only (`ajv` can be disabled per-route or left to coexist)
- Perfect 1:1 parity with every Zod refinement (e.g., CNPJ check-digit) — document the shape, not every constraint
- Generating a client SDK from the spec

## Decisions

### One schema object inline per route (no external schema registry)

Alternatives considered:
- Centralized schema registry (`app.addSchema` + `$ref`): cleaner for large APIs, but adds indirection that makes each route harder to read in isolation.
- External JSON files: unnecessary overhead for a TypeScript project.

Decision: inline schema objects per route. If duplication becomes painful (e.g., common `errorResponse` shape), extract to a small `src/interfaces/http/schemas/shared.ts` with typed constants.

### `security: [{ cookieAuth: [] }]` on every authenticated route

The server.ts swagger config already defines `cookieAuth` as a security scheme. Each authenticated route should declare it so the Swagger UI shows the lock icon and testers know auth is required.

### Response schemas cover 200/201/204 + common error codes

Defining response schemas also enables Fastify's response serialization (faster JSON stringify). Error responses (401, 402, 403, 404, 422) share a common shape `{ type: "object", properties: { error: { type: "string" } } }`.

## Risks / Trade-offs

- [Risk] Schema `body` validation by Fastify runs before Zod and may reject valid inputs if schema is too strict → Mitigation: keep body schemas permissive (no `additionalProperties: false`); let Zod handle refinements
- [Risk] Time-consuming — 14 route files × multiple endpoints each → Mitigation: tackle by module, one commit per file; bulk of the work is mechanical

## Migration Plan

1. Add shared error response constant to `src/interfaces/http/schemas/shared.ts`
2. Annotate routes file by file (health → auth → tenants → members → clients → pets → services → schedule → appointments → products → stock → suppliers → sales → billing → payments)
3. Run `make typecheck` after each file
4. Verify `/documentation` renders all paths after all files done
5. No rollback needed — schemas are additive metadata
