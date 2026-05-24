import { eq } from "drizzle-orm"
import type { Readable } from "node:stream"
import { db } from "../../infra/database/drizzle/client"
import { tenants } from "../../infra/database/drizzle/schema"
import { uploadToR2, deleteFromR2, keyFromUrl } from "../../infra/storage/r2"
import { getTenant, TenantNotFoundError } from "./get-tenant.use-case"

export { TenantNotFoundError }

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE = 5 * 1024 * 1024

export class InvalidLogoError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "InvalidLogoError"
	}
}

export interface UploadTenantLogoInput {
	tenantId: string
	stream: Readable
	mimetype: string
	fileSize: number
}

export async function uploadTenantLogo(input: UploadTenantLogoInput): Promise<{ logoUrl: string }> {
	const { tenantId, stream, mimetype, fileSize } = input

	if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
		throw new InvalidLogoError("Formato de arquivo não suportado. Use JPEG, PNG ou WebP")
	}

	if (fileSize > MAX_FILE_SIZE) {
		throw new InvalidLogoError("Arquivo muito grande. O tamanho máximo permitido é 5 MB")
	}

	const tenant = await getTenant(tenantId)

	if (tenant.logoUrl) {
		const oldKey = keyFromUrl(tenant.logoUrl)
		await deleteFromR2(oldKey).catch(() => {})
	}

	const ext = mimetype === "image/jpeg" ? "jpg" : mimetype === "image/png" ? "png" : "webp"
	const key = `tenants/${tenantId}/logo.${ext}`
	const logoUrl = await uploadToR2(key, stream, mimetype)

	await db.update(tenants).set({ logoUrl }).where(eq(tenants.id, tenantId))

	return { logoUrl }
}
