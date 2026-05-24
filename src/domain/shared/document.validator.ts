export function validateCPF(cpf: string): boolean {
	const cleaned = cpf.replace(/\D/g, "")
	if (cleaned.length !== 11) return false
	if (/^(\d)\1+$/.test(cleaned)) return false

	let sum = 0
	for (let i = 0; i < 9; i++) sum += Number(cleaned[i]) * (10 - i)
	let remainder = (sum * 10) % 11
	if (remainder === 10 || remainder === 11) remainder = 0
	if (remainder !== Number(cleaned[9])) return false

	sum = 0
	for (let i = 0; i < 10; i++) sum += Number(cleaned[i]) * (11 - i)
	remainder = (sum * 10) % 11
	if (remainder === 10 || remainder === 11) remainder = 0
	return remainder === Number(cleaned[10])
}

export function validateCNPJ(cnpj: string): boolean {
	const cleaned = cnpj.replace(/\D/g, "")
	if (cleaned.length !== 14) return false
	if (/^(\d)\1+$/.test(cleaned)) return false

	const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
	const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

	let sum = w1.reduce((acc, w, i) => acc + Number(cleaned[i]) * w, 0)
	let rem = sum % 11
	if ((rem < 2 ? 0 : 11 - rem) !== Number(cleaned[12])) return false

	sum = w2.reduce((acc, w, i) => acc + Number(cleaned[i]) * w, 0)
	rem = sum % 11
	return (rem < 2 ? 0 : 11 - rem) === Number(cleaned[13])
}

export function validateDocument(document: string, type: "cpf" | "cnpj"): boolean {
	return type === "cpf" ? validateCPF(document) : validateCNPJ(document)
}
