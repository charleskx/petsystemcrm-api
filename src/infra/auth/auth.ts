import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { organization } from "better-auth/plugins"
import { env } from "../../main/config/env"
import { db } from "../database/drizzle/client"
import * as schema from "../database/drizzle/schema"

export const auth = betterAuth({
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.API_URL,
	basePath: "/auth",
	trustedOrigins: env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
	database: drizzleAdapter(db, {
		provider: "pg",
		camelCase: true,
		schema: {
			user: schema.user,
			session: schema.session,
			account: schema.account,
			verification: schema.verification,
			organization: schema.organization,
			member: schema.member,
			invitation: schema.invitation,
		},
	}),
	emailAndPassword: {
		enabled: true,
	},
	plugins: [organization()],
})
