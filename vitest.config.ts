import { defineConfig } from "vitest/config"

// When running inside Docker the DATABASE_URL points to the postgres service name.
// On the host it falls back to localhost.
const databaseUrl =
	process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/petsystemcrm_test"

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		env: {
			NODE_ENV: "test",
			DATABASE_URL: databaseUrl,
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
