import { validateCNPJ, validateCPF } from "../../domain/shared/document.validator"
import type { SupplierProps } from "../../domain/supplier/supplier.entity"
import { db } from "../../infra/database/drizzle/client"
import { suppliers } from "../../infra/database/drizzle/schema"

export class InvalidDocumentError extends Error {
	constructor() {
		super("Documento inválido (CPF ou CNPJ)")
		this.name = "InvalidDocumentError"
	}
}

export interface CreateSupplierInput {
	tenantId: string
	name: string
	document?: string
	email?: string
	phone?: string
	addressZip?: string
	addressStreet?: string
	addressCity?: string
	addressState?: string
	contactName?: string
}

function validateDocument(doc: string): boolean {
	const cleaned = doc.replace(/\D/g, "")
	if (cleaned.length === 11) return validateCPF(cleaned)
	if (cleaned.length === 14) return validateCNPJ(cleaned)
	return false
}

export async function createSupplier(input: CreateSupplierInput): Promise<SupplierProps> {
	if (input.document && !validateDocument(input.document)) {
		throw new InvalidDocumentError()
	}

	const [supplier] = await db
		.insert(suppliers)
		.values({
			tenantId: input.tenantId,
			name: input.name,
			document: input.document ?? null,
			email: input.email ?? null,
			phone: input.phone ?? null,
			addressZip: input.addressZip ?? null,
			addressStreet: input.addressStreet ?? null,
			addressCity: input.addressCity ?? null,
			addressState: input.addressState ?? null,
			contactName: input.contactName ?? null,
		})
		.returning()

	return supplier as SupplierProps
}
