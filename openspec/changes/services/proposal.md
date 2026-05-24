## Why

The platform needs a way for petshop tenants to define the services they offer (grooming, bathing, veterinary consultations, etc.), configure their duration, and set prices by pet size — enabling accurate appointment booking and automated price selection based on the pet's size.

## What Changes

- New CRUD endpoints for managing services (`/services`)
- New bulk endpoint to configure per-size pricing for each service (`/services/:id/pricing`)
- Service pricing lookup at appointment creation time (pet size → price)

## Capabilities

### New Capabilities

- `service-management`: CRUD for services (name, description, duration, active flag) scoped to tenant
- `service-pricing`: Manage price tiers per pet size for each service (bulk put); up to 4 entries per service (small, medium, large, extra_large)

### Modified Capabilities

<!-- No existing specs require requirement-level changes for this feature -->

## Impact

- New domain entities: `Service`, `ServicePricing`
- New Drizzle schema tables: `services`, `service_pricing`
- New DB migration
- New routes: `src/interfaces/http/routes/services.ts`
- New use cases under `src/application/service/`
- New repository implementations under `src/infra/database/repositories/`
- Appointments module will depend on `ServicePricing` to resolve price by pet size (pre-condition for the appointments feature)
- Access control: essential + premium plans; all tenant roles can read; only `owner` and `financial` can create/update/delete services and pricing
