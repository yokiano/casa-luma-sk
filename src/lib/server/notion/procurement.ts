import { Client } from '@notionhq/client';
import {
  NOTION_API_KEY,
  NOTION_PROCUREMENT_DB_ID
} from '$env/static/private';

export type CreateProcurementItemInput = {
  item: string;
  priceTHB?: number | null;
  linkToProduct?: string | null;
  supplier?: string | null;
  imageUrl?: string | null;
  department?: string | null; // e.g. "General"
  status?: string | null; // e.g. "Idea"
  objectCategories?: string[] | null; // e.g. ["STEM"]
  quantity?: number | null;
  trackingNumber?: string | null;
  invoice?: string | null;
  description?: string | null;
};

export type CreateProcurementItemResult = {
  pageId: string;
  url?: string;
};

function getNotionClient(): Client {
  const key = NOTION_API_KEY;
  if (!key) {
    throw new Error('NOTION_API_KEY is missing in environment');
  }
  return new Client({ auth: key });
}

function getProcurementDatabaseId(): string {
  // Prefer env override; fall back to the known database id discovered via MCP fetch
  return (
    NOTION_PROCUREMENT_DB_ID ||
    '283fc77d-b4f3-80c1-813f-ef4b9bb08f8f'
  );
}

function textProperty(value: string | null | undefined) {
  const v = (value ?? '').toString();
  return {
    rich_text: v ? [{ type: 'text', text: { content: v } }] : [],
  } as const;
}

export async function createProcurementItem(
  input: CreateProcurementItemInput
): Promise<CreateProcurementItemResult> {
  const notion = getNotionClient();
  const database_id = getProcurementDatabaseId();

  const properties: any = {
    Item: {
      title: [{ type: 'text', text: { content: input.item } }],
    },
    'Price (THB)': {
      number: input.priceTHB ?? null,
    },
    'Link To Product': textProperty(input.linkToProduct ?? ''),
    Supplier: textProperty(input.supplier ?? ''),
    Department: input.department
      ? { select: { name: input.department } }
      : { select: null },
    Status: input.status ? { status: { name: input.status } } : { status: null },
    'Object Category': {
      multi_select: (input.objectCategories ?? []).map((name) => ({ name })),
    },
    Quantity: {
      number: input.quantity ?? null,
    },
    'Tracking Number': textProperty(input.trackingNumber ?? ''),
    Invoice: textProperty(input.invoice ?? ''),
    Description: textProperty(input.description ?? ''),
  };

  const files = [] as Array<any>;
  if (input.imageUrl) {
    files.push({
      name: (input.item || 'image').substring(0, 100),
      type: 'external',
      external: { url: input.imageUrl },
    });
  }

  if (files.length) {
    properties['Image'] = { files };
  }

  const page = await notion.pages.create({
    parent: { database_id },
    properties,
  });

  return { pageId: page.id, url: (page as any).url };
}

export const procurementMeta = {
  departments: ['General', 'Montessori', 'Outdoor', 'Kitchen'],
  statuses: ['Idea', 'Researching', 'Ordered', 'Received'],
  objectCategories: ['Furniture', 'Learning', 'Supplies']
};



