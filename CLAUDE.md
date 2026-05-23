# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Commands

```bash
npm run dev       # Next.js dev server (http://localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
npm run worker    # Cloudflare Worker dev with tunnel (wrangler dev --tunnel)
```

To deploy the worker: `npx wrangler deploy --config worker/wrangler.toml`

Worker secrets: `wrangler secret put OPENROUTER_API_KEY --config worker/wrangler.toml`

## Architecture

This project has two separate runtimes that must both be running for AI features to work:

**Next.js app** (`src/`) — frontend + auth + data layer  
**Cloudflare Worker** (`worker/`) — AI inference backend, proxies to OpenRouter API

### AI Agent flow (two-phase confirmation)

The worker's `/chat` endpoint implements a confirmation gate for write operations:

1. Client sends conversation history to `POST /chat` with a Supabase Bearer token
2. Worker validates the JWT, fetches the user's categories, then calls the LLM (nvidia/nemotron via OpenRouter)
3. If the model calls a **write tool** (`addExpense`, `deleteExpense`), the worker returns `{ pendingToolCalls: [...] }` immediately — it does NOT execute the DB write
4. The frontend (`useAgent.ts`) surfaces a confirmation UI via `PendingActionPanel`
5. On user confirmation, the frontend itself executes the Supabase writes directly

Read tools (`listExpenses`) execute server-side in the worker and their results feed back into the LLM loop (up to 3 steps).

### Data layer

All client-side data access uses TanStack Query hooks in `src/hooks/`:
- `useExpenses.ts` — CRUD mutations and infinite-scroll query for expenses; also `useFetchMonthlyExpenses`
- `useCategory.ts` — categories list
- `useLoan.ts` — loan CRUD

Supabase realtime is set up in `useExpenseSubscription.ts` and mounted via `<ExpenseRealtimeSync>` in the dashboard layout. It updates the TanStack Query cache directly for INSERT/UPDATE/DELETE events, avoiding full refetches.

### Auth

Middleware (`src/middleware.ts`) redirects unauthenticated users to `/login` and authenticated users away from `/login`. The Supabase SSR client is created server-side in `src/lib/supabase-server.ts`; the browser client singleton lives in `src/lib/supabase.ts`.

`AuthProvider` (`src/providers/auth-provider.tsx`) exposes `useAuth()` for client components that need the current user/session.

### Database schema (Supabase)

| Table | Key columns |
|---|---|
| `expense` | `id`, `name`, `amount`, `category` (FK), `is_expense`, `spend_date`, `user_id` |
| `expense_category` | `id`, `name`, `is_expense`, `user_id` |
| `loan` | `id`, `name`, `total_amount`, `interest_rate`, `user_id` |
| `loan_record` | `id`, `loan` (FK), `amount`, `pay_date`, `user_id` |

Types are generated in `src/types/database.types.ts`. Use `Tables<"expense">`, `TablesInsert<"expense">`, `TablesUpdate<"expense">` for typed DB access.

### UI

Components are shadcn/ui (Radix UI primitives) with Tailwind CSS v4. Add new shadcn components via `npx shadcn add <component>`. The sidebar layout wraps all dashboard routes via `src/app/dashboard/layout.tsx`.

### Worker environment

The worker (`worker/wrangler.toml`) reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` as `[vars]` and `OPENROUTER_API_KEY` as a secret. `ALLOWED_ORIGIN` controls CORS. The frontend connects to the worker via `NEXT_PUBLIC_WORKER_URL`.
