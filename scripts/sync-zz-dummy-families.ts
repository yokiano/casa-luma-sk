import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const LOYVERSE_ACCESS_TOKEN = process.env.LOYVERSE_ACCESS_TOKEN;
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const BASE_URL = 'https://api.loyverse.com/v1.0';
const FAMILIES_DB_ID = '4dd6c32d9b0244fbbed6e6b41033e598';

type LoyverseCustomer = {
	id: string;
	customer_code?: string;
	name: string;
	email?: string;
	phone_number?: string;
	note?: string;
	deleted_at?: string;
};

function isZzCode(code: string | undefined): boolean {
	return /^ZZ\d+$/i.test(String(code || '').trim());
}

async function getAllLoyverseCustomers(): Promise<LoyverseCustomer[]> {
	if (!LOYVERSE_ACCESS_TOKEN) throw new Error('LOYVERSE_ACCESS_TOKEN missing');

	const all: LoyverseCustomer[] = [];
	let cursor: string | undefined;

	do {
		const url = new URL(`${BASE_URL}/customers`);
		url.searchParams.set('limit', '250');
		if (cursor) url.searchParams.set('cursor', cursor);

		const res = await fetch(url, {
			headers: { Authorization: `Bearer ${LOYVERSE_ACCESS_TOKEN}` }
		});
		if (!res.ok) {
			throw new Error(`Loyverse ${res.status}: ${await res.text()}`);
		}

		const data = (await res.json()) as { customers?: LoyverseCustomer[]; cursor?: string };
		all.push(...(data.customers || []).filter((c) => !c.deleted_at));
		cursor = data.cursor;
	} while (cursor);

	return all;
}

async function notionQuery(body: Record<string, unknown>) {
	if (!NOTION_API_KEY) throw new Error('NOTION_API_KEY missing');

	const res = await fetch(`https://api.notion.com/v1/databases/${FAMILIES_DB_ID}/query`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${NOTION_API_KEY}`,
			'Notion-Version': '2022-06-28',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		throw new Error(`Notion query ${res.status}: ${await res.text()}`);
	}
	return res.json() as Promise<{ results: any[]; has_more: boolean; next_cursor: string | null }>;
}

async function notionCreatePage(properties: Record<string, unknown>) {
	if (!NOTION_API_KEY) throw new Error('NOTION_API_KEY missing');

	const res = await fetch('https://api.notion.com/v1/pages', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${NOTION_API_KEY}`,
			'Notion-Version': '2022-06-28',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			parent: { database_id: FAMILIES_DB_ID },
			properties
		})
	});
	if (!res.ok) {
		throw new Error(`Notion create ${res.status}: ${await res.text()}`);
	}
	return res.json() as Promise<{ id: string; url: string }>;
}

function richText(content: string) {
	return {
		rich_text: [{ type: 'text', text: { content: content.slice(0, 2000) } }]
	};
}

async function findExistingZzFamilies(): Promise<Map<string, { id: string; name: string; loyverseId: string | null }>> {
	const map = new Map<string, { id: string; name: string; loyverseId: string | null }>();
	let cursor: string | null = null;

	do {
		const data = await notionQuery({
			filter: {
				property: 'Customer Code',
				rich_text: { starts_with: 'ZZ' }
			},
			page_size: 100,
			start_cursor: cursor || undefined
		});

		for (const page of data.results) {
			const code =
				page.properties?.['Customer Code']?.rich_text?.map((t: any) => t.plain_text).join('')?.trim() ||
				'';
			const name =
				page.properties?.['Family Name']?.title?.map((t: any) => t.plain_text).join('')?.trim() || '';
			const loyverseId =
				page.properties?.['Loyverse Customer ID']?.rich_text
					?.map((t: any) => t.plain_text)
					.join('')
					?.trim() || null;
			if (code) {
				map.set(code.toUpperCase(), { id: page.id, name, loyverseId });
			}
		}

		cursor = data.has_more ? data.next_cursor : null;
	} while (cursor);

	return map;
}

async function main() {
	const dryRun = process.argv.includes('--dry-run');

	console.log('Fetching Loyverse customers...');
	const customers = await getAllLoyverseCustomers();
	const zzCustomers = customers
		.filter((c) => isZzCode(c.customer_code))
		.sort((a, b) =>
			String(a.customer_code).localeCompare(String(b.customer_code), undefined, { numeric: true })
		);

	console.log(`Found ${zzCustomers.length} ZZ* Loyverse customers:`);
	for (const c of zzCustomers) {
		console.log(`  ${c.customer_code} | ${c.name} | ${c.id}`);
	}

	console.log('\nQuerying existing ZZ* Notion families...');
	const existing = await findExistingZzFamilies();
	console.log(`Found ${existing.size} existing ZZ* Notion families:`);
	for (const [code, fam] of existing) {
		console.log(`  ${code} | ${fam.name} | loyverse=${fam.loyverseId || 'none'}`);
	}

	const toCreate = zzCustomers.filter((c) => !existing.has(String(c.customer_code).toUpperCase()));
	console.log(`\nWill create ${toCreate.length} families${dryRun ? ' (dry-run)' : ''}:`);

	for (const c of toCreate) {
		const code = String(c.customer_code).toUpperCase();
		// Loyverse names are often "NAME [CODE]"; Notion Family Name should be clean.
		const familyName = String(c.name || code)
			.replace(new RegExp(`\\s*\\[${code}\\]\\s*$`, 'i'), '')
			.trim() || code;
		const specialNotes = [
			'Dummy/special-case Loyverse customer (ZZ series).',
			c.note?.trim() ? `Loyverse note: ${c.note.trim()}` : null
		]
			.filter(Boolean)
			.join('\n');

		const properties: Record<string, unknown> = {
			'Family Name': {
				title: [{ type: 'text', text: { content: familyName } }]
			},
			'Customer Code': richText(code),
			'Loyverse Customer ID': richText(c.id),
			Status: { select: { name: 'Active' } },
			'Special Notes': richText(specialNotes)
		};

		if (c.email?.trim()) {
			properties['Main Email'] = { email: c.email.trim() };
		}
		if (c.phone_number?.trim()) {
			properties['Main Phone'] = { phone_number: c.phone_number.trim() };
		}

		console.log(`  CREATE ${code} — ${familyName} (loyverse: ${c.id})`);
		if (!dryRun) {
			const page = await notionCreatePage(properties);
			console.log(`    -> ${page.url}`);
		}
	}

	console.log('\nDone.');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
