### Casa Luma Menu System (Notion → Loyverse-ready)

This setup is meant to be a single source of truth for what you sell, and a clean structure your backend can sync into Loyverse.

---

## 1) Menu Items (the core catalog)

**Menu Items** is the main list of everything that can appear on the cafe POS menu: drinks, food, kids items, desserts.

Each row is “one product” from an operator point of view (what staff sees and taps), with:

- a base description and base price (when relevant)
- categorization for organizing the menu
- optional add-ons behavior through **modifiers**
- optional “choose a version” behavior through **variants**

This is the database you update most often as the menu evolves.

---

## 2) Variants (mutually exclusive versions of the same item)

A **variant** is a *version of the same menu item where the customer must pick exactly one*.

Use variants when:

- the choice is mutually exclusive (you cannot pick two at once)
- it might change price (or at least you want it represented as a distinct version for reporting)

Example:

- **Eggs Your Way** → customer chooses exactly one egg type:
    - Fried
    - Omelet
    - Scrambled
    - Poached

Conceptually:

- The Menu Item is the “parent”
- The variant is the “selected version” that Loyverse treats like a distinct sellable selection inside that parent item

---

## 3) Modifiers (optional add-ons that can stack)

A **modifier** is an optional set of choices that can be added *on top of* an item, usually to customize it.

Use modifiers when:

- customers can add extras
- multiple modifiers might apply to the same item
- each option can have an added price (like +30 THB)

Examples:

- Coffee modifier “Size” → Small / Large (+30)
- Food modifier “Add-ons” → Feta (+40), Avocado (+40), Bacon (+60)

How we’re storing it in Notion:

- You create a modifier as one record in the **POS Modifiers** database.
- The options for that modifier live *inside that modifier record* (so your backend can sync it as one object, just like Loyverse expects).

Then your backend can link modifiers to menu items during syncing (since Loyverse items reference modifiers by ID).

---

## 4) Recipes (cost-of-goods source)

**Recipes** describe what each menu item costs to make. A recipe links back to one or more **Menu Items** through `Recipes.Menu Item`.

For POS syncing:

- **Menu Items** remain the sellable catalog: name, description, category, price, variants, and modifiers.
- **Recipes** are the COGS source for those sellable items.
- COGS is calculated from related **Recipe Lines** by summing each line’s `Line Cost`. This is preferred over the `Recipes.COGS` rollup because Notion rollups can be stale/zero through the API.
- The Menu Items sync writes the selected recipe COGS into Loyverse variant `cost` and `purchase_cost` fields. For now, the same average recipe COGS is applied to all variants of a menu item.
- If multiple linked recipes have usable COGS, the sync chooses deterministically and surfaces a warning. If no usable recipe COGS exists, it leaves existing Loyverse costs unchanged.

---

## 5) Discounts (predefined discount buttons for staff)

**Discounts** are a simple list of discount options that staff can apply at checkout.

Use discounts when:

- you want consistent discount buttons (like soft-opening promos)
- you do not want staff typing custom discounts every time

Example:

- **Soft Opening -30%** → applies to the whole ticket.

Discounts don’t change often. Think of them like “POS configuration” rather than “menu content”.

---

## 6) Where things live (quick mental map)

- **Menu Items** = what you sell (the main menu catalog)
- **Recipes** = what those items cost to make, linked back to Menu Items for POS COGS sync
- **Recipe Lines** = ingredient/amount rows whose `Line Cost` formulas are summed into recipe COGS
- **Variants** = mutually exclusive versions of a menu item (chosen once)
- **Modifiers** = add-ons/customizations applied on top of an item (can stack)
- **Discounts** = checkout-level promotion buttons staff can apply

---

## 7) How you use it day-to-day

1. Add or update items in **Menu Items**
2. Link a **Recipe** to each Menu Item when you want POS COGS synced
3. If an item needs “choose one version”, set it up as **variants**
4. If an item needs “optional extras”, assign **modifiers**
5. Keep **discounts** as your approved promo list (like the 30% soft opening)
6. Your backend sync reads these sources and pushes them into Loyverse in the right structure

That’s the whole “0 to hero” model: Menu Items are the center, Recipes provide COGS, Variants handle “choose one,” Modifiers handle “add extras,” Discounts handle promos at checkout.