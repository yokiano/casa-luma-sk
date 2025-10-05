# SvelteKit Remote Functions

> **Note:** Remote functions are experimental as of SvelteKit 2.27. Enable in `svelte.config.js`:
> ```js
> kit: {
>   experimental: {
>     remoteFunctions: true
>   }
> }
> ```

## Overview

Remote functions allow type-safe communication between client and server. They're **called anywhere** in your app but always **run on the server**, making them perfect for:
- Database queries
- API calls with secret keys
- Server-only operations

They replace the traditional API routes (`/api/...`) with a more direct, type-safe approach.

## Types of Remote Functions

### 1. `query` - Read Data

Used for fetching data from the server (like GET requests).

**File:** `src/lib/data.remote.ts`

```ts
import { query } from '$app/server';
import { db } from '$lib/server/database';

export const getPosts = query(async () => {
  return await db.posts.findMany();
});

// With validation using Valibot/Zod
import * as v from 'valibot';

export const getPost = query(
  v.string(), // schema for argument
  async (slug) => {
    return await db.posts.findOne({ where: { slug } });
  }
);
```

**Usage in Component:**

```svelte
<script lang="ts">
  import { getPosts, getPost } from '$lib/data.remote';
  
  let { slug } = $props();
  
  // Using await (requires compilerOptions.experimental.async: true)
  const posts = await getPosts();
  const post = await getPost(slug);
</script>

<h1>{post.title}</h1>
```

**Alternative without await:**

```svelte
<script lang="ts">
  const query = getPosts();
</script>

{#if query.error}
  <p>Error loading posts</p>
{:else if query.loading}
  <p>Loading...</p>
{:else}
  <ul>
    {#each query.current as post}
      <li>{post.title}</li>
    {/each}
  </ul>
{/if}
```

### 2. `form` - Handle Form Submissions

Used for processing form data (like POST with FormData).

```ts
import { form } from '$app/server';

export const submitContact = form(async (data) => {
  const name = data.get('name');
  const email = data.get('email');
  
  await db.contacts.create({ name, email });
  
  return { success: true };
});
```

### 3. `command` - Mutations Without Forms

Used for actions that mutate data but don't involve forms.

```ts
import { command } from '$app/server';
import * as v from 'valibot';

export const deletePost = command(
  v.string(),
  async (postId) => {
    await db.posts.delete({ where: { id: postId } });
    return { deleted: true };
  }
);
```

### 4. `prerender` - Static Data Generation

For data that can be pre-rendered at build time.

```ts
import { prerender } from '$app/server';
import * as v from 'valibot';

export const getStaticPost = prerender(
  v.string(),
  async (slug) => {
    return await db.posts.findOne({ where: { slug } });
  },
  {
    dynamic: true,
    inputs: () => ['first-post', 'second-post', 'third-post']
  }
);
```

## Validation

Always validate inputs using Standard Schema libraries (Valibot, Zod, etc.):

```ts
import * as v from 'valibot';
import { query, error } from '$app/server';

const PostSchema = v.object({
  title: v.string(),
  slug: v.string(),
});

export const createPost = command(
  PostSchema,
  async (data) => {
    // data is typed and validated
    return await db.posts.create(data);
  }
);
```

To skip validation (not recommended):

```ts
export const riskyFunction = query('unchecked', async (arg: any) => {
  // arg is not validated - use with caution
});
```

## Accessing Request Context

Use `getRequestEvent()` to access cookies, headers, etc.:

```ts
import { getRequestEvent, query } from '$app/server';

export const getUser = query(async () => {
  const { cookies } = getRequestEvent();
  const sessionId = cookies.get('session_id');
  
  return await findUser(sessionId);
});
```

## Error Handling

Use SvelteKit's `error()` helper:

```ts
import { query, error } from '$app/server';

export const getPost = query(v.string(), async (slug) => {
  const post = await db.posts.findOne({ where: { slug } });
  
  if (!post) {
    throw error(404, 'Post not found');
  }
  
  return post;
});
```

## Redirects

Inside `query`, `form`, and `prerender` you can use `redirect()`:

```ts
import { form, redirect } from '$app/server';

export const login = form(async (data) => {
  const user = await authenticateUser(data);
  
  if (user) {
    throw redirect(303, '/dashboard');
  }
});
```

> **Note:** Do NOT use `redirect()` in `command` functions.

## File Naming

Remote functions must be in `.remote.ts` or `.remote.js` files:
- ✅ `src/lib/data.remote.ts`
- ✅ `src/routes/blog/actions.remote.ts`
- ❌ `src/lib/data.ts` (won't work)

## Benefits Over API Routes

1. **Type Safety** - Full TypeScript support, arguments and return types are inferred
2. **Less Boilerplate** - No need to create `+server.ts` files and handle HTTP manually
3. **Auto-generated Endpoints** - SvelteKit creates the HTTP layer automatically
4. **Validation Built-in** - Standard Schema validation is part of the API
5. **Direct Usage** - Import and call directly in components, no fetch wrappers needed

## Migration from API Routes

**Before (API Route):**

```ts
// src/routes/api/posts/+server.ts
export async function GET() {
  const posts = await db.posts.findMany();
  return json(posts);
}

// Component
const response = await fetch('/api/posts');
const posts = await response.json();
```

**After (Remote Function):**

```ts
// src/lib/posts.remote.ts
export const getPosts = query(async () => {
  return await db.posts.findMany();
});

// Component
const posts = await getPosts();
```

