## ADDED Requirements

### Requirement: Every route handler declares a Fastify schema object
Every registered Fastify route SHALL include a `schema` option with at minimum: `tags` (module grouping), `summary` (one-line description), and `response` covering the primary success status code. Authenticated routes SHALL additionally include `security: [{ cookieAuth: [] }]`.

#### Scenario: GET route has response schema
- **WHEN** a GET route is registered in any route file
- **THEN** the route `schema` contains `tags`, `summary`, and `response["200"]` (or `response["204"]` for deletes)

#### Scenario: POST/PATCH route has body schema
- **WHEN** a POST or PATCH route is registered
- **THEN** the route `schema` contains `body` describing the accepted JSON shape

#### Scenario: Route with path params has params schema
- **WHEN** a route uses `:id` or similar path parameters
- **THEN** the route `schema` contains `params` with the parameter defined as `type: "string"`

#### Scenario: Authenticated route declares cookieAuth security
- **WHEN** an authenticated route (with `preHandler: authenticate`) is registered
- **THEN** `schema.security` includes `[{ cookieAuth: [] }]`

### Requirement: GET /documentation returns a complete OpenAPI spec
The `/documentation/json` endpoint SHALL return an OpenAPI 3.0 document with all API paths populated. An empty `paths` object (no routes annotated) is a failure condition.

#### Scenario: Documentation endpoint lists all registered modules
- **WHEN** a GET request is sent to `/documentation/json`
- **THEN** the response status is 200
- **AND** `paths` contains entries for `/health`, `/auth/*`, `/tenants`, `/clients`, `/pets`, `/services`, `/schedule`, `/appointments`, `/products`, `/stock`, `/suppliers`, `/sales`, `/billing`, `/payments/stripe/webhook`

### Requirement: Shared error response shapes are defined once
Common HTTP error responses (401, 402, 403, 404, 422) SHALL share a reusable schema shape `{ type: "object", properties: { error: { type: "string" } } }` defined in `src/interfaces/http/schemas/shared.ts` and imported by route files to avoid repetition.

#### Scenario: Shared error schema is referenced in route responses
- **WHEN** a route can return 401 or 403
- **THEN** the route `schema.response` includes the shared error object shape for those codes
