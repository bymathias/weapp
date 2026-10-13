# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

WeCPQ is a Configure-Price-Quote demo app on Cloudflare Workers (Hono + D1),
built specifically to be automated: a server-rendered UI with stable
`id`/`name`/`data-testid` attributes for UI automation tools (e.g. UiPath),
and a bearer-protected REST API documented with OpenAPI/Swagger for
API-based automation.

## Commands

```sh
npm run dev                 # wrangler dev (Miniflare) on :8787
npm run typecheck           # tsc --noEmit
npm run db:migrate:local    # drop/recreate schema against local D1
npm run db:seed:local       # load seed.sql (8 customers, 16 quotes) into local D1
npm run db:migrate:remote   # same, against the deployed D1 database
npm run db:seed:remote
npm run deploy               # wrangler deploy
```

There is no test suite. `wrangler dev --ip 127.0.0.1` if IPv6 binding fails
in the environment.

Local dev requires running migrate + seed once before `npm run dev` — the
local D1 database is empty otherwise. Re-running migrate drops and recreates
all tables (seed data is deterministic, so this is always safe to re-run).

Local credentials (`.dev.vars`, copied from `.dev.vars.example`): UI login
`admin`/`demo123`; OAuth client-credentials `wecpq-demo-client`/
`wecpq-demo-secret`.

## Architecture

Single Hono app (`src/index.ts`) mounting three routers, in this order:

1. `oauthRouter` (`src/api/oauth.ts`) — `POST /oauth/token`, public.
2. `apiRouter` (`src/api/router.ts`) — `OpenAPIHono` under `/api`, bearer-only
   (`requireBearerAuth`, `src/lib/bearer.ts`). Also serves `/openapi.json`
   and `/api-docs` (Swagger UI).
3. `uiRouter` (`src/ui/router.ts`) — server-rendered pages, mounted last so
   `/login` stays reachable before its own blanket `requireUiAuth` middleware
   (`uiRouter.use("/*", ...)`) locks the rest of the tree.

Order matters: oauth/api routes are registered before `uiRouter`'s
catch-all auth so they're never accidentally shadowed by it.

**Two independent auth mechanisms, one exception**: UI auth is a signed
session cookie (`src/lib/session.ts`, HMAC via `SESSION_SECRET`); API auth
is a stateless bearer token (`src/lib/token.ts`, 1-hour TTL, same
`SESSION_SECRET` for signing). The one place they cross is
`GET /api/quotes/:ref/pdf` — route-specific middleware in `api/router.ts`
accepts a logged-in browser's session cookie there (for the UI's "Download
PDF" button) in addition to the bearer token, by pre-setting
`c.set("apiClientId", "ui-session")` before `requireBearerAuth` runs, which
then no-ops if `apiClientId` is already set.

**Business rules are computed server-side only**, in `src/lib/totals.ts`,
and called from both the UI form handler and the API handler so the two
surfaces can't drift:
- `line_total = quantity * unit_price`
- `subtotal = sum(line_total)`
- `total_amount = subtotal * (1 + margin_pct / 100)`
- Client-sent totals are always ignored/recomputed.
- A quote with `status = "Won"` is locked: `updateQuote` in
  `src/db/queries.ts` throws `Error("won_locked")`, which the UI router
  catches and redirects, and the API router catches and turns into `409`.

**Data layer** (`src/db/queries.ts`) is the only place that touches D1
directly; it also owns quote-ref generation (`Q-<year>-<seq>`, in
`totals.ts`'s `nextQuoteRef`) and the totals computation on create/update.
Types for `Customer`/`Quote`/`QuoteItem`/`QuoteWithItems` live in
`src/types.ts`, mirrored by zod schemas in `src/api/schemas.ts` for the
OpenAPI surface.

**UI rendering** (`src/ui/pages.ts`, `src/ui/layout.ts`) uses Hono's
`html` template tag — no client framework. Every interactive element
carries both a stable `id` and a `data-testid` attribute; when adding UI,
follow the existing naming convention (e.g. `data-testid="quote-status-badge"`)
since that's the whole point of this app. Line-item rows in the quote
form are client-side add/remove via a `<template>` element
(`#row-template`) — see the inline script in `pages.ts`.

**PDF generation** (`src/pdf.ts`) uses `pdf-lib` directly (no headless
browser, since Workers can't run one).

## Environment / secrets

The repo is public. `wrangler.toml` `[vars]` holds only non-secret values
(`UI_USERNAME`, `OAUTH_CLIENT_ID`). `SESSION_SECRET`, `UI_PASSWORD` and
`OAUTH_CLIENT_SECRET` come from `.dev.vars` locally and from
`wrangler secret put` when deployed — never add them to `[vars]`.
