import { Resend } from "resend"
import { env } from "../../main/config/env"

let _client: Resend | null = null

export function getResend(): Resend {
	if (!_client) {
		_client = new Resend(env.RESEND_API_KEY!)
	}
	return _client
}
