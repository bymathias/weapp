# WeCPQ

A Configure-Price-Quote demo app built on Cloudflare Workers, Hono, and D1.
It exists to be automated: a clean server-rendered UI with stable
`id`/`name`/`data-testid` attributes for UI automation (e.g. UiPath), and a
bearer-protected REST API documented with OpenAPI/Swagger for API-based
automation.

## Stack

- Cloudflare Workers + [Hono](https://hono.dev)
- Cloudflare D1 (SQLite)
- `pdf-lib` for PDF generation (no headless browser)
- `@hono/zod-openapi` + Swagger UI for API docs

## Credentials

Local defaults (from `.dev.vars.example`):

| Surface | Values |
|---|---|
| UI login (`/login`) | `admin` / `demo123` |
| API OAuth2 client credentials (`POST /oauth/token`) | `client_id=wecpq-demo-client`, `client_secret=wecpq-demo-secret` |

`UI_USERNAME` and `OAUTH_CLIENT_ID` are plain `[vars]` in `wrangler.toml`.
`SESSION_SECRET`, `UI_PASSWORD` and `OAUTH_CLIENT_SECRET` are secrets: read
from `.dev.vars` locally (gitignored) and set with `wrangler secret put` on the
deployed Worker, so the deployed values never appear in this repo.

## Project layout

```
schema.sql          D1 table definitions
seed.sql             deterministic demo data (8 customers, 16 quotes)
src/
  index.ts           app entrypoint — mounts oauth, api, ui routers
  types.ts            shared Env/domain types
  lib/                totals math, session cookies, bearer tokens
  db/queries.ts        D1 access layer (also computes totals server-side)
  api/                 zod-openapi routes, schemas, /oauth/token
  ui/                  server-rendered pages (login, dashboard, customer, quote)
  pdf.ts               pdf-lib quote PDF generation
```

## Local development

Install dependencies and create your local secrets file:

```sh
npm install
cp .dev.vars.example .dev.vars
```

Create the local D1 database and load schema + seed data:

```sh
npm run db:migrate:local
npm run db:seed:local
```

Run the dev server:

```sh
npm run dev
```

This starts `wrangler dev` (Miniflare) on `http://localhost:8787`. Log in at
`/login` with `admin` / `demo123`.

> If `wrangler dev` needs to bind IPv6 and your environment doesn't support
> it, run `wrangler dev --ip 127.0.0.1` instead.

## Deploying to Cloudflare

1. Create the D1 database in your Cloudflare account:

   ```sh
   npx wrangler d1 create wecpq
   ```

   Copy the returned `database_id` into `wrangler.toml` under
   `[[d1_databases]]` (replace `REPLACE_WITH_YOUR_D1_DATABASE_ID`).

2. Apply schema and seed data to the remote database:

   ```sh
   npm run db:migrate:remote
   npm run db:seed:remote
   ```

3. Set the secrets (use strong random values, not the local defaults):

   ```sh
   npx wrangler secret put SESSION_SECRET
   npx wrangler secret put UI_PASSWORD
   npx wrangler secret put OAUTH_CLIENT_SECRET
   ```

4. Deploy:

   ```sh
   npm run deploy
   ```

## GitHub → Cloudflare auto-deploy

1. Push this repo to GitHub.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Workers →
   Connect to Git**, pick the repo/branch.
3. Build command: `npm install` (Wrangler deploy is handled by Cloudflare's
   Workers Builds integration using `wrangler.toml`).
4. Add the D1 binding in the Cloudflare dashboard build settings if it isn't
   picked up automatically from `wrangler.toml`.
5. Every push to the connected branch redeploys automatically.

## API usage

1. Get a bearer token:

   ```sh
   curl -X POST http://localhost:8787/oauth/token \
     -d grant_type=client_credentials \
     -d client_id=wecpq-demo-client \
     -d client_secret=wecpq-demo-secret
   ```

2. Call the API with it:

   ```sh
   curl http://localhost:8787/api/customers \
     -H "Authorization: Bearer <access_token>"
   ```

3. Explore/try endpoints interactively at `/api-docs` (Swagger UI); the raw
   spec is at `/openapi.json` — point a UiPath connector generator at it.

Tokens expire after 1 hour.

## Adding WeCPQ as a UiPath connector

UiPath Automation Cloud's **Integration Service** can build a custom
connector directly from WeCPQ's OpenAPI spec (`/openapi.json`), since it
already documents every endpoint and declares the OAuth2 client-credentials
security scheme.

1. Automation Cloud → **Integration Service** → **Connectors** → **Create
   Custom Connector**, and import the OpenAPI spec — either upload the file
   or point it at `https://<your-deployment>/openapi.json` (e.g.
   `https://wecpq.bymathias.workers.dev/openapi.json`). Integration Service
   parses the paths/schemas and generates connector actions automatically.
2. **Override the base URL**: the spec declares `servers: [{ url: "/" }]`
   (relative, since it's meant to resolve against whatever host serves it).
   UiPath needs an absolute URL, so set it explicitly to your deployment's
   origin, e.g. `https://wecpq.bymathias.workers.dev`.
3. **Auth** — choose connection type **OAuth 2.0 – Client Credentials**
   (built into UiPath):
   - Token URL: `https://<your-deployment>/oauth/token`
   - Client ID: `wecpq-demo-client`
   - Client Secret: the deployed `OAUTH_CLIENT_SECRET`

   This matches `POST /oauth/token` exactly (standard `client_credentials`
   grant, returns `{access_token, token_type, expires_in}`). UiPath fetches
   and auto-refreshes tokens on its own — no manual handling of the 1-hour
   TTL needed.
4. Test each generated action in the connector's test panel (list/create
   customers, create/update quotes, download PDF, etc.).
5. Once published, the actions are usable from Studio/Studio Web activities,
   or as triggers/actions in Integration Service-driven automations.

## Business rules

- `line_total = quantity * unit_price`
- `subtotal = sum(line_total)`
- `total_amount = subtotal * (1 + margin_pct / 100)`
- All totals are computed server-side on create/update — client-sent totals
  are ignored.
- A quote with `status = "Won"` is locked: the UI shows it read-only with a
  "locked" banner, and `PUT /api/quotes/:ref` returns `409` while it's Won.

## Seed data

`seed.sql` creates 8 fictional IT-sector customers (`CUST-0001`…`CUST-0008`)
and 16 quotes (`Q-2026-0001`…`Q-2026-0016`) spanning all four statuses,
including several Won quotes (to demo the lock) and quotes with multiple
line items. Re-running `db:migrate:local`/`remote` drops and recreates the
schema, so re-seeding always yields the same data.
