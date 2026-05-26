import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../infra/database/drizzle/client", () => ({
	db: {
		select: vi.fn(),
	},
}))

vi.mock("../../application/product/get-product-alerts.use-case", () => ({
	getProductAlerts: vi.fn(),
}))

vi.mock("../../infra/email/resend", () => ({
	getResend: vi.fn(),
}))

import { getProductAlerts } from "../../application/product/get-product-alerts.use-case"
import { db } from "../../infra/database/drizzle/client"
import { getResend } from "../../infra/email/resend"
import { runStockAlertsJob } from "./stock-alerts.job"

const mockSendEmail = vi.fn()

function makeDbChain(finalResult: unknown) {
	const chain: Record<string, unknown> = {}
	const methods = ["select", "from", "where", "innerJoin", "limit"]
	for (const m of methods) {
		chain[m] = vi.fn().mockReturnValue(chain)
	}
	;(chain.limit as ReturnType<typeof vi.fn>).mockResolvedValue(finalResult)
	;(chain.where as ReturnType<typeof vi.fn>).mockReturnValue(chain)
	return chain
}

beforeEach(() => {
	vi.clearAllMocks()
	;(getResend as ReturnType<typeof vi.fn>).mockReturnValue({ emails: { send: mockSendEmail } })
	mockSendEmail.mockResolvedValue({ id: "email-id" })
})

describe("runStockAlertsJob", () => {
	it("envia e-mail ao owner quando tenant tem produtos em alerta", async () => {
		const tenantList = [{ id: "tenant-1", name: "Petshop do João" }]
		const alerts = [
			{
				id: "p1",
				name: "Ração",
				quantity: 2,
				minQuantity: 5,
				expiryDate: null,
				alertTypes: ["low_stock"],
			},
		]
		const ownerRow = [{ email: "joao@petshop.com", name: "João" }]

		const tenantsChain = makeDbChain(tenantList)
		;(tenantsChain.where as ReturnType<typeof vi.fn>).mockResolvedValue(tenantList)

		const ownerChain = makeDbChain(ownerRow)

		let callCount = 0
		;(db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
			callCount++
			return callCount === 1 ? tenantsChain : ownerChain
		})
		;(getProductAlerts as ReturnType<typeof vi.fn>).mockResolvedValue(alerts)

		await runStockAlertsJob()

		expect(mockSendEmail).toHaveBeenCalledOnce()
		expect(mockSendEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "joao@petshop.com",
				subject: expect.stringContaining("Petshop do João"),
			}),
		)
	})

	it("não envia e-mail quando tenant não tem produtos em alerta", async () => {
		const tenantList = [{ id: "tenant-1", name: "Petshop Silencioso" }]
		const tenantsChain = makeDbChain(tenantList)
		;(tenantsChain.where as ReturnType<typeof vi.fn>).mockResolvedValue(tenantList)

		;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(tenantsChain)
		;(getProductAlerts as ReturnType<typeof vi.fn>).mockResolvedValue([])

		await runStockAlertsJob()

		expect(mockSendEmail).not.toHaveBeenCalled()
	})

	it("não processa tenants com subscription_status expirado (filtrado na query)", async () => {
		// Tenants expired/cancelled are excluded by the DB query (inArray filter).
		// This test verifies that if the query returns no tenants, nothing is sent.
		const tenantsChain = makeDbChain([])
		;(tenantsChain.where as ReturnType<typeof vi.fn>).mockResolvedValue([])

		;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(tenantsChain)

		await runStockAlertsJob()

		expect(getProductAlerts).not.toHaveBeenCalled()
		expect(mockSendEmail).not.toHaveBeenCalled()
	})

	it("erro de envio de um tenant não interrompe os demais", async () => {
		const tenantList = [
			{ id: "tenant-1", name: "Petshop 1" },
			{ id: "tenant-2", name: "Petshop 2" },
		]
		const alert = [
			{
				id: "p1",
				name: "Ração",
				quantity: 1,
				minQuantity: 10,
				expiryDate: null,
				alertTypes: ["low_stock"],
			},
		]
		const ownerRow = [{ email: "owner@petshop.com", name: "Owner" }]

		const tenantsChain = makeDbChain(tenantList)
		;(tenantsChain.where as ReturnType<typeof vi.fn>).mockResolvedValue(tenantList)

		const ownerChain = makeDbChain(ownerRow)

		let selectCall = 0
		;(db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
			selectCall++
			return selectCall === 1 ? tenantsChain : ownerChain
		})
		;(getProductAlerts as ReturnType<typeof vi.fn>).mockResolvedValue(alert)

		mockSendEmail
			.mockRejectedValueOnce(new Error("Resend timeout"))
			.mockResolvedValueOnce({ id: "ok" })

		await expect(runStockAlertsJob()).resolves.not.toThrow()

		// Second tenant still gets its email attempted
		expect(mockSendEmail).toHaveBeenCalledTimes(2)
	})
})
