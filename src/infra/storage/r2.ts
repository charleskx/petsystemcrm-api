import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import type { Readable } from "node:stream"
import { env } from "../../main/config/env"

function getClient(): S3Client {
	return new S3Client({
		region: "auto",
		endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID!,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
		},
	})
}

export async function uploadToR2(key: string, stream: Readable, contentType: string): Promise<string> {
	const client = getClient()
	await client.send(
		new PutObjectCommand({
			Bucket: env.R2_BUCKET_NAME!,
			Key: key,
			Body: stream,
			ContentType: contentType,
		}),
	)
	return `${env.R2_PUBLIC_URL}/${key}`
}

export async function deleteFromR2(key: string): Promise<void> {
	const client = getClient()
	await client.send(
		new DeleteObjectCommand({
			Bucket: env.R2_BUCKET_NAME!,
			Key: key,
		}),
	)
}

export function keyFromUrl(url: string): string {
	return url.replace(`${env.R2_PUBLIC_URL}/`, "")
}
