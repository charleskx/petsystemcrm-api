## Context

The platform currently has tenant, user, client, and pet management in place. Appointments are a planned feature that depend on services being available first — specifically, the ability to look up a service price by pet size at booking time. This change introduces the services and service pricing layers that unlock appointment creation.

Services are tenant-scoped. Each service has a fixed duration (in minutes) used for slot calculation. Pricing is configured per pet size tier (small, medium, large, extra_large); a service can have 1–4 pricing entries. If only one size is configured, that price is treated as the default regardless of pet size.

## Goals / Non-Goals

**Goals:**
- CRUD for services (name, description, duration_minutes, active) scoped per tenant
- Bulk PUT for pricing tiers per service (replace-all semantics)
- GET pricing for a service (list all tiers)
- Authorization: reads open to all roles; writes restricted to `owner` and `financial`
- Follow existing Clean Architecture layers (domain → application → infra → interfaces)

**Non-Goals:**
- Appointment creation (uses services but is a separate change)
- Service categories or tags
- Per-collaborator service restrictions
- Soft-delete/archive for pricing tiers individually (pricing is replaced in bulk)

## Decisions

**1. Pricing stored as replace-all (bulk PUT)**

Rationale: pricing tiers are always managed together — there are at most 4 tiers and they form a unit. Individual PATCH/DELETE per tier would add HTTP complexity without benefit. Bulk PUT replaces all existing rows for the service in one transaction, keeping the API surface minimal.

Alternative considered: individual POST/PATCH/DELETE per tier — rejected because partial updates on a small fixed-size set are harder to reason about and offer no advantage.

**2. `service_pricing` as a child table, not a JSONB column**

Rationale: relational rows make it easy to query services by price range in the future and align with the rest of the schema (all entities are normalized). JSONB would work but is inconsistent with the project style and harder to index.

**3. Authorization via existing CASL.js patterns**

All other modules use CASL for role-based access. Services follow the same pattern: `manage` ability for `owner` and `financial`, `read` ability for `collaborator`.

**4. Price stored as numeric (integer cents or decimal)**

Following the existing pattern from `sale_price` in the Product domain — prices are stored as `numeric` (Drizzle `decimal`) to avoid floating-point issues.

## Risks / Trade-offs

- **Price snapshot at appointment time**: `ServicePricing` stores the current price; when an appointment is created the price is copied into `AppointmentService.price`. If pricing changes after booking, historical appointments are unaffected — this is the intended behavior but should be documented.
  → No mitigation needed; this is by design.

- **Bulk PUT pricing with no tiers**: An empty array on `PUT /services/:id/pricing` would delete all pricing. Validation must require at least one tier.
  → Enforce minimum 1 entry in Zod schema.

- **Duration used for slot calculations**: `duration_minutes` must be positive. Appointments feature will rely on this field directly.
  → Enforce `min: 1` in Zod validation.

## Migration Plan

1. Generate Drizzle migration with new `services` and `service_pricing` tables
2. Deploy migration before deploying application code (tables are additive, no breaking changes to existing tables)
3. Rollback: drop both tables (no existing data depends on them)
