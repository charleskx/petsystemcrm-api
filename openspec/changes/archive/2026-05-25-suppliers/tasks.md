## 1. Domain Entity

- [x] 1.1 Create `src/domain/supplier/supplier.entity.ts` with `SupplierProps` interface

## 2. Application Use Cases

- [x] 2.1 Create `src/application/supplier/list-suppliers.use-case.ts` (pagination + active filter)
- [x] 2.2 Create `src/application/supplier/create-supplier.use-case.ts` (with CPF/CNPJ validation)
- [x] 2.3 Create `src/application/supplier/get-supplier.use-case.ts`
- [x] 2.4 Create `src/application/supplier/update-supplier.use-case.ts` (with CPF/CNPJ validation)
- [x] 2.5 Create `src/application/supplier/deactivate-supplier.use-case.ts`

## 3. HTTP Route

- [x] 3.1 Create `src/interfaces/http/routes/suppliers.ts` with all five endpoints and role checks
- [x] 3.2 Register the suppliers route in the server entry point

## 4. Tests

- [x] 4.1 Create `src/interfaces/http/routes/suppliers.test.ts` with integration tests covering all spec scenarios

## 5. Quality

- [x] 5.1 Run `make typecheck` and fix any type errors
- [x] 5.2 Run `make test` and ensure all tests pass
