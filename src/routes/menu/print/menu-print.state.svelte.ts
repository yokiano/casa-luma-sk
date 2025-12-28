import type { MenuSummary, MenuModifierOption, StructuredMenuSection, MenuModifier } from '$lib/types/menu';

export class MenuPrintState {
	menu: MenuSummary;
	// itemId/sectionId -> Set of modifierIds that are COMPLETELY hidden
	hiddenModifiers = $state<Map<string, Set<string>>>(new Map());
	
	// itemId/sectionId -> Set of "modifierId::optionName" that are hidden
	hiddenOptions = $state<Map<string, Set<string>>>(new Map());

	// sectionId -> Set of manually attached modifier IDs
	manualSectionModifiers = $state<Map<string, Set<string>>>(new Map());

	// sectionId/grandCategoryId -> custom description
	customDescriptions = $state<Map<string, string>>(new Map());

	// modifierId -> custom description
	modifierDescriptions = $state<Map<string, string>>(new Map());

	constructor(menu: MenuSummary) {
		this.menu = menu;
		this.loadState();
	}

	loadState() {
		if (typeof localStorage === 'undefined') return;
		try {
			// Load hidden modifiers
			const storedModifiers = localStorage.getItem('menu-print-hidden-modifiers');
			if (storedModifiers) {
				const parsed = JSON.parse(storedModifiers);
				this.hiddenModifiers = new Map(
					parsed.map(([itemId, modifierIds]: [string, string[]]) => [
						itemId,
						new Set(modifierIds)
					])
				);
			}

			// Load hidden options
			const storedOptions = localStorage.getItem('menu-print-hidden-options');
			if (storedOptions) {
				const parsed = JSON.parse(storedOptions);
				this.hiddenOptions = new Map(
					parsed.map(([itemId, optionKeys]: [string, string[]]) => [
						itemId,
						new Set(optionKeys)
					])
				);
			}

			// Load manual section modifiers
			const storedManual = localStorage.getItem('menu-print-manual-section-modifiers');
			if (storedManual) {
				const parsed = JSON.parse(storedManual);
				this.manualSectionModifiers = new Map(
					parsed.map(([sectionId, modifierIds]: [string, string[]]) => [
						sectionId,
						new Set(modifierIds)
					])
				);
			}

			// Load custom descriptions
			const storedDescriptions = localStorage.getItem('menu-print-custom-descriptions');
			if (storedDescriptions) {
				const parsed = JSON.parse(storedDescriptions);
				this.customDescriptions = new Map(parsed);
			}

			// Load modifier descriptions
			const storedModifierDescriptions = localStorage.getItem('menu-print-modifier-descriptions');
			if (storedModifierDescriptions) {
				const parsed = JSON.parse(storedModifierDescriptions);
				this.modifierDescriptions = new Map(parsed);
			}
		} catch (e) {
			console.error('Failed to load menu print state:', e);
		}
	}

	saveState() {
		if (typeof localStorage === 'undefined') return;
		try {
			// Save hidden modifiers
			const serializedModifiers = Array.from(this.hiddenModifiers.entries()).map(
				([itemId, modifierIds]) => [itemId, Array.from(modifierIds)]
			);
			localStorage.setItem('menu-print-hidden-modifiers', JSON.stringify(serializedModifiers));

			// Save hidden options
			const serializedOptions = Array.from(this.hiddenOptions.entries()).map(
				([itemId, optionKeys]) => [itemId, Array.from(optionKeys)]
			);
			localStorage.setItem('menu-print-hidden-options', JSON.stringify(serializedOptions));

			// Save manual section modifiers
			const serializedManual = Array.from(this.manualSectionModifiers.entries()).map(
				([sectionId, modifierIds]) => [sectionId, Array.from(modifierIds)]
			);
			localStorage.setItem('menu-print-manual-section-modifiers', JSON.stringify(serializedManual));

			// Save custom descriptions
			const serializedDescriptions = Array.from(this.customDescriptions.entries());
			localStorage.setItem('menu-print-custom-descriptions', JSON.stringify(serializedDescriptions));

			// Save modifier descriptions
			const serializedModifierDescriptions = Array.from(this.modifierDescriptions.entries());
			localStorage.setItem('menu-print-modifier-descriptions', JSON.stringify(serializedModifierDescriptions));
		} catch (e) {
			console.error('Failed to save menu print state:', e);
		}
	}

	toggleManualModifier(sectionId: string, modifierId: string) {
		const currentSet = this.manualSectionModifiers.get(sectionId) || new Set();
		if (currentSet.has(modifierId)) {
			currentSet.delete(modifierId);
			if (currentSet.size === 0) {
				this.manualSectionModifiers.delete(sectionId);
			} else {
				this.manualSectionModifiers.set(sectionId, currentSet);
			}
			// When removing a manual modifier, also cleanup its visibility state
			this.toggleModifier(sectionId, modifierId); // Ensure it's not "hidden" anymore (reset state)
		} else {
			currentSet.add(modifierId);
			this.manualSectionModifiers.set(sectionId, currentSet);
		}
		
		this.manualSectionModifiers = new Map(this.manualSectionModifiers);
		this.saveState();
	}

	toggleModifier(targetId: string, modifierId: string) {
		const currentSet = this.hiddenModifiers.get(targetId) || new Set();
		if (currentSet.has(modifierId)) {
			currentSet.delete(modifierId);
			if (currentSet.size === 0) {
				this.hiddenModifiers.delete(targetId);
			} else {
				this.hiddenModifiers.set(targetId, currentSet);
			}
		} else {
			currentSet.add(modifierId);
			this.hiddenModifiers.set(targetId, currentSet);
		}
		
		this.hiddenModifiers = new Map(this.hiddenModifiers);
		this.saveState();
	}

	toggleOption(targetId: string, modifierId: string, optionName: string) {
		const key = `${modifierId}::${optionName}`;
		const currentSet = this.hiddenOptions.get(targetId) || new Set();
		
		if (currentSet.has(key)) {
			currentSet.delete(key);
			if (currentSet.size === 0) {
				this.hiddenOptions.delete(targetId);
			} else {
				this.hiddenOptions.set(targetId, currentSet);
			}
		} else {
			currentSet.add(key);
			this.hiddenOptions.set(targetId, currentSet);
		}
		
		this.hiddenOptions = new Map(this.hiddenOptions);
		this.saveState();
	}

	hideAllForTarget(targetId: string, modifiers: any[]) {
		if (!modifiers) return;

		const set = new Set(modifiers.map((m) => m.id));
		this.hiddenModifiers.set(targetId, set);
		this.hiddenModifiers = new Map(this.hiddenModifiers);
		this.saveState();
	}

	showAllForTarget(targetId: string) {
		this.hiddenModifiers.delete(targetId);
		this.hiddenOptions.delete(targetId); // Also clear hidden options
		
		this.hiddenModifiers = new Map(this.hiddenModifiers);
		this.hiddenOptions = new Map(this.hiddenOptions);
		this.saveState();
	}

	findItem(itemId: string) {
		for (const grand of this.menu.grandCategories) {
			for (const section of grand.sections) {
				const found = section.items.find((i) => i.id === itemId);
				if (found) return found;
			}
		}
		return null;
	}

	findSection(sectionId: string) {
		for (const grand of this.menu.grandCategories) {
			const found = grand.sections.find((s) => s.id === sectionId);
			if (found) return found;
		}
		return null;
	}

	getSectionModifiers(sectionId: string): MenuModifier[] {
		const section = this.findSection(sectionId);
		if (!section) return [];

		// Start with modifiers from Notion
		const modifiers = [...(section.modifiers || [])];

		// Add manually attached modifiers
		const manualIds = this.manualSectionModifiers.get(sectionId);
		if (manualIds) {
			const allModifiers = this.menu.allModifiers || [];
			for (const id of manualIds) {
				// Avoid duplicates if Notion already has it
				if (!modifiers.find(m => m.id === id)) {
					const found = allModifiers.find(m => m.id === id);
					if (found) modifiers.push(found);
				}
			}
		}
		return modifiers;
	}

	isModifierVisible(targetId: string, modifierId: string) {
		return !this.hiddenModifiers.get(targetId)?.has(modifierId);
	}

	isOptionVisible(targetId: string, modifierId: string, optionName: string) {
		// If the whole modifier is hidden, the option is effectively hidden
		if (this.hiddenModifiers.get(targetId)?.has(modifierId)) return false;
		
		const key = `${modifierId}::${optionName}`;
		return !this.hiddenOptions.get(targetId)?.has(key);
	}

	// Returns a flat list of visible options for an item or section
	getFlatVisibleOptions(targetId: string): MenuModifierOption[] {
		let modifiers: MenuModifier[] = [];
		
		const item = this.findItem(targetId);
		if (item) {
			modifiers = item.modifiers || [];
		} else {
			// For sections, use our helper that combines Notion + Manual
			modifiers = this.getSectionModifiers(targetId);
		}

		if (modifiers.length === 0) return [];

		const options: MenuModifierOption[] = [];
		const targetHiddenModifiers = this.hiddenModifiers.get(targetId);
		const targetHiddenOptions = this.hiddenOptions.get(targetId);

		for (const modifier of modifiers) {
			if (targetHiddenModifiers?.has(modifier.id)) continue;

			for (const option of modifier.options) {
				const key = `${modifier.id}::${option.name}`;
				if (!targetHiddenOptions?.has(key)) {
					options.push(option);
				}
			}
		}
		return options;
	}

	itemsWithModifiers = $derived.by(() => {
		const items = [];
		for (const grand of this.menu.grandCategories) {
			for (const section of grand.sections) {
				for (const item of section.items) {
					if (item.modifiers && item.modifiers.length > 0) {
						items.push(item);
					}
				}
			}
		}
		return items;
	});

	// Return ALL sections, as any section can have manual modifiers
	allSections = $derived.by(() => {
		const sections = [];
		for (const grand of this.menu.grandCategories) {
			for (const section of grand.sections) {
				// Create a unique key by combining grand category name and section name
				// This handles cases where "Comfort Food" appears in multiple grand categories
				const uniqueId = `${grand.id}-${section.id}`;
				// We attach the uniqueKey to the section object we're returning
				// Note: StructuredMenuSection doesn't have uniqueKey, so we might need to cast or just use it in the loop
				// Since we are iterating, we can just return an object that wraps the section and the unique key
				sections.push({ section, uniqueKey: uniqueId });
			}
		}
		return sections;
	});

	// Get custom description for a section or grand category
	getCustomDescription(id: string): string {
		return this.customDescriptions.get(id) || '';
	}

	// Set custom description for a section or grand category
	setCustomDescription(id: string, description: string) {
		if (description.trim()) {
			this.customDescriptions.set(id, description.trim());
		} else {
			this.customDescriptions.delete(id);
		}
		this.customDescriptions = new Map(this.customDescriptions);
		this.saveState();
	}

	// Get all grand categories for description editing
	allGrandCategories = $derived.by(() => {
		return this.menu.grandCategories;
	});

	// Get modifier description
	getModifierDescription(modifierId: string): string {
		return this.modifierDescriptions.get(modifierId) || '';
	}

	// Set modifier description
	setModifierDescription(modifierId: string, description: string) {
		if (description.trim()) {
			this.modifierDescriptions.set(modifierId, description.trim());
		} else {
			this.modifierDescriptions.delete(modifierId);
		}
		this.modifierDescriptions = new Map(this.modifierDescriptions);
		this.saveState();
	}

	// Returns modifiers with their visible options grouped (for display with descriptions)
	getGroupedVisibleModifiers(targetId: string): Array<{ modifier: MenuModifier; options: MenuModifierOption[] }> {
		let modifiers: MenuModifier[] = [];
		
		const item = this.findItem(targetId);
		if (item) {
			modifiers = item.modifiers || [];
		} else {
			modifiers = this.getSectionModifiers(targetId);
		}

		if (modifiers.length === 0) return [];

		const result: Array<{ modifier: MenuModifier; options: MenuModifierOption[] }> = [];
		const targetHiddenModifiers = this.hiddenModifiers.get(targetId);
		const targetHiddenOptions = this.hiddenOptions.get(targetId);

		for (const modifier of modifiers) {
			if (targetHiddenModifiers?.has(modifier.id)) continue;

			const visibleOptions: MenuModifierOption[] = [];
			for (const option of modifier.options) {
				const key = `${modifier.id}::${option.name}`;
				if (!targetHiddenOptions?.has(key)) {
					visibleOptions.push(option);
				}
			}

			if (visibleOptions.length > 0) {
				result.push({ modifier, options: visibleOptions });
			}
		}
		return result;
	}
}
