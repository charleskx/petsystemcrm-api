import { schedule, type ScheduledTask } from "node-cron"
import { runStockAlertsJob } from "./stock-alerts.job"

export function startJobs(): ScheduledTask {
	// Daily at 08:00 Brasília time
	const task = schedule("0 8 * * *", () => void runStockAlertsJob(), { timezone: "America/Sao_Paulo" })
	console.log("[jobs] stock-alerts agendado para 08h (America/Sao_Paulo)")
	return task
}
