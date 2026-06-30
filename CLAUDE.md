# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

PDFinder: a "wishlist + automatic WhatsApp notification" tool. A user registers products and contacts (each contact has a wishlist of products). When the user uploads a PDF (invoice / arrival list), the system extracts its text, uses an LLM to match which registered products appear in it, cross-references that against the wishlists, and sends a WhatsApp message to every contact who wanted one of the matched products.

The repo is a two-package monorepo. The packages are independent processes that only talk over HTTP — there is no shared code, types, or build step between them.

```
PDFinder/
├── wa-worker/   # Node process that holds the WhatsApp connection (Baileys)
└── app-web/     # Next.js app — UI, API routes, Supabase access
```

`wa-worker` is not deployed to Vercel (it must stay running persistently); it runs on Railway/Render or a local machine. `app-web` is the Next.js app.

## Commands

Run from inside each package directory (there is no root package.json).

**app-web** (Next.js):
```
cd app-web
npm install
npm run dev      # localhost:3000
npm run build
npm run lint
```

**wa-worker** (WhatsApp bridge):
```
cd wa-worker
npm install
npm start         # starts the Express server + Baileys socket
```
On first run (or after the session is invalidated), open `http://localhost:3001/qr` to scan the WhatsApp pairing QR code. Session credentials persist in `wa-worker/auth_info/` (gitignored — never commit this, it contains live WhatsApp session keys).

There is no test suite in either package.

## Architecture

### wa-worker (`wa-worker/server.js`)
Single-file Express server wrapping a Baileys (`@whiskeysockets/baileys`) WhatsApp Web socket.
- `GET /status` — health/connection check, no auth (for platform healthchecks).
- `GET /qr` / `GET /qr.png` — pairing UI, no auth.
- `POST /send` and `POST /send-doc` — require header `x-auth-token: <AUTH_TOKEN>`. `/send-doc` downloads a file from a given URL (used for Supabase Storage signed URLs) and forwards it as a WhatsApp document with a caption.
- Reconnects automatically on connection drop, unless the disconnect reason is `loggedOut` (then the `auth_info/` folder must be deleted and re-paired).
- All user-facing strings/logs are in Portuguese (pt-BR); keep this consistent when touching this file.

### app-web (Next.js, App Router)
Auth/session and DB layer is built on Supabase (Postgres + Auth + Storage), with row-level security as the only multi-tenancy boundary — every table has `user_id` and matching RLS policies (`supabase/migrations/001_baseline_schema.sql`). There is no app-level tenant check beyond what RLS enforces.

- `lib/supabase/{client,server,middleware}.ts` — the three Supabase client variants (browser, server component/route, middleware). `middleware.ts` calls `updateSession` on every non-API route to keep the session cookie fresh and gate unauthenticated access.
- `lib/database.types.ts` — generated Supabase types; `lib/types.ts` derives the app-facing `Produto`/`Contato`/`WishlistItem`/`Notificacao` types from it, plus the joined `ContatoComDesejos` (contact with its wishlist products populated).
- `lib/queries.ts` — all client-side Supabase CRUD (produtos, contatos, wishlist join/unjoin). Every mutation reads the current user via `auth.getUser()` and stamps `user_id`; RLS is the real enforcement, this is just so inserts succeed.
- `lib/pdf.ts` — extracts raw text from an uploaded PDF using `unpdf`. Scanned (non-digital) PDFs yield empty text and are explicitly rejected upstream.
- `lib/groq.ts` — sends the extracted PDF text + the user's registered product list to Groq (model from `GROQ_MODEL`, default `openai/gpt-oss-20b`) and asks it to return the IDs of products that semantically appear in the text (fuzzy: abbreviations, missing accents, different order are all expected matches). Forces `response_format: json_object` and parses defensively (regex-extracts the first `{...}` block, filters returned ids against the known-valid set).
- `lib/wa.ts` — thin client for the wa-worker HTTP API (`WA_WORKER_URL` / `WA_WORKER_TOKEN`).

**Import → match → notify pipeline:**
1. `app/(app)/importar` — user uploads a PDF to Supabase Storage (bucket `notas`).
2. `app/api/importar/route.ts` — downloads the blob from Storage, extracts text (`lib/pdf.ts`), loads the user's products, calls `identificarProdutos` (`lib/groq.ts`), then for each matched product looks up wishlist contacts with `opt_in === true`. Returns `{ encontrados: [{ produto, contatos }] }` for the UI to review (`components/importar/revisao-match.tsx`) before anything is sent — no message goes out from this route.
3. `app/api/disparar/route.ts` — fires one notification at a time (the browser calls it in sequence per contact, with a pause between calls — there is no server-side batching/queueing). Re-validates the contact's `opt_in` and the products via Supabase (RLS-scoped) rather than trusting the importar response, builds a Portuguese message, optionally attaches the source PDF(s) via signed URL + `enviarDocumento`, then logs one row per product into `notificacoes` regardless of success/failure.
4. `app/api/wa/status` and `app/api/wa/qr` — proxy the worker's `/status` and QR endpoints so the Next.js UI can show WhatsApp connection state without exposing the worker URL/token to the browser.

**Schema** (`supabase/migrations/001_baseline_schema.sql`): `produtos`, `contatos`, `wishlist` (join table, unique on `contato_id, produto_id`), `notificacoes` (append-only log with `status in ('pendente','enviado','erro','ignorado')`). All four tables are user-scoped with RLS `using/with check (auth.uid() = user_id)` policies — when adding a new table or query path, follow this same pattern rather than relying on application code to filter by user.

### Important environment quirk
`app-web`'s `package.json` pins `next@16.2.9` — a non-public/experimental Next.js version with breaking changes vs. the Next.js in general training data (see `app-web/AGENTS.md`). Before writing or changing any Next.js-specific code (routing, server actions, config), check `app-web/node_modules/next/dist/docs/` for the actual current API rather than assuming standard Next.js conventions.

### Secrets / local state — never commit
- `wa-worker/auth_info/` — live WhatsApp session credentials (gitignored).
- `app-web/.env.local`, `wa-worker/.env` — Supabase keys, Groq API key, worker auth token (gitignored).
