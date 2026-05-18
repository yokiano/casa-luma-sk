export type RecipeSummary = {
	id: string;
	name: string;
	thaiName?: string;
	imageUrl?: string;
	cogs?: number;
	menuItemIds: string[];
	hasIngredientLines: boolean;
	hasInstructions: boolean;
	isComplete: boolean;
	lastEditedTime: string;
};

export type IngredientLine = {
	id: string;
	name: string;
	amount?: number;
	unit?: string;
	lineCost?: number;
	ingredient?: {
		id: string;
		name: string;
		thaiName?: string;
		unit?: string;
		cost?: number;
		department: string[];
		imageUrl?: string;
	};
};

export type MenuItemContext = {
	id: string;
	name: string;
	thaiName?: string;
	description?: string;
	thaiDescription?: string;
	price?: number;
	category?: string;
	grandCategory?: string;
	status?: string;
	order?: number;
	dietaryOptions: string[];
	allergens: string[];
	imageUrl?: string;
};

export type MenuItemSummary = MenuItemContext & {
	recipeIds: string[];
	recipeNames: string[];
	primaryRecipeId?: string;
	recipeCogs?: number;
	recipeStatus: 'complete' | 'incomplete' | 'missing';
};

export type MenuCategoryGroup = {
	category: string;
	items: MenuItemSummary[];
	recipeCount: number;
};

export type MenuGrandCategoryGroup = {
	grandCategory: string;
	categories: MenuCategoryGroup[];
	totalItems: number;
	recipeCount: number;
};

export type RecipeMenuIndex = {
	recipes: RecipeSummary[];
	menuGroups: MenuGrandCategoryGroup[];
};

export type MenuItemGroup = {
	category: string;
	items: MenuItemContext[];
};

export type InstructionBlock = {
	id: string;
	type: string;
	text?: string;
	level?: 1 | 2 | 3;
	checked?: boolean;
	imageUrl?: string;
	children?: InstructionBlock[];
};

export type RecipeDetail = RecipeSummary & {
	instructionsText?: string;
	thaiInstructionsText?: string;
	instructionBlocks: InstructionBlock[];
	ingredientLines: IngredientLine[];
	menuItems: MenuItemContext[];
	menuItemGroups: MenuItemGroup[];
};
