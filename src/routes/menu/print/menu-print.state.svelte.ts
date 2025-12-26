import type { MenuSummary, MenuModifierOption } from '$lib/types/menu';

export class MenuPrintState {
	menu: MenuSummary;
	// itemId -> Set of modifierIds that are COMPLETELY hidden
	hiddenModifiers = $state<Map<string, Set<string>>>(new Map());
	
	// itemId -> Set of "modifierId::optionName" that are hidden
	hiddenOptions = $state<Map<string, Set<string>>>(new Map());

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
		} catch (e) {
			console.error('Failed to save menu print state:', e);
		}
	}

	toggleModifier(itemId: string, modifierId: string) {
		const currentSet = this.hiddenModifiers.get(itemId) || new Set();
		if (currentSet.has(modifierId)) {
			currentSet.delete(modifierId);
			if (currentSet.size === 0) {
				this.hiddenModifiers.delete(itemId);
			} else {
				this.hiddenModifiers.set(itemId, currentSet);
			}
		} else {
			currentSet.add(modifierId);
			this.hiddenModifiers.set(itemId, currentSet);
		}
		
		this.hiddenModifiers = new Map(this.hiddenModifiers);
		this.saveState();
	}

	toggleOption(itemId: string, modifierId: string, optionName: string) {
		const key = `${modifierId}::${optionName}`;
		const currentSet = this.hiddenOptions.get(itemId) || new Set();
		
		if (currentSet.has(key)) {
			currentSet.delete(key);
			if (currentSet.size === 0) {
				this.hiddenOptions.delete(itemId);
			} else {
				this.hiddenOptions.set(itemId, currentSet);
			}
		} else {
			currentSet.add(key);
			this.hiddenOptions.set(itemId, currentSet);
		}
		
		this.hiddenOptions = new Map(this.hiddenOptions);
		this.saveState();
	}

	hideAllForItem(itemId: string) {
		const item = this.findItem(itemId);
		if (!item?.modifiers) return;

		const set = new Set(item.modifiers.map((m) => m.id));
		this.hiddenModifiers.set(itemId, set);
		this.hiddenModifiers = new Map(this.hiddenModifiers);
		this.saveState();
	}

	showAllForItem(itemId: string) {
		this.hiddenModifiers.delete(itemId);
		this.hiddenOptions.delete(itemId); // Also clear hidden options
		
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

	isModifierVisible(itemId: string, modifierId: string) {
		return !this.hiddenModifiers.get(itemId)?.has(modifierId);
	}

	isOptionVisible(itemId: string, modifierId: string, optionName: string) {
		// If the whole modifier is hidden, the option is effectively hidden
		if (this.hiddenModifiers.get(itemId)?.has(modifierId)) return false;
		
		const key = `${modifierId}::${optionName}`;
		return !this.hiddenOptions.get(itemId)?.has(key);
	}

	getVisibleModifiers(itemId: string) {
		const item = this.findItem(itemId);
		if (!item?.modifiers) return [];
		return item.modifiers.filter((m) => !this.hiddenModifiers.get(itemId)?.has(m.id));
	}

	// Returns a flat list of visible options for an item
	// Used for the final print view which ignores modifier grouping/names
	getFlatVisibleOptions(itemId: string): MenuModifierOption[] {
		const item = this.findItem(itemId);
		if (!item?.modifiers) return [];

		const options: MenuModifierOption[] = [];
		const itemHiddenModifiers = this.hiddenModifiers.get(itemId);
		const itemHiddenOptions = this.hiddenOptions.get(itemId);

		for (const modifier of item.modifiers) {
			if (itemHiddenModifiers?.has(modifier.id)) continue;

			for (const option of modifier.options) {
				const key = `${modifier.id}::${option.name}`;
				if (!itemHiddenOptions?.has(key)) {
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
}
