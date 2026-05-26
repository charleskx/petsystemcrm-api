export const errorSchema = {
	type: "object",
	properties: {
		error: { type: "string" },
	},
} as const

export const notFoundSchema = errorSchema
export const unauthorizedSchema = errorSchema
export const forbiddenSchema = errorSchema
export const unprocessableSchema = errorSchema
export const paymentRequiredSchema = errorSchema
