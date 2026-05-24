## 1. Domain Layer

- [x] 1.1 Create `src/domain/service/service.entity.ts` — Service entity with fields: id, tenantId, name, description, durationMinutes, active, createdAt
- [x] 1.2 Create `src/domain/service/service-pricing.entity.ts` — ServicePricing entity with fields: id, serviceId, petSize, price
- [x] 1.3 Create `src/domain/service/service.repository.ts` — IServiceRepository interface (findById, findAllByTenant, create, update, delete)
- [x] 1.4 Create `src/domain/service/service-pricing.repository.ts` — IServicePricingRepository interface (findByServiceId, replaceAll, findByServiceAndSize)

## 2. Database Schema & Migration

- [x] 2.1 Create `src/infra/database/drizzle/schema/services.ts` — `services` and `service_pricing` Drizzle table definitions
- [x] 2.2 Export new tables from `src/infra/database/drizzle/schema/index.ts`
- [x] 2.3 Generate migration with `make migrate-gen` and verify the generated SQL

## 3. Infrastructure — Repositories

- [x] 3.1 Create `src/infra/database/repositories/drizzle-service.repository.ts` — implements IServiceRepository using Drizzle
- [x] 3.2 Create `src/infra/database/repositories/drizzle-service-pricing.repository.ts` — implements IServicePricingRepository; replaceAll wraps delete + insert in a transaction

## 4. Application — Use Cases

- [x] 4.1 Create `src/application/service/create-service.use-case.ts`
- [x] 4.2 Create `src/application/service/list-services.use-case.ts`
- [x] 4.3 Create `src/application/service/get-service.use-case.ts`
- [x] 4.4 Create `src/application/service/update-service.use-case.ts`
- [x] 4.5 Create `src/application/service/delete-service.use-case.ts`
- [x] 4.6 Create `src/application/service/get-service-pricing.use-case.ts`
- [x] 4.7 Create `src/application/service/update-service-pricing.use-case.ts` — bulk replace; validates min 1 entry, no duplicate pet_size

## 5. HTTP Layer

- [x] 5.1 Create `src/interfaces/http/routes/services.ts` — register all routes with Zod schemas and Fastify type-safe handlers
- [x] 5.2 Register services routes in `src/main/server.ts`
- [x] 5.3 Add CASL ability rules for services: `owner` and `financial` → manage; `collaborator` → read

## 6. Tests

- [x] 6.1 Create `src/interfaces/http/routes/services.test.ts` — integration tests covering: create, list, get, update, delete, get pricing, update pricing, authorization (collaborator blocked), cross-tenant isolation, validation errors
