import { z } from "zod"

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	PORT: z.coerce.number().default(3333),
	API_URL: z.string().default("http://localhost:3333"),
	DATABASE_URL: z.string(),
	BETTER_AUTH_SECRET: z.string().min(32),
	R2_ACCOUNT_ID: z.string().optional(),
	R2_ACCESS_KEY_ID: z.string().optional(),
	R2_SECRET_ACCESS_KEY: z.string().optional(),
	R2_BUCKET_NAME: z.string().optional(),
	R2_PUBLIC_URL: z.string().optional(),
	STRIPE_SECRET_KEY: z.string().optional(),
	STRIPE_WEBHOOK_SECRET: z.string().optional(),
	STRIPE_PRICE_ESSENTIAL: z.string().optional(),
	STRIPE_PRICE_PREMIUM: z.string().optional(),
	STRIPE_SUCCESS_URL: z.string().default("http://localhost:3000/billing/success"),
	STRIPE_CANCEL_URL: z.string().default("http://localhost:3000/billing/cancel"),
	RESEND_API_KEY: z.string().optional(),
	GOOGLE_MAPS_API_KEY: z.string().optional(),
	ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
	console.error("Variáveis de ambiente inválidas:")
	console.error(parsed.error.flatten().fieldErrors)
	process.exit(1)
}

export const env = parsed.data
