import { defineConfig } from "drizzle-kit"

export default defineConfig({
	schema: "./src/infra/database/drizzle/schema/index.ts",
	out: "./src/infra/database/drizzle/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
})
