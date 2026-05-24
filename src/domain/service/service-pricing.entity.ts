import type { PetSize } from "../pet/pet.entity"

export interface ServicePricingProps {
	id: string
	serviceId: string
	petSize: PetSize
	price: string
}
