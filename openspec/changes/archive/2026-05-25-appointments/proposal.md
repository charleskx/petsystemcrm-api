## Why

The platform needs a full appointment management module so petshop operators can schedule, track, and complete grooming and other pet services — the core operational workflow of the business. Without this, the existing schedule, service, and pricing infrastructure has no practical use.

## What Changes

- New CRUD endpoints for appointments (`/appointments`)
- Appointment creation validates the requested `scheduled_at` against the work schedule and holidays, and against already-booked slots for the same tenant
- Service price at booking time is resolved from `ServicePricing` using the pet's size; missing pricing for that size returns a validation error
- Status lifecycle: `scheduled → in_progress → completed` or `scheduled → cancelled`
- Cancellation is a soft-delete (status change), not a hard delete

## Capabilities

### New Capabilities

- `appointment-management`: Full CRUD for appointments — create (with services + auto-priced by pet size), list (filterable by date, status, pet, client), detail, update notes/payment_method, change status, and cancel. Validates slot availability against work schedule, holidays, and existing bookings.

### Modified Capabilities

- `available-slots`: Slot calculation must now exclude times already occupied by existing `scheduled` or `in_progress` appointments of the same tenant (a booked slot should not appear as available).

## Impact

- New domain entities: `Appointment`, `AppointmentService`
- New Drizzle schema tables: `appointments`, `appointment_services`
- New DB migration
- New routes: `src/interfaces/http/routes/appointments.ts`
- New use cases under `src/application/appointment/`
- New repository implementations under `src/infra/database/repositories/`
- `GetAvailableSlotsUseCase` updated to query existing appointments and subtract booked slots
- Access control: essential + premium plans; all tenant roles can read and create; only `owner` and `financial` can update or cancel
