import { and, eq } from "drizzle-orm"
import { db } from "../../infra/database/drizzle/client"
import { clients } from "../../infra/database/drizzle/schema"
import type { ClientProps } from "../../domain/client/client.entity"
import { validateCPF } from "../../domain/shared/document.validator"
import { ClientNotFoundError } from "./get-client.use-case"
import { InvalidDocumentError } from "./create-client.use-case"

export interface UpdateClientInput {
	id: string
	tenantId: string
	name?: string
	email?: string | null
	phone?: string
	document?: string | null
	addressZip?: string
	addressStreet?: string
	addressNumber?: string
	addressComplement?: string | null
	addressNeighborhood?: string
	addressCity?: string
	addressState?: string
}

export async function updateClient(input: UpdateClientInput): Promise<ClientProps> {
	const { id, tenantId, ...fields } = input

	if (fields.document) {
		const cleaned = fields.document.replace(/\D/g, "")
		if (!validateCPF(cleaned)) {
			throw new InvalidDocumentError()
		}
	}

	const [existing] = await db
		.select({ id: clients.id })
		.from(clients)
		.where(and(eq(clients.id, id), eq(clients.tenantId, tenantId), eq(clients.active, true)))
		.limit(1)

	if (!existing) {
		throw new ClientNotFoundError()
	}

	const [updated] = await db
		.update(clients)
		.set(fields)
		.where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
		.returning()

	return updated as ClientProps
}
