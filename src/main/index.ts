import { buildApp } from "./server"
import { env } from "./config/env"
import { startJobs } from "../interfaces/jobs"

async function start() {
	const app = await buildApp()
	try {
		await app.listen({ port: env.PORT, host: "0.0.0.0" })
		startJobs()
	} catch (err) {
		app.log.error(err)
		process.exit(1)
	}
}

start()
