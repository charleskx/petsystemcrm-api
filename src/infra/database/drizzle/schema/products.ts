import {
	boolean,
	index,
	integer,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core"
import { suppliers } from "./suppliers"
import { tenants } from "./tenants"

export const unitTypeEnum = pgEnum("unit_type", ["unit", "gram"])
export const stockMovementTypeEnum = pgEnum("stock_movement_type", ["in", "out"])

export const productCategories = pgTable("product_categories", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id, { onDelete: "cascade" }),
	name: varchar("name", { length: 255 }).notNull(),
})

export const products = pgTable(
	"products",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		supplierId: text("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
		categoryId: text("category_id").references(() => productCategories.id, {
			onDelete: "set null",
		}),
		name: varchar("name", { length: 255 }).notNull(),
		barcode: varchar("barcode", { length: 100 }),
		sku: varchar("sku", { length: 100 }),
		brand: varchar("brand", { length: 100 }),
		unitType: unitTypeEnum("unit_type").notNull(),
		costPrice: numeric("cost_price", { precision: 10, scale: 2 }).notNull(),
		marginPercent: numeric("margin_percent", { precision: 5, scale: 2 }).notNull(),
		salePrice: numeric("sale_price", { precision: 10, scale: 2 }).notNull(),
		quantity: integer("quantity").notNull().default(0),
		minQuantity: integer("min_quantity").notNull().default(0),
		expiryDate: timestamp("expiry_date"),
		active: boolean("active").notNull().default(true),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		index("products_tenant_active_idx").on(table.tenantId, table.active),
		index("products_tenant_stock_idx").on(table.tenantId, table.quantity, table.minQuantity),
		index("products_tenant_expiry_idx").on(table.tenantId, table.expiryDate),
	],
)

export const stockMovements = pgTable(
	"stock_movements",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		productId: text("product_id")
			.notNull()
			.references(() => products.id, { onDelete: "cascade" }),
		type: stockMovementTypeEnum("type").notNull(),
		quantity: integer("quantity").notNull(),
		reason: text("reason").notNull(),
		referenceId: text("reference_id"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [index("stock_movements_tenant_product_idx").on(table.tenantId, table.productId)],
)
