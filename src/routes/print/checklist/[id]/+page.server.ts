import { NOTION_API_KEY } from '$env/static/private';
import { SopCatalogDatabase, SopCatalogResponseDTO } from '$lib/notion-sdk/dbs/sop-catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
    const db = new SopCatalogDatabase({ notionSecret: NOTION_API_KEY });
    const { id } = params;

    const page = await db.getPage(id);
    const blocks = await db.getPageBlocks(id);
    const sop = new SopCatalogResponseDTO(page);

    return {
        sop: {
            id: sop.id,
            name: sop.properties.name.text,
            department: sop.properties.department?.name,
            when: sop.properties.when?.name,
            blocks: blocks
        }
    };
};
