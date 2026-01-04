import { NOTION_API_KEY } from '$env/static/private';
import { SopCatalogDatabase, SopCatalogResponseDTO } from '$lib/notion-sdk/dbs/sop-catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
    const db = new SopCatalogDatabase({ notionSecret: NOTION_API_KEY });
    const selectedId = url.searchParams.get('id');
    
    // Fetch all SOPs that are Checklists
    const response = await db.query({
        filter: {
            sopType: { equals: 'Checklist' }
        },
        sorts: [
            { property: 'department', direction: 'ascending' },
            { property: 'name', direction: 'ascending' }
        ]
    });

    const sops = response.results.map(r => new SopCatalogResponseDTO(r));
    let selectedSop = null;

    if (selectedId) {
        // Find the selected SOP metadata from the list (to avoid another getPage call if possible, 
        // though strictly we might want to ensure it exists. But finding in list is efficient).
        const match = sops.find(s => s.id === selectedId);
        
        if (match) {
            // Fetch blocks
            const blocks = await db.getPageBlocks(selectedId);
            
            selectedSop = {
                id: match.id,
                name: match.properties.name.text,
                department: match.properties.department?.name,
                when: match.properties.when?.name,
                blocks: blocks
            };
        }
    }

    return {
        sops: sops.map(sop => ({
            id: sop.id,
            name: sop.properties.name.text,
            when: sop.properties.when?.name,
            department: sop.properties.department?.name,
        })),
        selectedSop
    };
};
