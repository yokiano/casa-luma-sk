# Neon Database Related Info


I have those setup in the local .env file:
```
# Recommended for most uses
DATABASE_URL=************

# For uses requiring a connection without pgbouncer
DATABASE_URL_UNPOOLED=*********************

# Parameters for constructing your own connection string
PGHOST=******
PGHOST_UNPOOLED=***************
PGUSER=******
PGDATABASE=**********
PGPASSWORD=**********

# Parameters for Vercel Postgres Templates
POSTGRES_URL=************
POSTGRES_URL_NON_POOLING=************************
POSTGRES_USER=*************
POSTGRES_HOST=*************
POSTGRES_PASSWORD=*****************
POSTGRES_DATABASE=*****************
POSTGRES_URL_NO_SSL=*******************
POSTGRES_PRISMA_URL=*******************
```


## Usage 
Snippet for drizzle, taken from vercel neon integration page:
```
// src/db.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env" }); // or .env.local

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql });
```

## Instructions for how to use:
Connect to a project

In this guide, you will learn how to connect SvelteKit with Neon over a secure server-side request using the @neondatabase/serverless driver.

Start by connecting to a SvelteKit project. If you don't already have a project to connect to, you can create one. For instructions, see Creating a project in the SvelteKit documentation.

2

Pull your latest environment variables

Run vercel env pull .env.development.local to make the latest environment variables available to your project locally.

3

Install the Neon serverless driver

Run npm install @neondatabase/serverless to install the Neon serverless driver for connecting to your Neon database.

For more about our driver, see Neon serverless driver.

4

Load Data on the Server

In your server routes (+server.js files), use the following code snippet to connect to your Neon database:


import { neon } from '@neondatabase/serverless';

const connectionString: string = process.env.DATABASE_URL as string;
const sql = neon(connectionString);

export async function load() {
    const response = await sql`SELECT version()`;
    const { version } = response[0];
    return {
        version,
    };
}
5

Load Data on the Client

In your +page.svelte files, use the following code snippet to fetch data from your server:


<script>
    export let data;
</script>

<h1>Database Version</h1>
<p>{data.version}</p>
6

Run the app

Execute the following command to run your application locally:


npm run dev
You can expect to see output similar to the following when you visit localhost:5173:


Database Version
PostgreSQL 17.2 on x86_64-pc-linux-gnu, compiled by gcc (Debian 12.2.0-14) 12.2.0, 64-bit
You can find the source code for the application described in this guide on GitHub. See Get started with Svelte and Neon.


