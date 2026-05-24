import { boolean, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core"
import { user } from "./auth"

export const documentTypeEnum = pgEnum("document_type", ["cpf", "cnpj"])
export const pixKeyTypeEnum = pgEnum("pix_key_type", ["cpf", "cnpj", "email", "phone", "random"])
export const planEnum = pgEnum("plan", ["essential", "premium"])
export const subscriptionStatusEnum = pgEnum("subscription_status", [
	"trial",
	"active",
	"expired",
	"cancelled",
	"past_due",
])
export const memberRoleEnum = pgEnum("member_role", ["owner", "financial", "collaborator"])

export const tenants = pgTable("tenants", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: varchar("name", { length: 255 }).notNull(),
	document: varchar("document", { length: 18 }).notNull().unique(),
	documentType: documentTypeEnum("document_type").notNull(),
	logoUrl: text("logo_url"),
	pixKey: varchar("pix_key", { length: 255 }),
	pixKeyType: pixKeyTypeEnum("pix_key_type"),
	plan: planEnum("plan").notNull().default("essential"),
	subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default("trial"),
	trialEndsAt: timestamp("trial_ends_at").notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	active: boolean("active").notNull().default(true),
	createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const tenantMembers = pgTable("tenant_members", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	role: memberRoleEnum("role").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const tenantInvitations = pgTable("tenant_invitations", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id, { onDelete: "cascade" }),
	email: varchar("email", { length: 255 }).notNull(),
	role: memberRoleEnum("role").notNull(),
	token: text("token").notNull().unique(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
})
