import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/petsystemcrm_test",
      BETTER_AUTH_SECRET: "test-secret-minimum-32-chars-long!!",
      API_URL: "http://localhost:3333",
      ALLOWED_ORIGINS: "http://localhost:3000",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["node_modules", "dist", "**/*.test.ts"],
    },
  },
})
