// Casa Luma - Constants and Reusable Data

export const BUSINESS_INFO = {
	name: 'Casa Luma',
	tagline: 'A Montessori-inspired play café for children',
	location: 'Koh Phangan, Thailand',
	description:
		'A safe, natural, and engaging environment where children can play, learn, and explore while parents relax and enjoy quality refreshments.',
	email: 'hello@casaluma.com',
	phone: '+66 XX XXX XXXX'
} as const;

export interface ServiceCategory {
	id: string;
	title: string;
	description: string;
	href: string;
	imagePlaceholder: string;
	imageUrl: string;
}

export const SERVICES: ServiceCategory[] = [
	{
		id: 'open-play',
		title: 'Open Play',
		description: 'Drop-in play sessions for children in our specially designed play spaces',
		href: '/open-play',
		imagePlaceholder: 'Children playing with colorful toys',
		imageUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=1200&q=80'
	},
	{
		id: 'cafe',
		title: 'Café & Restaurant',
		description: 'Delicious coffee, snacks, and meals for the whole family',
		href: '/cafe',
		imagePlaceholder: 'Cozy café area with parents enjoying coffee',
		imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=80'
	},
	{
		id: 'shop',
		title: 'Shop',
		description: 'Curated selection of quality toys and accessories for kids',
		href: '/shop',
		imagePlaceholder: 'Beautiful wooden toys and learning materials',
		imageUrl: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=1200&q=80'
	},
	{
		id: 'workshops',
		title: 'Workshops',
		description: 'Educational and creative activities for children',
		href: '/workshops3',
		imagePlaceholder: 'Children engaged in creative workshop',
		imageUrl: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=1200&q=80'
	},
	{
		id: 'events',
		title: 'Events',
		description: 'Community gatherings and special activities',
		href: '/events',
		imagePlaceholder: 'Families enjoying a community event',
		imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&q=80'
	},
	{
		id: 'birthday-parties',
		title: 'Birthday Parties',
		description: 'Magical birthday celebrations in our beautiful space',
		href: '/birthday-parties',
		imagePlaceholder: 'Happy children at a birthday party',
		imageUrl: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80'
	}
] as const;

export const NAV_LINKS = [
	{ label: 'Home', href: '/' },
	{ label: 'Open Play', href: '/open-play' },
	{ label: 'Pricing', href: '/pricing' },
	{ label: 'Café', href: '/cafe' },
	{ label: 'Shop', href: '/shop' },
	{ label: 'Workshops', href: '/workshops3' },
	{ label: 'Events', href: '/events' },
	{ label: 'Birthday Parties', href: '/birthday-parties' },
	{ label: 'About', href: '/about' },
	{ label: 'Contact', href: '/contact' }
] as const;

export const SOCIAL_LINKS = {
	facebook: 'https://facebook.com/casaluma',
	instagram: 'https://instagram.com/casaluma',
	email: 'mailto:hello@casaluma.com'
} as const;

export const FOOTER_LINKS = [
	{ label: 'Open Play', href: '/open-play' },
	{ label: 'Pricing', href: '/pricing' },
	{ label: 'Workshops', href: '/workshops3' },
	{ label: 'Careers', href: '/careers' },
	{ label: 'About', href: '/about' },
	{ label: 'Contact', href: '/contact' }
] as const;

// Pricing & Memberships
export interface PricingOption {
	id: string;
	name: string;
	price: string;
	duration: string;
	description: string;
	features: string[];
	highlight?: boolean;
	savings?: string;
	icon?: string; // Adding icon back for compatibility if needed
}

// Dynamic Pricing Calculation
const PRICING_BASE = 200; // Hourly rate
const MULTIPLIERS = {
	DAY: 1.8,
	WEEK: 3.2,   // 3 days in a week
	MONTH: 3   // 3 weeks in a month
};

const OPEN_DAYS_PER_WEEK = 6;
const WEEKS_PER_MONTH = 4;

const PRICES = {
	HOUR: PRICING_BASE,
	DAY: Math.round(PRICING_BASE * MULTIPLIERS.DAY),
	WEEK: Math.round(PRICING_BASE * MULTIPLIERS.DAY * MULTIPLIERS.WEEK),
	MONTH: Math.round(PRICING_BASE * MULTIPLIERS.DAY * MULTIPLIERS.WEEK * MULTIPLIERS.MONTH)
};

// Calculate Savings
const SAVINGS = {
	WEEK: (PRICES.DAY * OPEN_DAYS_PER_WEEK) - PRICES.WEEK,
	MONTH: (PRICES.DAY * OPEN_DAYS_PER_WEEK * WEEKS_PER_MONTH) - PRICES.MONTH
};

export const PRICING_OPTIONS: PricingOption[] = [
	{
		id: '1-hour',
		name: '1 Hour',
		price: `฿${PRICES.HOUR}`,
		duration: 'Per child / hour',
		description: 'Perfect for a quick play session.',
		features: ['Open play access', 'Free adult/nanny entry', 'Extra time charged per 30 mins'],
		icon: '⏱️'
	},
	{
		id: '1-day',
		name: '1 Day',
		price: `฿${PRICES.DAY}`,
		duration: 'Full day access',
		description: 'Come and go as you please all day.',
		features: ['All-day play with re-entry', 'Free adult/nanny entry'],
		savings: `Stay with us as long as you want!`,
		icon: '☀️'
	},
	{
		id: '1-week',
		name: '1 Week',
		price: `฿${PRICES.WEEK.toLocaleString()}`,
		duration: 'Valid for 7 days',
		description: 'Unlimited play for a whole week.',
		features: [
			'Unlimited play for 7 days',
			'Includes selected workshops',
			'10% off food & drinks',
			'Free adult/nanny entry'
		],
		savings: `Save up to ฿${SAVINGS.WEEK.toLocaleString()}`,
		icon: '📅'
	},
	{
		id: '1-month',
		name: '1 Month',
		price: `฿${PRICES.MONTH.toLocaleString()}`,
		duration: 'Valid for 30 days',
		description: 'Best value for residents & long stays.',
		features: [
			'Unlimited play for 30 days',
			'Includes selected workshops',
			'15% off food & drinks',
			'Free adult/nanny entry'
		],
		highlight: true,
		savings: `Save up to ฿${SAVINGS.MONTH.toLocaleString()}`,
		icon: '🌟'
	}
];

// Replicate Models
export const REPLICATE_MODELS = {
	FLUX_SCHNELL: 'black-forest-labs/flux-schnell',
	IMAGEN_4_FAST: 'google/imagen-4-fast',
} as const;

export type ReplicateModel = (typeof REPLICATE_MODELS)[keyof typeof REPLICATE_MODELS];

export const REPLICATE_MODEL_LABELS: Record<ReplicateModel, string> = {
	[REPLICATE_MODELS.FLUX_SCHNELL]: 'Flux Schnell',
	[REPLICATE_MODELS.IMAGEN_4_FAST]: 'Google Imagen 4 Fast',
};
