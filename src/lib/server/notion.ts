// Notion Client Setup for Casa Luma Workshops
import { Client } from '@notionhq/client';
import {
	NOTION_API_KEY,
	NOTION_EVENTS_DB_ID,
	NOTION_RSVPS_DB_ID,
	NOTION_WAITLIST_DB_ID,
	NOTION_MENU_DB_ID,
	NOTION_JOB_OPENINGS_DB_ID
} from '$env/static/private';
import type { Event, RSVP, WaitlistEntry } from '$lib/types/workshops';

// Initialize Notion client
const getNotionClient = () => {
	if (!NOTION_API_KEY) {
		throw new Error('NOTION_API_KEY is not defined in environment variables');
	}
	
	return new Client({ auth: NOTION_API_KEY });
};

// Database IDs (from environment)
export const NOTION_DBS = {
	EVENTS: NOTION_EVENTS_DB_ID || '',
	RSVPS: NOTION_RSVPS_DB_ID || '',
	WAITLIST: NOTION_WAITLIST_DB_ID || '',
	MENU: NOTION_MENU_DB_ID || '',
	JOB_OPENINGS: NOTION_JOB_OPENINGS_DB_ID || ''
} as const;

// Validate database IDs are set
export const validateNotionConfig = () => {
	if (!NOTION_DBS.EVENTS) {
		throw new Error('NOTION_EVENTS_DB_ID is not defined');
	}
	if (!NOTION_DBS.RSVPS) {
		throw new Error('NOTION_RSVPS_DB_ID is not defined');
	}
	// WAITLIST is optional
};

export const notion = getNotionClient() as Client;

// Type guards for Notion property types
export const isRichText = (property: any): property is { rich_text: Array<{ plain_text: string }> } => {
	return property?.rich_text !== undefined;
};

export const isTitle = (property: any): property is { title: Array<{ plain_text: string }> } => {
	return property?.title !== undefined;
};

export const isSelect = (property: any): property is { select: { name: string } | null } => {
	return property?.select !== undefined;
};

export const isMultiSelect = (property: any): property is { multi_select: Array<{ name: string }> } => {
	return property?.multi_select !== undefined;
};

export const isNumber = (property: any): property is { number: number | null } => {
	return property?.number !== undefined;
};

export const isDate = (property: any): property is { date: { start: string; end?: string } | null } => {
	return property?.date !== undefined;
};

export const isEmail = (property: any): property is { email: string | null } => {
	return property?.email !== undefined;
};

export const isPhone = (property: any): property is { phone_number: string | null } => {
	return property?.phone_number !== undefined;
};

export const isUrlProp = (property: any): property is { url: string | null } => {
	return property?.url !== undefined;
};

export const isCheckbox = (property: any): property is { checkbox: boolean } => {
	return property?.checkbox !== undefined;
};

export const isFiles = (property: any): property is { files: Array<{ name: string; file?: { url: string }; external?: { url: string } }> } => {
	return property?.files !== undefined;
};

export const isPeople = (property: any): property is { people: Array<{ name?: string; person?: { email: string } }> } => {
	return property?.people !== undefined;
};

export const isRelation = (property: any): property is { relation: Array<{ id: string }> } => {
	return property?.relation !== undefined;
};

export const isRollup = (property: any): property is { rollup: { number?: number; array?: any[] } } => {
	return property?.rollup !== undefined;
};

export const isFormula = (property: any): property is { formula: { string?: string; number?: number } } => {
	return property?.formula !== undefined;
};

// Helper functions to extract property values safely
export const getTextContent = (property: any): string => {
	if (isRichText(property)) {
		return property.rich_text.map(rt => rt.plain_text).join('');
	}
	if (isTitle(property)) {
		return property.title.map(t => t.plain_text).join('');
	}
	return '';
};

export const getSelectValue = (property: any): string => {
	if (isSelect(property) && property.select) {
		return property.select.name;
	}
	return '';
};

export const getMultiSelectValues = (property: any): string[] => {
	if (isMultiSelect(property)) {
		return property.multi_select.map(item => item.name);
	}
	return [];
};

export const getNumberValue = (property: any): number => {
	if (isNumber(property) && property.number !== null) {
		return property.number;
	}
	return 0;
};

export const getDateValue = (property: any): string | undefined => {
	if (isDate(property) && property.date) {
		return property.date.start;
	}
	return undefined;
};

export const getEmailValue = (property: any): string | undefined => {
	if (isEmail(property) && property.email) {
		return property.email;
	}
	return undefined;
};

export const getPhoneValue = (property: any): string | undefined => {
	if (isPhone(property) && property.phone_number) {
		return property.phone_number;
	}
	return undefined;
};

export const getCheckboxValue = (property: any): boolean => {
	if (isCheckbox(property)) {
		return property.checkbox;
	}
	return false;
};

export const getUrlValue = (property: any): string => {
	if (isUrlProp(property) && property.url) {
		return property.url;
	}
	return '';
};

export const getFilesUrls = (property: any): string[] => {
	if (isFiles(property)) {
		return property.files.map(file => {
			if (file.file) return file.file.url;
			if (file.external) return file.external.url;
			return '';
		}).filter(Boolean);
	}
	return [];
};

export const getPeopleNames = (property: any): string[] => {
	if (isPeople(property)) {
		return property.people.map(person => person.name || person.person?.email || 'Unknown').filter(Boolean);
	}
	return [];
};

export const getRelationIds = (property: any): string[] => {
	if (isRelation(property)) {
		return property.relation.map(rel => rel.id);
	}
	return [];
};

export const getRollupNumber = (property: any): number => {
	if (isRollup(property)) {
		if (property.rollup.number !== undefined) {
			return property.rollup.number;
		}
		if (property.rollup.array) {
			return property.rollup.array.length;
		}
	}
	return 0;
};

export const getFormulaValue = (property: any): string | number => {
	if (isFormula(property)) {
		if (property.formula.string !== undefined) {
			return property.formula.string;
		}
		if (property.formula.number !== undefined) {
			return property.formula.number;
		}
	}
	return '';
};

