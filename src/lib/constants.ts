// Casa Luma - Constants and Reusable Data

export const BUSINESS_INFO = {
	name: 'Casa Luma',
	tagline: 'A Montessori-inspired play café for children',
	location: '53/7 Moo. 2 Ban Nai Suan Village, Koh Phangan, Thailand',
	description:
		'A safe, natural, and engaging environment where children can play, learn, and explore while parents relax and enjoy quality refreshments.',
	email: 'info@casalumakpg.com',
	// phone: '+66 XX XXX XXXX'
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

export interface MenuItem {
	id: string;
	label: string;
	href: string;
	inHeader?: boolean;
	inFooter?: boolean;
}

export const SITE_MENU_ITEMS: readonly MenuItem[] = [
	{ id: 'home', label: 'Home', href: '/', inHeader: true },
	{ id: 'open-play', label: 'Open Play', href: '/open-play', inHeader: true, inFooter: true },
	{ id: 'pricing', label: 'Pricing', href: '/pricing', inHeader: true, inFooter: true },
	{
		id: 'birthday-parties',
		label: 'Birthday Parties',
		href: '/birthday-parties',
		inHeader: true
	},
	{ id: 'workshops', label: 'Workshops', href: '/workshops3', inFooter: true },
	{ id: 'careers', label: 'Careers', href: '/careers', inFooter: true },
	{ id: 'about', label: 'About', href: '/about', inHeader: true, inFooter: true },
	{ id: 'contact', label: 'Contact', href: '/contact', inHeader: true, inFooter: true }
] as const;

export const NAV_LINKS = SITE_MENU_ITEMS
	.filter((item) => item.inHeader)
	.map(({ label, href }) => ({ label, href }));

export const SOCIAL_LINKS = {
	facebook: 'https://www.facebook.com/profile.php?id=61581858085482',
	instagram: 'https://www.instagram.com/casaluma.kpg/',
	email: 'mailto:hello@casaluma.com',
	googleMaps: 'https://maps.app.goo.gl/iXyfd47yVxyPKk3o8'
} as const;

export const FOOTER_LINKS = SITE_MENU_ITEMS
	.filter((item) => item.inFooter)
	.map(({ label, href }) => ({ label, href }));

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
	icon?: string;
}

export const PRICING_OPTIONS: PricingOption[] = [
	{
		id: '1-hour',
		name: '1 Hour',
		price: '฿180',
		duration: 'Per child / hour',
		description: 'Perfect for quick play.',
		savings: 'Auto-upgrades to Day Pass if you stay longer',
		features: ['Open play access', 'Free adult entry'],
		icon: '⏱️'
	},
	{
		id: '1-day',
		name: '1 Day',
		price: '฿350',
		duration: 'Full day access',
		description: 'Best for longer play days.',
		savings: 'Just ฿170 more than 1 Hour',
		features: ['Play all day', 'Come and go anytime', 'Free adult entry'],
		icon: '☀️'
	},
	{
		id: '1-week',
		name: '1 Week',
		price: '฿1,500',
		duration: 'Valid for 7 consecutive days',
		description: 'Great for holidays and short stays.',
		savings: 'Only ฿180 per day',
		features: ['7 days from purchase', 'Free adult entry'],
		icon: '📅'
	},
	{
		id: '1-month',
		name: '1 Month',
		price: '฿3,500',
		duration: 'Valid for 30 days',
		description: 'Best value for residents & long stays.',
		savings: 'Less than ฿140 per day',
		features: ['30 days from purchase', 'Free adult entry'],
		highlight: true,
		icon: '🌟'
	},
	{
		id: 'flexi-play-pass',
		name: 'Flexi Play Pass',
		price: 'Standard ฿1,300 | Resident ฿1,100',
		duration: '11 hours of play | Valid for 60 days',
		description: 'For regular visitors who want flexibility.',
		savings: 'Only ฿120/hr standard or ฿100/hr resident',
		highlight: true,
		features: ['Use anytime', 'Split across visits', 'Free adult entry'],
		icon: '🎟️'
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
