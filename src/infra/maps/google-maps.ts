import { env } from "../../main/config/env"

export interface AddressSuggestion {
	description: string
	placeId: string
}

export async function searchAddress(query: string): Promise<AddressSuggestion[]> {
	const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json")
	url.searchParams.set("query", query)
	url.searchParams.set("key", env.GOOGLE_MAPS_API_KEY!)
	url.searchParams.set("language", "pt-BR")
	url.searchParams.set("region", "br")

	const response = await fetch(url.toString())

	if (!response.ok) {
		throw new Error(`Google Maps API error: ${response.status}`)
	}

	const data = (await response.json()) as {
		status: string
		results: Array<{ formatted_address: string; place_id: string }>
	}

	if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
		throw new Error(`Google Maps API returned status: ${data.status}`)
	}

	return (data.results ?? []).map((r) => ({
		description: r.formatted_address,
		placeId: r.place_id,
	}))
}
