// Workshop and Event Types for Casa Luma

export type EventType = 'Workshop' | 'Retreat' | 'Yoga Class' | 'Art Session' | 'Other';

export type EventStatus = 'Draft' | 'Published' | 'Full' | 'Cancelled' | 'Completed';

export type RegistrationStatus = 'Open' | 'Closed' | 'Waitlist';

export type Location = 'Main Hall' | 'Garden' | 'Studio A' | 'Studio B' | 'Online';

export type Language = 'Spanish' | 'English' | 'Both';

export type RSVPStatus = 'Confirmed' | 'Waitlist' | 'Cancelled' | 'No-show';

export type PaymentStatus = 'Pending' | 'Paid' | 'Refunded' | 'N/A';

export type EventSource = 'Website' | 'Instagram' | 'Friend' | 'Other';

export type DietaryRestriction = 
	| 'Vegetarian'
	| 'Vegan'
	| 'Gluten-Free'
	| 'Dairy-Free'
	| 'Nut Allergy'
	| 'Other';

// Event from Notion Database
export interface Event {
	id: string;
	eventName: string;
	slug: string;
	eventType: EventType;
	date: string; // ISO date string
	endDate?: string; // For multi-day events
	description: string;
	shortDescription: string;
	instructor: string;
	capacity: number;
	currentAttendees: number;
	availableSpots: number;
	status: EventStatus;
	registrationStatus: RegistrationStatus;
	price: number; // In EUR
	location: Location;
	featuredImage?: string;
	gallery?: string[];
	tags?: string[];
	language: Language;
	requirements?: string;
	created: string;
	updated: string;
}

// RSVP from Notion Database
export interface RSVP {
	id: string;
	rsvpId: string; // RSVP-{timestamp}-{random}
	eventId: string;
	eventName?: string; // Populated from relation
	guestName: string;
	email: string;
	phone?: string;
	numberOfGuests: number;
	status: RSVPStatus;
	paymentStatus: PaymentStatus;
	notes?: string;
	dietaryRestrictions?: DietaryRestriction[];
	source?: EventSource;
	createdAt: string;
	confirmedAt?: string;
	checkInStatus: boolean;
	internalNotes?: string;
}

// Waitlist from Notion Database (optional)
export interface WaitlistEntry {
	id: string;
	waitlistId: string;
	eventId: string;
	eventName?: string;
	guestName: string;
	email: string;
	phone?: string;
	addedAt: string;
	notified: boolean;
	convertedToRSVPId?: string;
}

// Form submission types
export interface RSVPFormData {
	eventId: string;
	guestName: string;
	email: string;
	phone?: string;
	numberOfGuests: number;
	dietaryRestrictions?: DietaryRestriction[];
	notes?: string;
	source?: EventSource;
	acceptTerms: boolean;
}

export interface WaitlistFormData {
	eventId: string;
	guestName: string;
	email: string;
	phone?: string;
}

// Validation errors
export interface FormValidationError {
	field: string;
	message: string;
}

// API Response types
export interface EventListResponse {
	events: Event[];
	total: number;
	hasMore: boolean;
	nextCursor?: string;
}

export interface EventDetailResponse {
	event: Event;
	relatedRSVPs?: number;
}

export interface RSVPResponse {
	success: boolean;
	rsvp?: RSVP;
	waitlist?: WaitlistEntry;
	message: string;
	errors?: FormValidationError[];
}

