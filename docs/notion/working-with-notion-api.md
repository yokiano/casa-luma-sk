# Working with Notion API - Implementation Guide

> **Purpose**: Quick reference for implementing Notion database features in Casa Luma's SvelteKit app using type-safe patterns.

## Table of Contents

1. [Overview](#overview)
2. [Setup & Tools](#setup--tools)
3. [Implementation Workflow](#implementation-workflow)
4. [Verification](#verification)
5. [Pre-Implementation Checklist](#pre-implementation-checklist)

---

## Overview

### Architecture

```
Notion Database
    ↓
notion-ts-client (generates types + SDK)
    ↓
src/lib/[feature].remote.ts (SvelteKit remote functions)
    ↓
src/routes/[feature]/+page.svelte (UI)
```

### Stack

- **notion-ts-client** - Auto-generates type-safe SDK from Notion databases ([GitHub](https://github.com/velsa/notion-ts-client))
- **@notionhq/client** v5.1.0 - Official Notion SDK (used by notion-ts-client)
- **SvelteKit Remote Functions** - Type-safe client-server communication
- **Valibot** - Input validation

---

## Setup & Tools

### 1. Environment Variables

Required in `.env` (Cursor can't read this, ask user):

```bash
NOTION_API_KEY=secret_xxxxxxxxxxxxx
NOTION_TS_CLIENT_NOTION_SECRET=<same_as_above>
NOTION_TS_CLIENT_SDK_PATH=./src/lib/notion-sdk
```

**How to get**:
1. Create integration: https://www.notion.so/my-integrations
2. Get Database ID from URL: `https://notion.so/<DATABASE_ID>?v=...`
3. Share databases with your integration in Notion

**Note**: The `NOTION_TS_CLIENT_*` variables allow notion-ts-client to load settings from .env automatically.

**Import in code** (SvelteKit way):
```typescript
import { NOTION_API_KEY, NOTION_FEATURE_DB_ID } from '$env/static/private';
```

---

### 2. Install notion-ts-client

```bash
pnpm add -D notion-ts-client
```

---

### 3. Generate Type-Safe SDK

#### Using Package.json Script (Recommended)

Run the pre-configured script:

```bash
pnpm notion:generate
```

This uses `dotenv` to load environment variables from `.env` and runs notion-ts-client with:
- `NOTION_TS_CLIENT_NOTION_SECRET` - Your Notion API key
- `NOTION_TS_CLIENT_SDK_PATH` - Where to generate SDKs (./src/lib/notion-sdk)

#### Manual CLI Approach

If you prefer CLI directly:

```bash
dotenv -- npx notion-ts-client generate
```

**What gets generated**:

```
src/lib/notion-sdk/dbs/[database-name]/
├── db.ts                  # Database class for queries/updates
├── types.ts               # Fully typed query/filter/response objects
├── response.dto.ts        # Type-safe response mapper (read all properties)
├── patch.dto.ts           # Type-safe update mapper (write-only writable properties)
├── constants.ts           # Property name→ID mappings & possible values
└── index.ts               # Exports all above
```

#### Configuration File

A `notion-ts-client.config.json` file is auto-created/updated. This tracks:
- All databases connected to your Notion integration
- Property mappings and custom variable names
- You can edit `varName` fields to customize generated class names

---

### 4. Alternative: One-Off Schema Inspection

If you need to inspect a database schema without generating full SDK, use **Notion MCP**:

1. Ensure Notion MCP is authenticated (if not, request user to set it up)
2. Use MCP tools to query database schema
3. Document the schema structure

---

## Implementation Workflow

### Step 1: Requirements Gathering

Ask the user:
- Database name and purpose
- Environment variable name (e.g., `NOTION_BLOG_DB_ID`)
- Feature name (e.g., `blog`, `testimonials`)
- Is database already connected to integration?

---

### Step 2: Generate SDK

Run the package.json script:

```bash
pnpm notion:generate
```

This will:
1. Connect to your Notion integration
2. Detect all shared databases
3. Prompt you to add/ignore new databases
4. Generate TypeScript SDKs in `src/lib/notion-sdk/dbs/[database-name]/`
5. Update `notion-ts-client.config.json`

**Generated files per database**:

- `db.ts` - `[DatabaseName]Database` class with type-safe `query()` and `updatePage()` methods
- `types.ts` - `[DatabaseName]Response` interface with fully typed properties and filters
- `response.dto.ts` - `[DatabaseName]ResponseDTO` for reading (includes all properties)
- `patch.dto.ts` - `[DatabaseName]PatchDTO` for updating (only writable properties)
- `constants.ts` - Property ID mappings and possible values

---

### Understanding ResponseDTO Property Getters

**ResponseDTO** classes automatically transform Notion's complex property types into convenient getters. Instead of accessing raw Notion data, you get clean TypeScript objects:

**Rich Text Properties** (like descriptions, job posts, etc):
```typescript
const dto = new JobOpeningsResponseDTO(rawPage);

// DTO transforms this automatically:
dto.properties.jobPost
// Returns: { text: 'Full text...', links: [...], rich_text: [...] }

// Easy text access
const text = opening.properties.jobPost?.text;
```

**Select/Multi-Select Properties**:
```typescript
dto.properties.department      // Returns: { name: 'Engineering', color: '...' }
dto.properties.requiredSkills  // Returns: { values: ['JavaScript', 'React'], multi_select: [...] }
```

**Number/Date Properties**:
```typescript
dto.properties.openPositions   // Returns: number or undefined
dto.properties.openingDate     // Returns: { start: '2025-01-15', end?: '...' } or null
```

**Important**: All properties in the DTO are already mapped by the generator. If a property exists in your Notion database schema, you can access it via `opening.properties.[propertyName]`. The DTO's `__data` object (line 63-79 in response.dto.ts) shows all available mappings.

---

### Step 3: Create Remote Functions

**File**: `src/lib/[feature].remote.ts`

```typescript
import { query, command } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { NOTION_API_KEY } from '$env/static/private';
import { 
    JobOpeningsDatabase, 
    JobOpeningsResponseDTO,
    JobOpeningsPatchDTO 
} from '$lib/notion-sdk/dbs/job-openings';

// Query function - fetch all open jobs
export const getOpenings = query(async () => {
    const db = new JobOpeningsDatabase({
        notionSecret: NOTION_API_KEY
    });
    
    const response = await db.query({
        filter: {
            and: [
                { status: { equals: 'Open' } }
            ]
        },
        sorts: [{ property: 'openingDate', direction: 'descending' }]
    });
    
    // Map results to ResponseDTO for type-safe property access
    return response.results.map(r => new JobOpeningsResponseDTO(r));
});

// Query function - get single opening by ID
export const getOpening = query(
    v.pipe(v.string(), v.minLength(1)),
    async (id) => {
        const db = new JobOpeningsDatabase({
            notionSecret: NOTION_API_KEY
        });
        
        const page = await db.getPage(id);
        
        if (!page) {
            throw error(404, { message: 'Opening not found' });
        }
        
        return new JobOpeningsResponseDTO(page);
    }
);

// Command function - create new opening
export const createOpening = command(
    v.object({
        jobTitle: v.string(),
        department: v.string(),
        status: v.string(),
        // ... other fields
    }),
    async (data) => {
        const db = new JobOpeningsDatabase({
            notionSecret: NOTION_API_KEY
        });
        
        await db.updatePage(
            id,
            new JobOpeningsPatchDTO({
                properties: {
                    jobTitle: data.jobTitle,
                    department: data.department as any,
                    status: data.status as any
                    // PatchDTO only includes writable properties
                }
            })
        );
        
        return { success: true };
    }
);
```

**Key Points**:
- All properties in filters/sorts are **fully typed** - TypeScript will auto-complete
- `ResponseDTO` provides clean getters: `dto.properties.jobTitle`, `dto.properties.department`
- `PatchDTO` only includes writable properties (excludes formulas/rollups)
- Always validate inputs with Valibot before passing to Notion
- Keep all Notion logic on server side (in `.remote.ts` files)

---

### Step 4: Use in Svelte Components

**File**: `src/routes/[feature]/+page.svelte`

```svelte
<script lang="ts">
    import { getAllItems } from '$lib/[feature].remote';
    
    // Svelte 5 with async support
    let items = $state(await getAllItems());
</script>

<div>
    {#each items as item}
        <div>
            <!-- Type-safe access to properties -->
            <h2>{item.properties.name}</h2>
            <p>{item.properties.description}</p>
        </div>
    {/each}
</div>
```

**Alternative without await**:

```svelte
<script lang="ts">
    const query = getAllItems();
</script>

{#if query.error}
    <p>Error loading data</p>
{:else if query.loading}
    <p>Loading...</p>
{:else}
    {#each query.current as item}
        <div>{item.properties.name}</div>
    {/each}
{/if}
```

---

## Verification

### 1. Browser DevTools

**Network Tab**:
- Open DevTools (F12) → Network
- Filter by `Fetch/XHR`
- Look for `POST /_sveltekit/remote/[functionName]`
- Check status codes (200 = success, 404 = not found, 500 = error)
- Inspect request payload and response body

**Console Tab**:
- Check for errors
- Use `console.log()` in remote functions for debugging
- Validation errors from Valibot appear here

---

### 2. Notion MCP (if available)

Use MCP tools to:
- Query databases directly
- Inspect schema
- Verify data is being written correctly

---

### 3. Regenerate SDK on Schema Changes

Whenever Notion database schema changes:

```bash
npx notion-ts-client generate
```

- Config file auto-updates
- SDK regenerates with new types
- TypeScript errors will highlight code that needs updates

---

## Pre-Implementation Checklist

### Phase 1: Requirements

- [ ] Database name and purpose?
- [ ] Environment variable name?
- [ ] Feature name for code?
- [ ] Database shared with Notion integration?

---

### Phase 2: Schema Setup

- [ ] Run `notion-ts-client init` (first time only)
- [ ] Run `notion-ts-client generate` to create SDK
- [ ] Review generated types in `src/lib/notion-sdk/dbs/[database]/`
- [ ] Document any custom property names or special cases

---

### Phase 3: Implementation

- [ ] Add database ID to `.env`
- [ ] Create `src/lib/[feature].remote.ts` with remote functions
- [ ] Use generated Database class for queries
- [ ] Use ResponseDTO for type-safe property access
- [ ] Use PatchDTO for updates (excludes read-only props)
- [ ] Add Valibot validation schemas
- [ ] Create Svelte page/component that imports remote functions

---

### Phase 4: Verification

- [ ] Data fetches correctly in browser
- [ ] Network tab shows successful requests
- [ ] TypeScript has no errors (`pnpm check`)
- [ ] Handle empty states (no data)
- [ ] Handle error states (404, 500)

---

## Common Patterns

### Handling Large Datasets (Pagination)

Notion API responses are capped at 100 items per request. For any database that can grow beyond that,
use cursor-based pagination with `start_cursor`, `next_cursor`, and `has_more`. This is required for
reliable results (items can "disappear" if you only take the first 100).

```typescript
const allResults: any[] = [];
let startCursor: string | undefined = undefined;

// eslint-disable-next-line no-constant-condition
while (true) {
  const response = await db.query({
    page_size: 100,
    ...(startCursor ? { start_cursor: startCursor } : {}),
    // filter/sorts here
  });

  allResults.push(...(response.results ?? []));
  if (!response.has_more || !response.next_cursor) break;
  startCursor = response.next_cursor;
}
```

### Query with Filters

```typescript
const response = await db.query({
    filter: {
        and: [
            { status: { equals: 'Published' } },
            { price: { greater_than: 100 } },
            { date: { on_or_after: '2025-01-01' } }
        ]
    },
    sorts: [
        { property: 'date', direction: 'ascending' }
    ]
});
```

All filters and sorts are **fully typed** based on your database schema.

---

### Create New Page

```typescript
await db.createPage({
    properties: {
        title: 'New Item',
        status: 'Draft',
        price: 100
        // All properties are typed
    }
});
```

---

### Update Existing Page

```typescript
await db.updatePage(
    pageId,
    new YourDatabasePatchDTO({
        properties: {
            status: 'Published'
            // Only writable properties available
        }
    })
);
```

---

## Common Pitfalls

### ❌ Using generated SDK on client side

**Wrong**:
```svelte
<script lang="ts">
    import { MyDatabase } from '$lib/notion-sdk/dbs/my-database';
    
    // This exposes Notion API key to browser!
    const db = new MyDatabase({ notionSecret: NOTION_API_KEY });
</script>
```

**Correct**:
```typescript
// src/lib/myFeature.remote.ts (server-side only)
export const getData = query(async () => {
    const db = new MyDatabase({ notionSecret: NOTION_API_KEY });
    return await db.query({ ... });
});
```

---

### ❌ Returning class instances from remote functions

**Wrong** - Will cause `DevalueError: Cannot stringify arbitrary non-POJOs`:
```typescript
export const getItems = query(async () => {
    const db = new MyDatabase({ notionSecret: NOTION_API_KEY });
    const response = await db.query({ ... });
    // ❌ Returning class instances - cannot be serialized!
    return response.results.map(r => new MyDatabaseResponseDTO(r));
});
```

**Correct** - Transform to plain objects before returning:
```typescript
export const getItems = query(async () => {
    const db = new MyDatabase({ notionSecret: NOTION_API_KEY });
    const response = await db.query({ ... });
    
    // ✅ Transform DTOs to plain objects for serialization
    const dtos = response.results.map(r => new MyDatabaseResponseDTO(r));
    return dtos.map(dto => transformDatabaseDTO(dto));
});
```

**Why**: Remote functions serialize return values to JSON for client transmission. Class instances cannot be serialized - always convert to plain objects using helper functions like `transformDatabaseDTO()`.

---

### ❌ Not handling empty results

**Wrong**:
```typescript
const response = await db.query({ ... });
return response.results[0]; // May be undefined
```

**Correct**:
```typescript
const response = await db.query({ ... });
if (response.results.length === 0) {
    throw error(404, { message: 'Not found' });
}
return response.results[0];
```

---

### ❌ Forgetting to validate inputs

**Wrong**:
```typescript
export const getItem = query(async (slug) => {
    // slug not validated
});
```

**Correct**:
```typescript
export const getItem = query(
    v.pipe(v.string(), v.minLength(1)),
    async (slug) => {
        // slug is validated
    }
);
```

---

## Benefits of notion-ts-client

1. **Type Safety** - All properties, filters, sorts are typed
2. **Auto-Generation** - Schema changes auto-update your code
3. **Less Boilerplate** - No manual property mapping
4. **Read-Only Safety** - PatchDTO prevents writing to formulas/rollups
5. **Easy Refactoring** - Rename in Notion, regenerate, fix TypeScript errors

---

## Resources

- [notion-ts-client GitHub](https://github.com/velsa/notion-ts-client)
- [Notion API Documentation](https://developers.notion.com/)
- [SvelteKit Remote Functions](../svelte/remote-functions.md)
- [Valibot Documentation](https://valibot.dev/)
- Existing implementations: `src/lib/menu.remote.ts`, `src/lib/workshops.remote.ts`

---

**Last Updated**: 2025-11-02  
**Maintainer**: Casa Luma Development Team
