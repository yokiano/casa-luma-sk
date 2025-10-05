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
	{ label: 'Memberships', href: '/memberships' },
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

// Pricing & Memberships
export interface Membership {
	id: string;
	name: string;
	price: string;
	duration: string;
	access: string;
	workshops: string;
	foodDiscount: string;
	perks: string[];
	icon: string; // emoji or icon identifier
	highlight?: boolean;
}

export interface PayAsYouGo {
	id: string;
	name: string;
	price: string;
	duration: string;
	includes: string[];
	extras?: string;
}

export const MEMBERSHIPS: Membership[] = [
	{
		id: '10-day-pass',
		name: '10-Day Pass',
		price: '฿3,500',
		duration: 'Valid for 60 days',
		access: '10 full days of open play',
		workshops: '2 included workshops',
		foodDiscount: '10% off',
		perks: [
			'10 separate full days of play',
			'Come & go on same day',
			'2 included kids workshops',
			'10% off food & drinks',
			'Free adult/nanny entry'
		],
		icon: '🎟️'
	},
	{
		id: 'monthly-pass',
		name: 'Monthly Pass',
		price: '฿3,000',
		duration: 'Per month',
		access: 'Unlimited open play',
		workshops: 'Up to 8 workshops/month',
		foodDiscount: '10% off',
		perks: [
			'Unlimited play for one child',
			'Up to 8 included workshops/month',
			'15% off food & drinks',
			'50% off one birthday party/year',
			'1 free guest pass/month',
			'Free adult/nanny entry'
		],
		icon: '📅',
		highlight: true
	},
	{
		id: 'yearly-pass',
		name: 'Yearly Pass',
		price: '฿30,000',
		duration: 'Per year',
		access: 'Unlimited open play',
		workshops: 'All included workshops',
		foodDiscount: '15% off',
		perks: [
			'Unlimited play for 12 months',
			'All included kids workshops',
			'10% off food & drinks',
			'50% off one birthday party/year',
			'2 free guest passes/month',
			'Priority event RSVP',
			'Free adult/nanny entry'
		],
		icon: '🌳'
	}
];

export const PAY_AS_YOU_GO: PayAsYouGo[] = [
	{
		id: '1-hour',
		name: '1-Hour Play',
		price: '฿150',
		duration: 'Per child / hour',
		includes: ['Open play access', 'Free adult/nanny entry'],
		extras: 'Extra time: ฿80 per 30 min'
	},
	{
		id: '3-hour',
		name: '3-Hour Pass',
		price: '฿400',
		duration: 'Same day',
		includes: ['Up to 3 consecutive hours', 'Free adult/nanny entry'],
		extras: 'After 3 hours: ฿50 per 30 min'
	},
	{
		id: 'full-day',
		name: 'Full-Day Pass',
		price: '฿500',
		duration: 'Full day',
		includes: ['All-day play with re-entry', 'Come & go as you please', 'Free adult/nanny entry']
	}
];

