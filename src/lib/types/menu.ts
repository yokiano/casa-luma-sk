export type DietaryTag =
	| 'Vegetarian'
	| 'Vegan'
	| 'Gluten-Free'
	| 'Dairy-Free'
	| 'Keto'
	| 'Paleo'
	| 'Nut-Free'
	| 'Low-Carb'
	| 'Kid-Friendly';

export type MenuAvailability = 'all-day' | 'breakfast' | 'lunch' | 'dinner' | 'seasonal';

export interface MenuItem {
	id: string;
	name: string;
	slug: string;
	section: string;
	category: string;
	description: string;
	price: number;
	secondaryPrice?: number;
	currency?: string;
	dietaryTags: DietaryTag[];
	allergens: string[];
	highlight: boolean;
	isAvailable: boolean;
	availabilityWindow?: MenuAvailability;
	image?: string;
	gallery?: string[];
	tags: string[];
	order: number;
}

export interface MenuSection {
	id: string;
	name: string;
	intro?: string;
	accentColor?: string;
	backgroundImage?: string;
	order: number;
}

export interface StructuredMenuSection extends MenuSection {
	items: MenuItem[];
}

export interface MenuSummary {
	sections: StructuredMenuSection[];
	highlights: MenuItem[];
	tags: string[];
	dietaryTags: DietaryTag[];
}

