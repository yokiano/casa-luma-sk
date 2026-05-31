export type BirthdayTrack = 'mon-sat' | 'sunday' | 'smaller-setup';
export type BirthdayCapacityBucket = 'up-to-8' | 'up-to-15';
export type BirthdayMainCourse = 'nuggets-fries' | 'hot-dogs' | 'sandwiches';

export const BIRTHDAY_BASE_PRICING = {
	fullHosted: {
		monSat: 6_000,
		sunday: 8_000,
		includedChildren: 15,
		extraChildMonSat: 400,
		extraChildSunday: 500
	},
	simpleTable: {
		base: 0,
		includedChildren: 8
	}
} as const;

export const BIRTHDAY_PLAYGROUND_PRICING = {
	fullHosted: {
		flat: 4_000,
		extraChildAbove15: 300
	},
	simpleTable: {
		perChild: 320
	}
} as const;

export const BIRTHDAY_MAIN_COURSES: { value: BirthdayMainCourse; label: string; desc?: string }[] = [
	{ value: 'nuggets-fries', label: 'Nuggets & Fries' },
	{ value: 'hot-dogs', label: 'Hot Dogs' },
	{
		value: 'sandwiches',
		label: 'Mixed Sandwiches',
		desc: 'Avocado, cheese, veggies & ham'
	}
];

export const BIRTHDAY_MAIN_COURSE_LABELS: Record<BirthdayMainCourse, string> = {
	'nuggets-fries': 'Nuggets & Fries',
	'hot-dogs': 'Hot Dogs',
	sandwiches: 'Mixed Sandwiches (avocado / cheese / veggies / ham)'
};

export const BIRTHDAY_BUFFET_SECTIONS = [
	{
		title: 'Starters',
		items: ['Fresh veggie sticks with dips', 'Chopped salad']
	},
	{
		title: 'Dessert',
		items: ['Birthday cake', 'Fruit platter']
	},
	{
		title: 'Main course (choose one)',
		items: BIRTHDAY_MAIN_COURSES.map((c) => c.label)
	},
	{
		title: 'Drinks',
		items: ['Water jar', 'Juice jar']
	}
] as const;

export const BIRTHDAY_SIMPLE_TABLE_UPGRADES = [
	{ id: 'buffet', label: 'Buffet', pricePerChild: 500, flat: false },
	{ id: 'cake', label: 'Extra cake', price: 700, flat: true },
	{ id: 'decorations', label: 'Decorations', price: 500, flat: true }
] as const;

export const BIRTHDAY_ACTIVITY_ADDONS = [
	{
		id: 'facePainting',
		label: 'Face painting',
		price: 3_000,
		description: 'Hosted by our expert designer'
	},
	{
		id: 'movementActivity',
		label: 'Movement activity (ages 5+)',
		price: 5_000,
		description: 'Fun physical games & activities by team'
	},
	{
		id: 'plantingWorkshop',
		label: 'Planting & craft workshop',
		price: 6_000,
		description: 'Nature-inspired workshop & creations',
		priceLabel: 'From +6,000 THB'
	}
] as const;

export const BIRTHDAY_PACKAGE_COLUMNS = [
	{
		label: 'Mon–Sat',
		price: `${BIRTHDAY_BASE_PRICING.fullHosted.monSat.toLocaleString()} THB`,
		extraKids: `+${BIRTHDAY_BASE_PRICING.fullHosted.extraChildMonSat.toLocaleString()} THB / child above 15`
	},
	{
		label: 'Sunday',
		price: `${BIRTHDAY_BASE_PRICING.fullHosted.sunday.toLocaleString()} THB`,
		extraKids: `+${BIRTHDAY_BASE_PRICING.fullHosted.extraChildSunday.toLocaleString()} THB / child above 15`
	}
] as const;

export const BIRTHDAY_PACKAGE_ROWS = [
	{ label: 'Price', key: 'price' as const },
	{ label: 'Up to', value: '15 kids' },
	{ label: 'Venue areas', value: 'Garden & Pool' },
	{ label: 'Duration', value: '3 hours' },
	{ label: 'Food & cake', value: 'Included' },
	{ label: 'Waiter', value: 'Included' },
	{ label: 'Decorations', value: 'Included' },
	{ label: 'Music', value: 'Included' },
	{ label: 'Extra kids', key: 'extraKids' as const }
] as const;

export const BIRTHDAY_SIMPLE_TABLE_NOTES = [
	'Dedicated table in the garden',
	'You handle decorations and cake',
	'Optional buffet, cake, and decorations from us',
	'Indoor playground available as a separate add-on'
] as const;

export const BIRTHDAY_PACKAGE_NOTION_LABELS: Record<BirthdayTrack, string> = {
	'mon-sat': 'Mon–Sat Package',
	sunday: 'Sunday Package',
	'smaller-setup': 'Smaller Setup'
};

export function packageLabelToTrack(label: string): BirthdayTrack | null {
	if (label === 'mon-sat' || label === 'sunday' || label === 'smaller-setup') {
		return label;
	}
	const entry = Object.entries(BIRTHDAY_PACKAGE_NOTION_LABELS).find(([, v]) => v === label);
	return entry ? (entry[0] as BirthdayTrack) : null;
}

export function upgradesIncludePlayground(upgrades: string[]): boolean {
	return upgrades.some((u) => u.toLowerCase().includes('indoor playground'));
}

export const BIRTHDAY_PLAYGROUND_ADDON_COPY = {
	fullHosted: `${BIRTHDAY_PLAYGROUND_PRICING.fullHosted.flat.toLocaleString()} THB + ${BIRTHDAY_PLAYGROUND_PRICING.fullHosted.extraChildAbove15.toLocaleString()} THB per child above 15`,
	simpleTable: `${BIRTHDAY_PLAYGROUND_PRICING.simpleTable.perChild.toLocaleString()} THB per child`
} as const;

export interface BirthdayQuoteInput {
	eventDate: string;
	capacityBucket: BirthdayCapacityBucket | null;
	kidsCount: number;
	includePlayground: boolean | null;
	simpleTableBuffet?: boolean;
	simpleTableCake?: boolean;
	simpleTableDecorations?: boolean;
	addonFacePainting?: boolean;
	addonMovementActivity?: boolean;
	addonPlantingWorkshop?: boolean;
}

export interface BirthdayQuoteLineItem {
	label: string;
	amount: number;
	detail?: string;
}

export interface BirthdayQuoteResult {
	track: BirthdayTrack | null;
	lineItems: BirthdayQuoteLineItem[];
	total: number;
}

const BANGKOK_TZ = 'Asia/Bangkok';

export function formatThb(amount: number): string {
	return `${amount.toLocaleString()} THB`;
}

export function isSundayBirthdayDate(dateStr: string): boolean {
	if (!dateStr) return false;
	const day = new Intl.DateTimeFormat('en-US', {
		timeZone: BANGKOK_TZ,
		weekday: 'short'
	}).format(new Date(`${dateStr}T12:00:00`));
	return day === 'Sun';
}

export function deriveBirthdayTrack(
	eventDate: string,
	capacityBucket: BirthdayCapacityBucket | null
): BirthdayTrack | null {
	if (!eventDate || !capacityBucket) return null;
	if (capacityBucket === 'up-to-8') return 'smaller-setup';
	return isSundayBirthdayDate(eventDate) ? 'sunday' : 'mon-sat';
}

export function calculatePlaygroundAddon(
	capacityBucket: BirthdayCapacityBucket | null,
	kidsCount: number,
	includePlayground: boolean
): number {
	if (!includePlayground || !capacityBucket || kidsCount <= 0) return 0;

	if (capacityBucket === 'up-to-8') {
		return kidsCount * BIRTHDAY_PLAYGROUND_PRICING.simpleTable.perChild;
	}

	const { flat, extraChildAbove15 } = BIRTHDAY_PLAYGROUND_PRICING.fullHosted;
	const extraKids = Math.max(0, kidsCount - BIRTHDAY_BASE_PRICING.fullHosted.includedChildren);
	return flat + extraKids * extraChildAbove15;
}

export function getPlaygroundAddonPreview(
	capacityBucket: BirthdayCapacityBucket | null,
	kidsCount: number
): { withPlayground: number; label: string } {
	if (!capacityBucket) {
		return { withPlayground: 0, label: '' };
	}

	if (capacityBucket === 'up-to-8') {
		const perChild = BIRTHDAY_PLAYGROUND_PRICING.simpleTable.perChild;
		const kids = Math.max(kidsCount, 1);
		return {
			withPlayground: kids * perChild,
			label: `${formatThb(perChild)} × ${kids} ${kids === 1 ? 'child' : 'children'}`
		};
	}

	const { flat, extraChildAbove15 } = BIRTHDAY_PLAYGROUND_PRICING.fullHosted;
	const extraKids = Math.max(0, kidsCount - BIRTHDAY_BASE_PRICING.fullHosted.includedChildren);
	const total = flat + extraKids * extraChildAbove15;
	const label =
		extraKids > 0
			? `${formatThb(flat)} + ${extraKids} × ${formatThb(extraChildAbove15)}`
			: formatThb(flat);

	return { withPlayground: total, label };
}

export function getPlaygroundNotionLabel(
	capacityBucket: BirthdayCapacityBucket | null,
	includePlayground: boolean
): string | null {
	if (!includePlayground) return null;
	if (capacityBucket === 'up-to-8') {
		return `Indoor Playground (${BIRTHDAY_PLAYGROUND_PRICING.simpleTable.perChild} THB/child)`;
	}
	return `Indoor Playground (${BIRTHDAY_PLAYGROUND_PRICING.fullHosted.flat} THB + extras)`;
}

export function calculateBirthdayQuote(input: BirthdayQuoteInput): BirthdayQuoteResult {
	const track = deriveBirthdayTrack(input.eventDate, input.capacityBucket);
	const lineItems: BirthdayQuoteLineItem[] = [];
	const kids = input.kidsCount || 0;

	if (!track) {
		return { track: null, lineItems, total: 0 };
	}

	if (track === 'mon-sat') {
		lineItems.push({
			label: 'Full hosted birthday (Mon–Sat)',
			amount: BIRTHDAY_BASE_PRICING.fullHosted.monSat
		});
		if (kids > BIRTHDAY_BASE_PRICING.fullHosted.includedChildren) {
			const extra = kids - BIRTHDAY_BASE_PRICING.fullHosted.includedChildren;
			const amount = extra * BIRTHDAY_BASE_PRICING.fullHosted.extraChildMonSat;
			lineItems.push({
				label: 'Extra children',
				amount,
				detail: `${extra} × ${formatThb(BIRTHDAY_BASE_PRICING.fullHosted.extraChildMonSat)}`
			});
		}
	} else if (track === 'sunday') {
		lineItems.push({
			label: 'Full hosted birthday (Sunday)',
			amount: BIRTHDAY_BASE_PRICING.fullHosted.sunday
		});
		if (kids > BIRTHDAY_BASE_PRICING.fullHosted.includedChildren) {
			const extra = kids - BIRTHDAY_BASE_PRICING.fullHosted.includedChildren;
			const amount = extra * BIRTHDAY_BASE_PRICING.fullHosted.extraChildSunday;
			lineItems.push({
				label: 'Extra children',
				amount,
				detail: `${extra} × ${formatThb(BIRTHDAY_BASE_PRICING.fullHosted.extraChildSunday)}`
			});
		}
	} else {
		lineItems.push({
			label: 'Simple table setup',
			amount: BIRTHDAY_BASE_PRICING.simpleTable.base
		});
		if (input.simpleTableBuffet && kids > 0) {
			lineItems.push({
				label: 'Buffet',
				amount: kids * 500,
				detail: `${kids} × ${formatThb(500)}`
			});
		}
		if (input.simpleTableCake) {
			lineItems.push({ label: 'Birthday cake', amount: 700 });
		}
		if (input.simpleTableDecorations) {
			lineItems.push({ label: 'Decorations', amount: 500 });
		}
	}

	if (input.includePlayground === true) {
		const amount = calculatePlaygroundAddon(input.capacityBucket, kids, true);
		const preview = getPlaygroundAddonPreview(input.capacityBucket, kids);
		lineItems.push({
			label: 'Indoor playground add-on',
			amount,
			detail: preview.label
		});
	}

	if (input.addonFacePainting) {
		lineItems.push({ label: 'Face painting', amount: 3_000 });
	}
	if (input.addonMovementActivity) {
		lineItems.push({ label: 'Movement activity', amount: 5_000 });
	}
	if (input.addonPlantingWorkshop) {
		lineItems.push({ label: 'Planting & craft workshop', amount: 6_000 });
	}

	const total = lineItems.reduce((sum, item) => sum + item.amount, 0);
	return { track, lineItems, total };
}
