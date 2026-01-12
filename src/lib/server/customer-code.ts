import type { FamiliesDatabase } from '$lib/notion-sdk/dbs/families'
import { FamiliesPatchDTO } from '$lib/notion-sdk/dbs/families'

function lettersOnlyUpper(input: string) {
  return (input ?? '')
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
}

function customerPrefixFromLastName(lastName: string) {
  const letters = lettersOnlyUpper(lastName)
  return (letters + 'XX').slice(0, 2)
}

function readCustomerCodeFromPage(page: {
  properties: Record<string, unknown>
}): string {
  const prop = page.properties['Customer Code'] as undefined | { rich_text?: Array<{ plain_text: string }> }
  return prop?.rich_text?.map((t) => t.plain_text).join('') ?? ''
}

function parseCustomerCodeSuffix(code: string, prefix: string): number | null {
  if (!code.startsWith(prefix)) return null
  const suffix = code.slice(prefix.length)
  if (!/^\d+$/.test(suffix)) return null
  const n = Number(suffix)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

function bumpCustomerCode(code: string): string {
  const prefix = code.slice(0, 2)
  const suffix = code.slice(2)
  const n = /^\d+$/.test(suffix) ? Number(suffix) : 0
  return `${prefix}${n + 1}`
}

async function getNextCustomerCodeForPrefix(familiesDb: FamiliesDatabase, prefix: string): Promise<string> {
  let max = 0
  let start_cursor: string | undefined = undefined

  do {
    const res = await familiesDb.query(
      {
        page_size: 100,
        start_cursor,
        filter: {
          // SDK internal key; Notion property name is "Customer Code"
          customerNumber: { starts_with: prefix },
        },
      },
      ['customerNumber'],
    )

    for (const page of res.results) {
      const code = readCustomerCodeFromPage(page as never)
      const suffix = parseCustomerCodeSuffix(code, prefix)
      if (suffix !== null && suffix > max) max = suffix
    }

    start_cursor = res.next_cursor ?? undefined
    if (!res.has_more) break
  } while (true)

  return `${prefix}${max + 1}`
}

async function isCodeTaken(familiesDb: FamiliesDatabase, code: string, excludePageId: string): Promise<boolean> {
  const res = await familiesDb.query(
    {
      page_size: 10,
      filter: {
        customerNumber: { equals: code },
      },
    },
    ['customerNumber'],
  )

  return res.results.some((p) => p.id !== excludePageId)
}

/**
 * Assigns a customer code like GR1, GR10, etc.
 * - Prefix: first 2 letters of last name (uppercased, letters only, padded with X)
 * - Suffix: next integer after the max existing suffix for that prefix
 *
 * Note: Notion has no atomic increment; this includes a small retry loop to reduce collisions.
 */
export async function assignFamilyCustomerCode(opts: {
  familiesDb: FamiliesDatabase
  familyPageId: string
  familyName: string
}): Promise<string> {
  const prefix = customerPrefixFromLastName(opts.familyName)
  let code = await getNextCustomerCodeForPrefix(opts.familiesDb, prefix)

  for (let i = 0; i < 5; i++) {
    await opts.familiesDb.updatePage(
      opts.familyPageId,
      new FamiliesPatchDTO({
        properties: {
          customerNumber: code,
        },
      }),
    )

    const taken = await isCodeTaken(opts.familiesDb, code, opts.familyPageId)
    if (!taken) return code

    code = bumpCustomerCode(code)
  }

  // Last write wins; return whatever we ended with.
  return code
}

