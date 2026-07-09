import type { FamiliesResponseDTO } from '$lib/notion-sdk/dbs/families/response.dto';

export type FamilyMemberSummary = {
	id: string;
	name: string;
	type: string | null;
	email: string | null;
	phone: string | null;
};

export type FamilySummary = {
	id: string;
	familyName: string;
	customerCode: string | null;
	loyverseCustomerId: string | null;
	mainPhone: string | null;
	mainEmail: string | null;
	status: string | null;
	members: FamilyMemberSummary[];
};

export const toFamilySummary = (
	dto: FamiliesResponseDTO,
	members: FamilyMemberSummary[] = []
): FamilySummary => ({
	id: dto.id,
	familyName: dto.properties.familyName?.text ?? 'Untitled Family',
	customerCode: dto.properties.customerNumber?.text ?? null,
	loyverseCustomerId: dto.properties.loyverseCustomerId?.text ?? null,
	mainPhone: dto.properties.mainPhone ?? null,
	mainEmail: dto.properties.mainEmail ?? null,
	status: dto.properties.status?.name ?? null,
	members
});

export const getSearchVariations = (search: string) => {
	const searchLower = search.toLowerCase();
	const searchUpper = search.toUpperCase();
	const searchCapitalized = search.charAt(0).toUpperCase() + search.slice(1).toLowerCase();
	return Array.from(new Set([search, searchLower, searchUpper, searchCapitalized]));
};
