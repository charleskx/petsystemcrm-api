import { index, integer, numeric, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { clients } from "./clients"
import { products } from "./products"
import { tenants } from "./tenants"

export const saleChannelEnum = pgEnum("sale_channel", ["in_store", "online"])
export const salePaymentMethodEnum = pgEnum("sale_payment_method", [
	"pix",
	"credit_card",
	"debit_card",
	"cash",
	"other",
])
export const saleStatusEnum = pgEnum("sale_status", ["pending", "paid", "cancelled"])

export const sales = pgTable(
	"sales",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
		channel: saleChannelEnum("channel").notNull().default("in_store"),
		totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
		paymentMethod: salePaymentMethodEnum("payment_method").notNull(),
		status: saleStatusEnum("status").notNull().default("pending"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		index("sales_tenant_status_idx").on(table.tenantId, table.status),
		index("sales_tenant_client_idx").on(table.tenantId, table.clientId),
		index("sales_tenant_created_idx").on(table.tenantId, table.createdAt),
	],
)

export const saleItems = pgTable(
	"sale_items",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		saleId: text("sale_id")
			.notNull()
			.references(() => sales.id, { onDelete: "cascade" }),
		productId: text("product_id")
			.notNull()
			.references(() => products.id, { onDelete: "restrict" }),
		quantity: integer("quantity").notNull(),
		unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
	},
	(table) => [index("sale_items_sale_idx").on(table.saleId)],
)
