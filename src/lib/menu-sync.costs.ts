export function buildRecipeCostVariantFields(recipeCogs: number | undefined, includePurchaseCost: boolean) {
	if (recipeCogs === undefined) return {};
	return {
		cost: recipeCogs,
		...(includePurchaseCost ? { purchase_cost: recipeCogs } : {})
	};
}
