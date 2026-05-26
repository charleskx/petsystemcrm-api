# Changelog


## v1.2.1

[compare changes](https://github.com/charleskx/petsystemcrm-api/compare/v1.2.0...v1.2.1)

### 🩹 Fixes

- **ci:** Add checkout step to deploy workflow ([4ded4d8](https://github.com/charleskx/petsystemcrm-api/commit/4ded4d8))
- **ci:** Use Coolify API token via Authorization header for deploy trigger ([88e45c8](https://github.com/charleskx/petsystemcrm-api/commit/88e45c8))

### ❤️ Contributors

- Charleston Amaral ([@charleskx](https://github.com/charleskx))

## v1.2.0


### 🚀 Enhancements

- **auth:** Implement authentication module and tenant registration ([dd42e52](https://github.com/charleskx/petsystemcrm-api/commit/dd42e52))
- **clients:** Implement client management module ([daec159](https://github.com/charleskx/petsystemcrm-api/commit/daec159))
- **tenants:** Implement tenant profile management endpoints ([7b20cc3](https://github.com/charleskx/petsystemcrm-api/commit/7b20cc3))
- **members:** Implement tenant member management endpoints ([97ee33a](https://github.com/charleskx/petsystemcrm-api/commit/97ee33a))
- **pets:** Implement pet management module ([0e634fa](https://github.com/charleskx/petsystemcrm-api/commit/0e634fa))
- **services:** Implement service and pricing management module ([1f87822](https://github.com/charleskx/petsystemcrm-api/commit/1f87822))
- **schedule:** Implement work schedule, holiday, and available slots endpoints ([fdf585a](https://github.com/charleskx/petsystemcrm-api/commit/fdf585a))
- **appointments:** Implement appointment management module ([0fd837c](https://github.com/charleskx/petsystemcrm-api/commit/0fd837c))
- **products:** Implement product, category, and stock management module ([bb326a7](https://github.com/charleskx/petsystemcrm-api/commit/bb326a7))
- **jobs:** Add daily stock alert email job ([10e7e64](https://github.com/charleskx/petsystemcrm-api/commit/10e7e64))
- **suppliers:** Implement supplier management module ([eec6a46](https://github.com/charleskx/petsystemcrm-api/commit/eec6a46))
- **sales:** Implement product sales module (PDV) ([4f2a40c](https://github.com/charleskx/petsystemcrm-api/commit/4f2a40c))
- **billing:** Implement billing and subscription management module ([3a99e57](https://github.com/charleskx/petsystemcrm-api/commit/3a99e57))
- **payments:** Add OpenSpec for stripe webhook and subscription guard ([0f53221](https://github.com/charleskx/petsystemcrm-api/commit/0f53221))
- **jobs:** Add graceful shutdown and skip cron in test env ([f123bcf](https://github.com/charleskx/petsystemcrm-api/commit/f123bcf))
- **docs:** Add OpenAPI schemas to all route handlers ([bc72eac](https://github.com/charleskx/petsystemcrm-api/commit/bc72eac))
- **dashboard:** Add GET /dashboard endpoint with tenant metrics ([a7fbcec](https://github.com/charleskx/petsystemcrm-api/commit/a7fbcec))

### 🩹 Fixes

- **auth:** Replace node handler with Web API handler ([52c8cf8](https://github.com/charleskx/petsystemcrm-api/commit/52c8cf8))
- **subscription-guard:** Block past_due tenants with 402 ([b2e41f9](https://github.com/charleskx/petsystemcrm-api/commit/b2e41f9))
- **docker:** Point CMD to index.js entry point instead of server.js ([7cfe8f8](https://github.com/charleskx/petsystemcrm-api/commit/7cfe8f8))
- **ci:** Remove explicit pnpm version — action-setup@v4 reads from packageManager in package.json ([1dca21b](https://github.com/charleskx/petsystemcrm-api/commit/1dca21b))
- **ci:** Migrate Biome to 2.4.15 and resolve all lint errors ([9ee554e](https://github.com/charleskx/petsystemcrm-api/commit/9ee554e))
- **docker:** Allow esbuild build scripts via pnpm onlyBuiltDependencies ([f1e3466](https://github.com/charleskx/petsystemcrm-api/commit/f1e3466))
- **docker:** Move onlyBuiltDependencies to pnpm-workspace.yaml ([1e83e45](https://github.com/charleskx/petsystemcrm-api/commit/1e83e45))
- **docker:** Copy pnpm-workspace.yaml so onlyBuiltDependencies is applied ([9694b15](https://github.com/charleskx/petsystemcrm-api/commit/9694b15))
- **docker:** Use --ignore-scripts on prod install to bypass esbuild postinstall ([447bf83](https://github.com/charleskx/petsystemcrm-api/commit/447bf83))
- **docker:** Add --ignore-scripts to builder install too ([e7d2c94](https://github.com/charleskx/petsystemcrm-api/commit/e7d2c94))

### 💅 Refactors

- **auth:** Replace inline role guards with CASL ability checks ([8db0f2c](https://github.com/charleskx/petsystemcrm-api/commit/8db0f2c))

### 📖 Documentation

- **openspec:** Propose auth module spec ([7759e69](https://github.com/charleskx/petsystemcrm-api/commit/7759e69))
- Update COOLIFY.md and CLAUDE.md with CI/CD and release workflow ([16ed542](https://github.com/charleskx/petsystemcrm-api/commit/16ed542))
- Add README with setup, endpoints, plans, roles and deploy guide ([a54b542](https://github.com/charleskx/petsystemcrm-api/commit/a54b542))

### 📦 Build

- Add docker, makefile, and dev environment setup ([f2368c8](https://github.com/charleskx/petsystemcrm-api/commit/f2368c8))
- **makefile:** Add spec-init target for openspec initialization ([3f8b6cb](https://github.com/charleskx/petsystemcrm-api/commit/3f8b6cb))
- **openspec:** Install and configure openspec dev tooling ([b1bcbee](https://github.com/charleskx/petsystemcrm-api/commit/b1bcbee))
- **openspec:** Replace workflow make targets with slash commands ([a1fe14a](https://github.com/charleskx/petsystemcrm-api/commit/a1fe14a))
- Set up project tooling and add runtime dependencies ([6aefdc3](https://github.com/charleskx/petsystemcrm-api/commit/6aefdc3))
- **test:** Containerize test execution and upgrade vitest to v4 ([937dea0](https://github.com/charleskx/petsystemcrm-api/commit/937dea0))

### 🏡 Chore

- Add project documentation and Claude configuration ([4dd9893](https://github.com/charleskx/petsystemcrm-api/commit/4dd9893))
- Add initial package.json ([3da1dab](https://github.com/charleskx/petsystemcrm-api/commit/3da1dab))
- Add .gitignore and expand .dockerignore patterns ([b421200](https://github.com/charleskx/petsystemcrm-api/commit/b421200))
- Expand .gitignore with tooling and build artifacts ([e199dc1](https://github.com/charleskx/petsystemcrm-api/commit/e199dc1))
- **openspec:** Archive auth-module change and promote specs ([deef14b](https://github.com/charleskx/petsystemcrm-api/commit/deef14b))
- **openspec:** Archive clients change and promote specs ([f1709b9](https://github.com/charleskx/petsystemcrm-api/commit/f1709b9))
- **openspec:** Archive billing and services changes, sync specs ([d65856d](https://github.com/charleskx/petsystemcrm-api/commit/d65856d))
- **openspec:** Archive payments change ([00ad1a3](https://github.com/charleskx/petsystemcrm-api/commit/00ad1a3))
- Add changelog ([5014df2](https://github.com/charleskx/petsystemcrm-api/commit/5014df2))

### ✅ Tests

- Use unique CNPJs per suite and allow DATABASE_URL override ([156dfeb](https://github.com/charleskx/petsystemcrm-api/commit/156dfeb))
- **products:** Add integration tests for product category endpoints ([a5ee232](https://github.com/charleskx/petsystemcrm-api/commit/a5ee232))
- **services:** Fix collaborator setup and add global db teardown ([0ad06eb](https://github.com/charleskx/petsystemcrm-api/commit/0ad06eb))

### 🤖 CI

- Add GitHub Actions CI/CD and release tooling ([29db955](https://github.com/charleskx/petsystemcrm-api/commit/29db955))

### ❤️ Contributors

- Charleston Amaral ([@charleskx](https://github.com/charleskx))

## v1.1.0


### 🚀 Enhancements

- **auth:** Implement authentication module and tenant registration ([dd42e52](https://github.com/charleskx/petsystemcrm-api/commit/dd42e52))
- **clients:** Implement client management module ([daec159](https://github.com/charleskx/petsystemcrm-api/commit/daec159))
- **tenants:** Implement tenant profile management endpoints ([7b20cc3](https://github.com/charleskx/petsystemcrm-api/commit/7b20cc3))
- **members:** Implement tenant member management endpoints ([97ee33a](https://github.com/charleskx/petsystemcrm-api/commit/97ee33a))
- **pets:** Implement pet management module ([0e634fa](https://github.com/charleskx/petsystemcrm-api/commit/0e634fa))
- **services:** Implement service and pricing management module ([1f87822](https://github.com/charleskx/petsystemcrm-api/commit/1f87822))
- **schedule:** Implement work schedule, holiday, and available slots endpoints ([fdf585a](https://github.com/charleskx/petsystemcrm-api/commit/fdf585a))
- **appointments:** Implement appointment management module ([0fd837c](https://github.com/charleskx/petsystemcrm-api/commit/0fd837c))
- **products:** Implement product, category, and stock management module ([bb326a7](https://github.com/charleskx/petsystemcrm-api/commit/bb326a7))
- **jobs:** Add daily stock alert email job ([10e7e64](https://github.com/charleskx/petsystemcrm-api/commit/10e7e64))
- **suppliers:** Implement supplier management module ([eec6a46](https://github.com/charleskx/petsystemcrm-api/commit/eec6a46))
- **sales:** Implement product sales module (PDV) ([4f2a40c](https://github.com/charleskx/petsystemcrm-api/commit/4f2a40c))
- **billing:** Implement billing and subscription management module ([3a99e57](https://github.com/charleskx/petsystemcrm-api/commit/3a99e57))
- **payments:** Add OpenSpec for stripe webhook and subscription guard ([0f53221](https://github.com/charleskx/petsystemcrm-api/commit/0f53221))
- **jobs:** Add graceful shutdown and skip cron in test env ([f123bcf](https://github.com/charleskx/petsystemcrm-api/commit/f123bcf))
- **docs:** Add OpenAPI schemas to all route handlers ([bc72eac](https://github.com/charleskx/petsystemcrm-api/commit/bc72eac))

### 🩹 Fixes

- **auth:** Replace node handler with Web API handler ([52c8cf8](https://github.com/charleskx/petsystemcrm-api/commit/52c8cf8))
- **subscription-guard:** Block past_due tenants with 402 ([b2e41f9](https://github.com/charleskx/petsystemcrm-api/commit/b2e41f9))
- **docker:** Point CMD to index.js entry point instead of server.js ([7cfe8f8](https://github.com/charleskx/petsystemcrm-api/commit/7cfe8f8))

### 💅 Refactors

- **auth:** Replace inline role guards with CASL ability checks ([8db0f2c](https://github.com/charleskx/petsystemcrm-api/commit/8db0f2c))

### 📖 Documentation

- **openspec:** Propose auth module spec ([7759e69](https://github.com/charleskx/petsystemcrm-api/commit/7759e69))

### 📦 Build

- Add docker, makefile, and dev environment setup ([f2368c8](https://github.com/charleskx/petsystemcrm-api/commit/f2368c8))
- **makefile:** Add spec-init target for openspec initialization ([3f8b6cb](https://github.com/charleskx/petsystemcrm-api/commit/3f8b6cb))
- **openspec:** Install and configure openspec dev tooling ([b1bcbee](https://github.com/charleskx/petsystemcrm-api/commit/b1bcbee))
- **openspec:** Replace workflow make targets with slash commands ([a1fe14a](https://github.com/charleskx/petsystemcrm-api/commit/a1fe14a))
- Set up project tooling and add runtime dependencies ([6aefdc3](https://github.com/charleskx/petsystemcrm-api/commit/6aefdc3))
- **test:** Containerize test execution and upgrade vitest to v4 ([937dea0](https://github.com/charleskx/petsystemcrm-api/commit/937dea0))

### 🏡 Chore

- Add project documentation and Claude configuration ([4dd9893](https://github.com/charleskx/petsystemcrm-api/commit/4dd9893))
- Add initial package.json ([3da1dab](https://github.com/charleskx/petsystemcrm-api/commit/3da1dab))
- Add .gitignore and expand .dockerignore patterns ([b421200](https://github.com/charleskx/petsystemcrm-api/commit/b421200))
- Expand .gitignore with tooling and build artifacts ([e199dc1](https://github.com/charleskx/petsystemcrm-api/commit/e199dc1))
- **openspec:** Archive auth-module change and promote specs ([deef14b](https://github.com/charleskx/petsystemcrm-api/commit/deef14b))
- **openspec:** Archive clients change and promote specs ([f1709b9](https://github.com/charleskx/petsystemcrm-api/commit/f1709b9))
- **openspec:** Archive billing and services changes, sync specs ([d65856d](https://github.com/charleskx/petsystemcrm-api/commit/d65856d))
- **openspec:** Archive payments change ([00ad1a3](https://github.com/charleskx/petsystemcrm-api/commit/00ad1a3))

### ✅ Tests

- Use unique CNPJs per suite and allow DATABASE_URL override ([156dfeb](https://github.com/charleskx/petsystemcrm-api/commit/156dfeb))
- **products:** Add integration tests for product category endpoints ([a5ee232](https://github.com/charleskx/petsystemcrm-api/commit/a5ee232))
- **services:** Fix collaborator setup and add global db teardown ([0ad06eb](https://github.com/charleskx/petsystemcrm-api/commit/0ad06eb))

### ❤️ Contributors

- Charleston Amaral ([@charleskx](https://github.com/charleskx))

