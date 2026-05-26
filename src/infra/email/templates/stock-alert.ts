import type { AlertType } from "../../../application/product/get-product-alerts.use-case"

interface AlertProduct {
	name: string
	quantity: number
	minQuantity: number
	expiryDate: Date | null
	alertTypes: AlertType[]
}

interface StockAlertEmailProps {
	tenantName: string
	lowStockProducts: AlertProduct[]
	nearExpiryProducts: AlertProduct[]
}

function formatDate(date: Date): string {
	return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function productRow(name: string, detail: string): string {
	return `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#374151;font-size:14px;">${name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:14px;text-align:right;">${detail}</td>
    </tr>`
}

function section(title: string, color: string, rows: string): string {
	return `
  <div style="margin-bottom:24px;">
    <h2 style="font-size:16px;font-weight:600;color:${color};margin:0 0 12px 0;">${title}</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
      <tbody>${rows}</tbody>
    </table>
  </div>`
}

export function renderStockAlertEmail({
	tenantName,
	lowStockProducts,
	nearExpiryProducts,
}: StockAlertEmailProps): string {
	const lowStockRows = lowStockProducts
		.map((p) => productRow(p.name, `${p.quantity} / mín ${p.minQuantity}`))
		.join("")

	const nearExpiryRows = nearExpiryProducts
		.map((p) => productRow(p.name, p.expiryDate ? `Vence em ${formatDate(p.expiryDate)}` : ""))
		.join("")

	const sections = [
		lowStockProducts.length > 0 ? section("Estoque Baixo", "#dc2626", lowStockRows) : "",
		nearExpiryProducts.length > 0 ? section("Próximos da Validade", "#d97706", nearExpiryRows) : "",
	].join("")

	return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Alerta de Estoque — ${tenantName}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:#1e3a5f;padding:24px 32px;border-radius:8px 8px 0 0;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">PetSystem CRM</p>
              <p style="margin:4px 0 0 0;color:#93c5fd;font-size:13px;">Alerta de Estoque</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
              <p style="margin:0 0 8px 0;color:#111827;font-size:15px;">Olá, <strong>${tenantName}</strong></p>
              <p style="margin:0 0 24px 0;color:#6b7280;font-size:14px;">Os produtos abaixo precisam de atenção hoje:</p>
              ${sections}
              <p style="margin:24px 0 0 0;color:#9ca3af;font-size:12px;">Este e-mail é enviado automaticamente pelo PetSystem CRM. Para desativar os alertas, entre em contato com o suporte.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
