import { Client, type DatabaseObjectResponse } from '@notionhq/client';
import {
  NOTION_API_KEY,
  NOTION_PROCUREMENT_DB_ID
} from '$env/static/private';

export type ProcurementMetadata = {
  departments: string[];
  statuses: string[];
  objectCategories: string[];
};

function getNotionClient(): Client {
  if (!NOTION_API_KEY) {
    throw new Error('NOTION_API_KEY is missing in environment');
  }
  return new Client({ auth: NOTION_API_KEY });
}

export async function getProcurementMeta(): Promise<ProcurementMetadata> {
  const notion = getNotionClient();
  const database_id = NOTION_PROCUREMENT_DB_ID;
  
  if (!database_id) {
    throw new Error('NOTION_PROCUREMENT_DB_ID is missing in environment');
  }
  
  // Get database to retrieve data source ID
  const database = await notion.databases.retrieve({ database_id }) as DatabaseObjectResponse;
  
  if (!database || database.object !== 'database') {
    throw new Error('Failed to retrieve procurement database');
  }
  
  if (!database.data_sources || database.data_sources.length === 0) {
    throw new Error('No data sources found in procurement database');
  }
  
  const dataSourceId = database.data_sources[0].id;
  console.log("######## dataSourceId", dataSourceId);
  if (!dataSourceId) {
    throw new Error('Data source ID is missing');
  }
  
  // Retrieve the actual data source schema
  const dataSource = await notion.dataSources.retrieve({ data_source_id: dataSourceId });
  console.log("######## dataSource", dataSource);
  if (!dataSource || !dataSource.properties) {
    throw new Error('Failed to retrieve data source schema');
  }
  
  const properties = dataSource.properties;
  console.log("######## properties", properties);
  const departments = extractSelectOptions(properties, 'Department');
  const statuses = extractStatusOptions(properties, 'Status');
  const objectCategories = extractMultiSelectOptions(properties, 'Object Category');

  return {
    departments,
    statuses,
    objectCategories
  };
}

function extractSelectOptions(properties: Record<string, unknown>, key: string): string[] {
  const prop = properties[key] as
    | { type: 'select'; select?: { options?: Array<{ name?: string | null }> } }
    | undefined;

  if (!prop || prop.type !== 'select') return [];

  const options = prop.select?.options ?? [];
  const names: string[] = [];
  const seen = new Set<string>();

  for (const option of options) {
    const name = option?.name ?? undefined;
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }

  return names;
}

function extractMultiSelectOptions(properties: Record<string, unknown>, key: string): string[] {
  const prop = properties[key] as
    | { type: 'multi_select'; multi_select?: { options?: Array<{ name?: string | null }> } }
    | undefined;

  if (!prop || prop.type !== 'multi_select') return [];

  const options = prop.multi_select?.options ?? [];
  const names: string[] = [];
  const seen = new Set<string>();

  for (const option of options) {
    const name = option?.name ?? undefined;
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }

  return names;
}

type StatusProperty = {
  type: 'status';
  status?: {
    options?: Array<{ id: string; name?: string | null }>;
    groups?: Array<{ option_ids?: string[] }>;
  };
};

type SelectProperty = {
  type: 'select';
  select?: { options?: Array<{ name?: string | null }> };
};

type MultiSelectProperty = {
  type: 'multi_select';
  multi_select?: { options?: Array<{ name?: string | null }> };
};

function extractStatusOptions(properties: Record<string, unknown>, key: string): string[] {
  const prop = properties[key] as StatusProperty | SelectProperty | MultiSelectProperty | undefined;
  if (!prop) return [];

  if (prop.type === 'status') {
    const status = prop.status;
    if (!status) return [];

    const options: Array<{ id: string; name?: string | null }> = status.options ?? [];
    const groups: Array<{ option_ids?: string[] }> = status.groups ?? [];

    const optionsById = new Map(options.map((opt) => [opt.id, opt]));
    const orderedNames: string[] = [];
    const seen = new Set<string>();

    const pushName = (name?: string) => {
      if (!name || seen.has(name)) return;
      seen.add(name);
      orderedNames.push(name);
    };

    for (const group of groups) {
      for (const optionId of group.option_ids ?? []) {
        const option = optionsById.get(optionId);
        pushName(option?.name);
      }
    }

    for (const option of options) {
      pushName(option?.name);
    }

    return orderedNames;
  }

  if (prop.type === 'select') {
    return extractSelectOptions(properties, key);
  }

  return [];
}

