import { query } from '$app/server';
import { NOTION_API_KEY } from '$env/static/private';
import { EmployeesDatabase, EmployeesResponseDTO } from '$lib/notion-sdk/dbs/employees';

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
				{ employmentStatus: { equals: 'Active' } },
				{ employmentStatus: { equals: 'Onboarding' } },
				{ employmentStatus: { equals: 'Probation' } }
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

function transformEmployee(dto: EmployeesResponseDTO): PublicEmployee {
	return {
		id: dto.id,
		name: dto.properties.nickname.text || dto.properties.fullName.text || 'Unknown',
		fullName: dto.properties.fullName.text || '',
		roles: dto.properties.position.values,
		department: dto.properties.department?.name,
		bio: dto.properties.bio.text || '',
		photo: dto.properties.photo.urls[0],
		languages: dto.properties.languages.values,
		hometown: dto.properties.hometown.text || ''
	};
}
