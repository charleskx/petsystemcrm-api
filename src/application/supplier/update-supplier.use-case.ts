import { and, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { suppliers } from "../../infra/database/drizzle/schema"
import type { SupplierProps } from "../../domain/supplier/supplier.entity"
import { validateCPF, validateCNPJ } from "../../domain/shared/document.validator"
import { SupplierNotFoundError } from "./get-supplier.use-case"
import { InvalidDocumentError } from "./create-supplier.use-case"

export interface UpdateSupplierInput {
	id: string
	tenantId: string
	name?: string
	document?: string | null
	email?: string | null
	phone?: string | null
	addressZip?: string | null
	addressStreet?: string | null
	addressCity?: string | null
	addressState?: string | null
	contactName?: string | null
}

function validateDocument(doc: string): boolean {
	const cleaned = doc.replace(/\D/g, "")
	if (cleaned.length === 11) return validateCPF(cleaned)
	if (cleaned.length === 14) return validateCNPJ(cleaned)
	return false
}

export async function updateSupplier(input: UpdateSupplierInput): Promise<SupplierProps> {
	const { id, tenantId, ...fields } = input

	if (fields.document && !validateDocument(fields.document)) {
		throw new InvalidDocumentError()
	}

	const [existing] = await db
		.select({ id: suppliers.id })
		.from(suppliers)
		.where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId), eq(suppliers.active, true)))
		.limit(1)

	if (!existing) {
		throw new SupplierNotFoundError()
	}

	const [updated] = await db
		.update(suppliers)
		.set(fields)
		.where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
		.returning()

	return updated as SupplierProps
}
