import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability"
import type { MemberRole } from "../../domain/tenant/tenant.entity"

type Actions = "manage" | "create" | "read" | "update" | "delete"
type Subjects =
	| "all"
	| "Tenant"
	| "Member"
	| "Client"
	| "Pet"
	| "Service"
	| "ServicePricing"
	| "WorkSchedule"
	| "Holiday"
	| "Appointment"
	| "Product"
	| "ProductCategory"
	| "StockMovement"
	| "Supplier"
	| "Sale"

export type AppAbility = MongoAbility<[Actions, Subjects]>

export function defineAbilityFor(role: MemberRole): AppAbility {
	const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

	if (role === "owner") {
		can("manage", "all")
	} else if (role === "financial") {
		can("manage", "all")
		cannot(["create", "update", "delete"], "Member")
		cannot("update", "Tenant")
		cannot(["create", "update", "delete"], "Supplier")
		cannot("delete", "Product")
		cannot("delete", "ProductCategory")
	} else {
		// collaborator
		can("read", "all")
		can("create", "Appointment")
		can("create", "StockMovement")
	}

	return build()
}
