import { eq } from "drizzle-orm"
import type { Readable } from "node:stream"
import { db } from "../../infra/database/drizzle/client"
import { pets } from "../../infra/database/drizzle/schema"
import { uploadToR2, deleteFromR2, keyFromUrl } from "../../infra/storage/r2"
import { getPet, PetNotFoundError } from "./get-pet.use-case"

export { PetNotFoundError }

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE = 5 * 1024 * 1024

export class InvalidPhotoError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "InvalidPhotoError"
	}
}

export interface UploadPetPhotoInput {
	petId: string
	tenantId: string
	stream: Readable
	mimetype: string
	fileSize: number
}

export async function uploadPetPhoto(input: UploadPetPhotoInput): Promise<{ photoUrl: string }> {
	const { petId, tenantId, stream, mimetype, fileSize } = input

	if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
		throw new InvalidPhotoError("Formato de arquivo não suportado. Use JPEG, PNG ou WebP")
	}

	if (fileSize > MAX_FILE_SIZE) {
		throw new InvalidPhotoError("Arquivo muito grande. O tamanho máximo permitido é 5 MB")
	}

	const pet = await getPet(petId, tenantId)

	if (pet.photoUrl) {
		const oldKey = keyFromUrl(pet.photoUrl)
		await deleteFromR2(oldKey).catch(() => {})
	}

	const ext = mimetype === "image/jpeg" ? "jpg" : mimetype === "image/png" ? "png" : "webp"
	const key = `pets/${petId}/photo.${ext}`
	const photoUrl = await uploadToR2(key, stream, mimetype)

	await db.update(pets).set({ photoUrl }).where(eq(pets.id, petId))

	return { photoUrl }
}
