import { and, eq } from "drizzle-orm"
import type { ClientProps } from "../../domain/client/client.entity"
import { db } from "../../infra/database/drizzle/client"
import { clients } from "../../infra/database/drizzle/schema"

export class ClientNotFoundError extends Error {
	constructor() {
		super("Cliente não encontrado")
		this.name = "ClientNotFoundError"
	}
}

export async function getClient(id: string, tenantId: string): Promise<ClientProps> {
	const [client] = await db
		.select()
		.from(clients)
		.where(and(eq(clients.id, id), eq(clients.tenantId, tenantId), eq(clients.active, true)))
		.limit(1)

	if (!client) {
		throw new ClientNotFoundError()
	}

	return client as ClientProps
}
