import { buildApp } from "./server"
import { env } from "./config/env"
import { startJobs } from "../interfaces/jobs"

async function start() {
	const app = await buildApp()
	try {
		await app.listen({ port: env.PORT, host: "0.0.0.0" })

		if (env.NODE_ENV !== "test") {
			const cronTask = startJobs()

			const shutdown = async () => {
				app.log.info("Encerrando servidor...")
				cronTask.stop()
				await app.close()
			}

			process.on("SIGTERM", shutdown)
			process.on("SIGINT", shutdown)
		}
	} catch (err) {
		app.log.error(err)
		process.exit(1)
	}
}

start()
