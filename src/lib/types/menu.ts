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
	grandCategory: string;
	category: string;
	description: string;
	price: number;
	secondaryPrice?: number;
	currency?: string;
	dietaryTags: DietaryTag[];
	allergens: string[];
	highlight: boolean;
	isAvailable: boolean;
	archived: boolean;
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

export interface MenuGrandCategory {
	id: string;
	name: string;
	sections: StructuredMenuSection[];
}

export interface MenuSummary {
	grandCategories: MenuGrandCategory[];
	sections: StructuredMenuSection[];
	highlights: MenuItem[];
	tags: string[];
	dietaryTags: DietaryTag[];
}

