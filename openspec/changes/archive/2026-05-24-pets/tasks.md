## 1. Database Schema

- [x] 1.1 Create `src/infra/database/drizzle/schema/pets.ts` with `pets` table (id, tenant_id, client_id, name, species, breed, birth_date, weight, size enum, notes, photo_url, created_at)
- [x] 1.2 Export `pets` table from `src/infra/database/drizzle/schema/index.ts`
- [x] 1.3 Generate and run migration (`make migrate-gen && make migrate`)

## 2. Domain

- [x] 2.1 Create `src/domain/pet/pet.entity.ts` with `PetProps` interface matching the schema

## 3. Application — Pet Management Use Cases

- [x] 3.1 Create `src/application/pet/create-pet.use-case.ts` — validate client belongs to tenant, insert pet, return created record
- [x] 3.2 Create `src/application/pet/list-pets.use-case.ts` — list all pets for a given clientId + tenantId
- [x] 3.3 Create `src/application/pet/get-pet.use-case.ts` — fetch pet by id + tenantId, throw `PetNotFoundError` if not found or wrong tenant
- [x] 3.4 Create `src/application/pet/update-pet.use-case.ts` — partial update, reuse `PetNotFoundError`
- [x] 3.5 Create `src/application/pet/delete-pet.use-case.ts` — physical delete by id + tenantId, throw `PetNotFoundError` if not found

## 4. Application — Photo Upload Use Case

- [x] 4.1 Create `src/application/pet/upload-pet-photo.use-case.ts` — validate MIME type and file size, delete old R2 photo if exists, upload to `pets/{petId}/photo.{ext}`, persist `photo_url`

## 5. HTTP Routes

- [x] 5.1 Create `src/interfaces/http/routes/pets.ts` with `petsRoutes` function
- [x] 5.2 Implement `POST /clients/:clientId/pets` — parse body with Zod, call `createPet`, return 201
- [x] 5.3 Implement `GET /clients/:clientId/pets` — validate clientId ownership, call `listPets`, return 200
- [x] 5.4 Implement `GET /pets/:id` — call `getPet`, return 200 or 404
- [x] 5.5 Implement `PATCH /pets/:id` — parse partial body with Zod, call `updatePet`, return 200 or 404/422
- [x] 5.6 Implement `DELETE /pets/:id` — call `deletePet`, return 204 or 404
- [x] 5.7 Implement `POST /pets/:id/photo` — read multipart file, call `uploadPetPhoto`, return 200 or 422/404

## 6. Server Registration

- [x] 6.1 Import and register `petsRoutes` in `src/main/server.ts`

## 7. Tests

- [x] 7.1 Create `src/interfaces/http/routes/pets.test.ts` covering: create pet (success + validation errors), list pets (success + tenant isolation), get pet (found + not found + wrong tenant), update pet (success + wrong tenant), delete pet (success + not found), photo upload (success + invalid mime + size exceeded + wrong tenant)
