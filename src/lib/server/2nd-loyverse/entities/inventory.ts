import type {
  LoyverseCategory,
  LoyverseClient,
  LoyverseDiscount,
  LoyverseItem,
  LoyverseModifier,
  LoyversePaymentType,
  LoyverseTax
} from '$lib/server/loyverse-client';
import { normalizeEntityName } from '../normalize';

export type EntityKind = 'category' | 'tax' | 'discount' | 'modifier' | 'item' | 'payment_type';

export interface NameIndex<T> {
  byName: Map<string, T[]>;
}

export interface EntityInventories {
  categories: LoyverseCategory[];
  taxes: LoyverseTax[];
  discounts: LoyverseDiscount[];
  modifiers: LoyverseModifier[];
  items: LoyverseItem[];
  paymentTypes: LoyversePaymentType[];
  categoryIndex: NameIndex<LoyverseCategory>;
  taxIndex: NameIndex<LoyverseTax>;
  discountIndex: NameIndex<LoyverseDiscount>;
  modifierIndex: NameIndex<LoyverseModifier>;
  itemIndex: NameIndex<LoyverseItem>;
  paymentTypeIndex: NameIndex<LoyversePaymentType>;
}

const buildNameIndex = <T>(entities: T[], getName: (entity: T) => string | undefined | null): NameIndex<T> => {
  const byName = new Map<string, T[]>();
  for (const entity of entities) {
    const key = normalizeEntityName(getName(entity));
    if (!key) continue;
    const bucket = byName.get(key) ?? [];
    bucket.push(entity);
    byName.set(key, bucket);
  }
  return { byName };
};

export const indexInventories = (input: {
  categories: LoyverseCategory[];
  taxes: LoyverseTax[];
  discounts: LoyverseDiscount[];
  modifiers: LoyverseModifier[];
  items: LoyverseItem[];
  paymentTypes: LoyversePaymentType[];
}): EntityInventories => ({
  ...input,
  categoryIndex: buildNameIndex(input.categories, (c) => c.name),
  taxIndex: buildNameIndex(input.taxes, (t) => t.name),
  discountIndex: buildNameIndex(input.discounts, (d) => d.name),
  modifierIndex: buildNameIndex(input.modifiers, (m) => m.name),
  itemIndex: buildNameIndex(input.items, (i) => i.item_name),
  paymentTypeIndex: buildNameIndex(input.paymentTypes, (p) => p.name)
});

export const loadAccountInventories = async (client: LoyverseClient): Promise<EntityInventories> => {
  const [categories, taxes, discounts, modifiers, items, paymentTypes] = await Promise.all([
    client.getAllCategories(),
    client.getAllTaxes(),
    client.getAllDiscounts(),
    client.getAllModifiers(),
    client.getAllItems(),
    client.getAllPaymentTypes()
  ]);

  return indexInventories({ categories, taxes, discounts, modifiers, items, paymentTypes });
};

export class EntityInventoryCache {
  source: EntityInventories | null = null;
  target: EntityInventories | null = null;
  private loadedAt = 0;
  private readonly ttlMs: number;

  constructor(ttlMs = 5 * 60_000) {
    this.ttlMs = ttlMs;
  }

  isFresh(): boolean {
    return this.loadedAt > 0 && Date.now() - this.loadedAt < this.ttlMs;
  }

  async ensure(source: LoyverseClient, target: LoyverseClient, options?: { force?: boolean }) {
    if (!options?.force && this.isFresh() && this.source && this.target) {
      return { source: this.source, target: this.target };
    }
    const [sourceInv, targetInv] = await Promise.all([
      loadAccountInventories(source),
      loadAccountInventories(target)
    ]);
    this.source = sourceInv;
    this.target = targetInv;
    this.loadedAt = Date.now();
    return { source: sourceInv, target: targetInv };
  }

  refreshTargetIndexes() {
    if (!this.target) return;
    this.target = indexInventories(this.target);
  }
}
