import { env } from '$env/dynamic/private';
import type { ReceiptDepartmentGroup } from '$lib/receipts/analytics';

const DEPARTMENT_MAPPING_DATABASE_ID = '9a4c14fedf4b44dda928b1a06ee759b6';

export const DEPARTMENTS = ['playground', 'cafe', 'store', 'workshops'] as const;
export const UNKNOWN_DEPARTMENT = 'unknown' as const;

export type Department = (typeof DEPARTMENTS)[number];
export type DashboardDepartment = Department | typeof UNKNOWN_DEPARTMENT;

export type DepartmentMapping = {
  loadedAt: number;
  categoryToDepartment: Map<string, Department>;
  source: 'notion' | 'fallback';
};

const fallbackDepartmentCategories: Record<Department, string[]> = {
  playground: ['Entry', 'Membership', '(p4p) Art Equipment', '(p4p) Lego Figurine'],
  cafe: [
    'Breakfast Sets',
    'Coffee & Friends',
    'Comfort Food',
    'Crafted Croissants',
    'Cute Sandwich',
    'Desserts',
    'Healthy Treats',
    'House Smoothies',
    'Kid Sized Drinks',
    'Kids Favorites',
    'Kitchen Extras',
    'Light & Fresh',
    'More Vegan',
    'Pastries',
    'Personal Pizzas',
    'Premium Tea',
    'Proper Sandwiches',
    'Salads',
    'Soft Drinks'
  ],
  store: ['(store) All'],
  workshops: []
};

let departmentMappingCache: DepartmentMapping | null = null;

export const normalizeCategory = (value: string) => value.trim().toLowerCase();

export const departmentToReceiptGroup = (department: DashboardDepartment): ReceiptDepartmentGroup => {
  if (department === 'playground') return 'Open Play';
  if (department === 'cafe') return 'Cafe';
  if (department === 'store') return 'Store';
  return 'Others';
};

export const buildFallbackDepartmentMapping = (): DepartmentMapping => {
  const categoryToDepartment = new Map<string, Department>();

  for (const department of DEPARTMENTS) {
    for (const category of fallbackDepartmentCategories[department]) {
      categoryToDepartment.set(normalizeCategory(category), department);
    }
  }

  return { loadedAt: Date.now(), categoryToDepartment, source: 'fallback' };
};

export const getDepartmentMapping = async (): Promise<DepartmentMapping> => {
  const ttlMs = 5 * 60 * 1000;
  if (departmentMappingCache && Date.now() - departmentMappingCache.loadedAt < ttlMs) return departmentMappingCache;

  const notionSecret = env.NOTION_API_KEY?.trim();
  if (!notionSecret) {
    departmentMappingCache = buildFallbackDepartmentMapping();
    return departmentMappingCache;
  }

  try {
    const databaseId = env.NOTION_DEPARTMENT_MAPPING_DB_ID?.trim() || DEPARTMENT_MAPPING_DATABASE_ID;
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${notionSecret}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: { property: 'Active', checkbox: { equals: true } },
        page_size: 100
      })
    });

    if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);

    const data = (await response.json()) as {
      results?: Array<{
        properties?: {
          Department?: { title?: Array<{ plain_text?: string }> };
          'Loyverse Categories'?: { multi_select?: Array<{ name?: string }> };
        };
      }>;
    };

    const categoryToDepartment = new Map<string, Department>();
    for (const page of data.results ?? []) {
      const departmentName = page.properties?.Department?.title?.map((part) => part.plain_text ?? '').join('').trim();
      if (!DEPARTMENTS.includes(departmentName as Department)) continue;

      for (const category of page.properties?.['Loyverse Categories']?.multi_select ?? []) {
        if (category.name?.trim()) categoryToDepartment.set(normalizeCategory(category.name), departmentName as Department);
      }
    }

    departmentMappingCache = { loadedAt: Date.now(), categoryToDepartment, source: 'notion' };
    return departmentMappingCache;
  } catch (error) {
    console.error('[mgmt-dashboard] failed to load department mapping from Notion:', error);
    departmentMappingCache = buildFallbackDepartmentMapping();
    return departmentMappingCache;
  }
};
