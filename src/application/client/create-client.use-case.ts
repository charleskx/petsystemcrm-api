import { db } from "../../infra/database/drizzle/client"
import { clients } from "../../infra/database/drizzle/schema"
import type { ClientProps } from "../../domain/client/client.entity"
import { validateCPF } from "../../domain/shared/document.validator"

export interface CreateClientInput {
	tenantId: string
	name: string
	email?: string
	phone: string
	document?: string
	addressZip: string
	addressStreet: string
	addressNumber: string
	addressComplement?: string
	addressNeighborhood: string
	addressCity: string
	addressState: string
}

export class InvalidDocumentError extends Error {
	constructor() {
		super("CPF inválido")
		this.name = "InvalidDocumentError"
	}
}

export async function createClient(input: CreateClientInput): Promise<ClientProps> {
	if (input.document) {
		const cleaned = input.document.replace(/\D/g, "")
		if (!validateCPF(cleaned)) {
			throw new InvalidDocumentError()
		}
	}

	const [client] = await db
		.insert(clients)
		.values({
			tenantId: input.tenantId,
			name: input.name,
			email: input.email ?? null,
			phone: input.phone,
			document: input.document ?? null,
			addressZip: input.addressZip,
			addressStreet: input.addressStreet,
			addressNumber: input.addressNumber,
			addressComplement: input.addressComplement ?? null,
			addressNeighborhood: input.addressNeighborhood,
			addressCity: input.addressCity,
			addressState: input.addressState,
		})
		.returning()

	return client as ClientProps
}
