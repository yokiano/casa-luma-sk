import { query } from '$app/server';
import { NOTION_API_KEY } from '$env/static/private';
import { EmployeesDatabase, EmployeesResponseDTO } from '$lib/notion-sdk/dbs/employees';
import { RolesDatabase } from '$lib/notion-sdk/dbs/roles';

export interface PublicEmployee {
	id: string;
	name: string;
	fullName: string;
	roles: string[];
	department: string | undefined;
	bio: string;
	photo: string | undefined;
	languages: string[];
	hometown: string;
}

export const getEmployees = query(async () => {
	const db = new EmployeesDatabase({
		notionSecret: NOTION_API_KEY
	});

	const response = await db.query({
		filter: {
			or: [
				{ employmentStatus: { equals: 'Working' } },
				{ employmentStatus: { equals: 'Active' } },
				{ employmentStatus: { equals: 'Onboarding' } }
			]
		},
		sorts: [
			{ property: 'nickname', direction: 'ascending' }
		]
	});

	const results = response.results.map((r) => {
		const dto = new EmployeesResponseDTO(r);
		return transformEmployee(dto);
	});
	
	return results;
});

export type ManagerDetails = {
	id: string;
	name: string;
	personId?: string;
};

export const getManagers  = query<ManagerDetails[]>(async () => {
	const rolesDb = new RolesDatabase({ notionSecret: NOTION_API_KEY });
	const rolesRes = await rolesDb.query({});
	
	// Find all roles that contain "Manager" in the title
	const managerRoleIds = new Set(
		rolesRes.results
			.filter(r => {
				const title = r.properties.Role.title.map((t: any) => t.plain_text).join('');
				return title.toLowerCase().includes('manager');
			})
			.map(r => r.id)
	);

	const db = new EmployeesDatabase({
		notionSecret: NOTION_API_KEY
	});

	const response = await db.query({
		filter: {
			or: [
				{ employmentStatus: { equals: 'Working' } },
				{ employmentStatus: { equals: 'Active' } },
				{ employmentStatus: { equals: 'Onboarding' } }
			]
		},
		sorts: [
			{ property: 'nickname', direction: 'ascending' }
		]
	});

	return response.results
		.map(r => new EmployeesResponseDTO(r))
		.filter(dto => {
			const roleIds = dto.properties.roleIds;
			return roleIds?.some(id => managerRoleIds.has(id));
		})
		.map(dto => {
			// Try to find a person ID in Reports To or similar property if available
			// For now, we'll return the page ID as 'id' and the person ID as 'personId' if found
			const reportsTo = dto.properties.reportsTo as unknown;
			const personId =
				Array.isArray(reportsTo) && reportsTo[0] && typeof reportsTo[0] === 'object'
					? (reportsTo[0] as any).id
					: undefined;
			const nickname = dto.properties.nickname?.text;
			const fullName = dto.properties.fullName?.text;
			
			return {
				id: dto.id,
				personId,
				name: nickname || fullName || 'Unknown'
			};
		});
});

function safe<T>(fn: () => T, fallback: T): T {
	try {
		return fn();
	} catch {
		return fallback;
	}
}

function transformEmployee(dto: EmployeesResponseDTO): PublicEmployee {
	const nickname = dto.properties.nickname?.text;
	const fullName = dto.properties.fullName?.text;

	return {
		id: dto.id,
		name: nickname || fullName || 'Unknown',
		fullName: fullName || '',
		roles: [], // dto.properties.position?.values || [], // Relation to Roles DB, names not available in Employee DTO
		department: dto.properties.department?.name,
		// The Employees SDK schema currently doesn't expose a dedicated "Bio" field.
		// Keep this stable for callers without leaking internal notes.
		bio: '',
		photo: safe(() => dto.properties.photo.urls[0], undefined),
		languages: dto.properties.languages?.values || [],
		hometown: dto.properties.hometown?.text || ''
	};
}
