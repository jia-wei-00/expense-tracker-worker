# Expense Tracker AI Worker

A full-stack expense tracking application with an AI-powered chat agent. Built with Next.js and a Cloudflare Worker backend for AI inference.

> This is the AI Worker version. For the original app without the AI worker, see [expense-tracker](https://github.com/jia-wei-00/expense-tracker).

## Features

- **Expense & Income Tracking** — log transactions with categories and dates
- **Loan Management** — track money lent or borrowed
- **AI Agent** — chat with an AI that can read, add, and delete expenses on your behalf
- **WhatsApp Bot** — send text, voice, or image messages via WhatsApp to manage expenses
- **Financial Analytics** — AI-generated spending insights and tips
- **Charts & Visualizations** — spending breakdowns via Recharts
- **Dark / Light Theme** — via next-themes
- **Auth** — Supabase SSR authentication

## Tech Stack

| Layer          | Technology                                       |
| -------------- | ------------------------------------------------ |
| Frontend       | Next.js 16, React 19, TypeScript                 |
| Styling        | Tailwind CSS v4, shadcn/ui, Radix UI             |
| State / Data   | TanStack Query, React Hook Form, Zod             |
| Backend / Auth | Supabase (Postgres + Auth)                       |
| AI Worker      | Cloudflare Workers, OpenRouter / Gemini via OpenAI-compatible API |
| Messaging      | Meta WhatsApp Cloud API                          |
| Analytics      | Vercel Analytics                                 |

## Project Structure

```
├── .github/
│   └── workflows/
│       └── deploy-worker.yml         # CI/CD: auto-deploy worker on push to main
├── src/                              # Next.js frontend
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── agent/                # AI chat interface
│   │   │   ├── expenses/             # Expense management
│   │   │   ├── loans/                # Loan management
│   │   │   └── settings/             # User settings (incl. WhatsApp linking)
│   │   └── login/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── providers/
│   └── types/
└── worker/                           # Cloudflare Worker (AI backend)
    └── src/
        ├── index.ts                  # Router: dispatches paths to route handlers
        ├── env.ts                    # Worker env bindings type
        ├── ai/
        │   ├── prompts.ts            # System prompts (agent + analytics)
        │   └── tools.ts              # LangChain tools (read + write) + interrupt class
        ├── constants/                # Tool names, table names, button prefixes, TTLs
        ├── lib/                      # HTTP, base64, parsers
        ├── routes/
        │   ├── chat.ts               # POST /chat — main agent endpoint
        │   ├── whatsapp-webhook.ts   # GET + POST /whatsapp — Meta webhook
        │   ├── whatsapp-link.ts      # POST /whatsapp/link — link a phone number
        │   └── whatsapp-resend.ts    # POST /whatsapp/resend-verification
        ├── services/
        │   ├── agent.ts              # LangChain agent loop (LLM ↔ tools)
        │   ├── ai.ts                 # Resolves ChatOpenAI (OpenRouter / Gemini)
        │   ├── auth.ts               # Supabase JWT validation
        │   ├── chat-history.ts       # BaseListChatMessageHistory backed by Supabase
        │   ├── supabase.ts           # Client factories (user / service-role)
        │   └── whatsapp/
        │       ├── handler.ts        # Main webhook dispatch (text / audio / image / button)
        │       ├── api.ts            # Meta Cloud API: send messages, download media
        │       ├── webhook.ts        # Signature verification + payload parser
        │       ├── media.ts          # Media → LangChain ContentBlock[]
        │       ├── verify.ts         # Number-verification button handler
        │       └── confirm.ts        # Add/delete expense confirmation flow
        └── types/                    # Zod schemas + inferred types
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [OpenRouter](https://openrouter.ai) API key or a [Google AI](https://aistudio.google.com) Gemini API key
- A [Meta Developer](https://developers.facebook.com) app with WhatsApp Cloud API enabled (optional)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) for the Cloudflare Worker

### 1. Install dependencies

```bash
npm install
cd worker && npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Set this after deploying the Cloudflare Worker
NEXT_PUBLIC_WORKER_URL=https://your-worker.workers.dev
```

### 3. Configure the worker

Update `worker/wrangler.jsonc` vars:

```jsonc
{
  "vars": {
    "SUPABASE_URL": "your_supabase_project_url",
    "SUPABASE_ANON_KEY": "your_supabase_anon_key",
    "ALLOWED_ORIGIN": "https://your-frontend-domain.com",
    "AI_PROVIDER": "openrouter" // "openrouter" | "gemini"
  }
}
```

Observability (logs + invocation logs are enabled, traces are off) is configured under the top-level `observability` block — leave it as shipped unless you need different sampling.

Set secrets once via Wrangler (only set what you need based on `AI_PROVIDER`):

```bash
# AI provider — set one depending on AI_PROVIDER value
npx wrangler secret put OPENROUTER_API_KEY --config worker/wrangler.jsonc
npx wrangler secret put GEMINI_API_KEY --config worker/wrangler.jsonc

# Supabase
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config worker/wrangler.jsonc

# WhatsApp (optional — only needed if using the WhatsApp bot)
npx wrangler secret put WHATSAPP_VERIFY_TOKEN --config worker/wrangler.jsonc
npx wrangler secret put WHATSAPP_ACCESS_TOKEN --config worker/wrangler.jsonc
npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID --config worker/wrangler.jsonc
npx wrangler secret put WHATSAPP_APP_SECRET --config worker/wrangler.jsonc
```

### 4. Run the development servers

```bash
# Next.js frontend
npm run dev

# Cloudflare Worker (with tunnel)
npm run worker
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## WhatsApp Bot

The WhatsApp integration lets a user manage their expenses through chat — including voice notes and photo receipts — without opening the web app. Everything runs through Meta's WhatsApp Cloud API and the same Cloudflare Worker that serves the web `/chat` endpoint.

### Setup

1. Create a Meta Developer app and enable **WhatsApp Cloud API**.
2. In Meta → WhatsApp → Configuration, set the webhook URL to `https://your-worker.workers.dev/whatsapp` and the verify token to the same value as `WHATSAPP_VERIFY_TOKEN` (whatever string you choose).
3. Subscribe the webhook to the `messages` field.
4. Copy your **App Secret** from App Settings → Basic → Show — this is `WHATSAPP_APP_SECRET`.
5. Copy your **Phone Number ID** and **Permanent Access Token** from the WhatsApp dashboard — these are `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN`.
6. In the deployed web app: **Settings → WhatsApp**, enter the phone number you want to link. A verification prompt is sent to that number via WhatsApp.
7. Tap **Confirm** in WhatsApp — your account is now linked and the bot is active.
8. Send text, voice, or image messages to start tracking expenses.

### What the bot can do

The bot uses the same LangChain agent and tool set as the web chat:

| Capability | Example message |
|---|---|
| Add an expense | "spent rm12 on lunch", "RM50 groceries yesterday" |
| Add income | "received salary 5000" |
| Delete an expense | "delete the coffee one from this morning" |
| Query by category | "how much did I spend on food this month?" |
| Query by date range | "what did I spend last week?" |
| Voice notes | Send a voice message — the model transcribes and acts on it |
| Photo receipts | Send a photo (with optional caption) — the model reads totals/items off it |

The agent reads the user's category list at the start of each turn, so it never asks "what categories do you have?" — it picks the closest match.

### Message flow

Every inbound WhatsApp message goes through this pipeline:

1. **Meta webhook** hits `POST /whatsapp` — the worker verifies the `X-Hub-Signature-256` HMAC header using `WHATSAPP_APP_SECRET`. Invalid signatures return `403`.
2. **Payload parsing** (`webhook.ts`) classifies the message as `text`, `audio`, `image`, `button_reply`, or `other`.
3. **Phone-number lookup** finds the linked `whatsapp_users` row. Unlinked or unverified numbers get a polite reply and the flow stops — no AI call is made.
4. **Content normalization** (`media.ts`):
   - Text → passed as a plain string.
   - Audio → downloaded from Meta, base64-encoded, wrapped as a LangChain `{ type: "audio", mimeType, data }` content block.
   - Image → same as audio with `type: "image"`, plus an optional `{ type: "text", text: caption }` block.
5. **Agent runs** (`services/agent.ts`) — the model can call read tools (executed inline) and may request write tools (`addExpense`, `deleteExpense`). Write tools throw a `PendingActionInterrupt` instead of mutating the DB.
6. **Reply path:**
   - If the agent produced text, the worker calls Meta's `/messages` endpoint to send it back.
   - If a write was requested, the worker stores the pending action in `whatsapp_pending_actions` (with a TTL) and sends an **interactive buttons** message — "Confirm" / "Cancel".
7. **Confirmation tap** comes back as another webhook (`type: "button_reply"`). `confirm.ts` loads the pending row, executes the DB write with the **service-role** Supabase client scoped to the linked user, then deletes the pending row.
8. The worker always responds `200 OK` to Meta — non-200 triggers retry storms.

### Number verification flow

When you save a phone number in Settings → WhatsApp:

1. The worker inserts a row into `whatsapp_users` as **pending** (`is_verified = false`).
2. A WhatsApp message is sent to that number with Confirm / Cancel buttons (button payload prefixed with `verify:`).
3. **Confirm** → `verify.ts` sets `is_verified = true` and the bot is active for that number.
4. **Cancel** → the row is deleted; the number can be re-added later.
5. If the user never receives the message (e.g. they hadn't opened a chat with the business number yet), they can re-trigger it via `POST /whatsapp/resend-verification` from the app.

Unverified numbers that message the bot receive a "pending verification" notice and are otherwise ignored.

### Confirmation TTL

Pending writes expire after `PENDING_ACTION_TTL_MS` (see `worker/src/constants/app.ts`). Tapping Confirm on an expired action returns "This action has expired. Please try again." — this prevents stale taps from inserting unintended rows hours or days later.

### Why two-phase writes?

The frontend chat uses the same pattern but executes writes from the browser via the user's Supabase session. WhatsApp has no browser, so the worker executes writes using a **service-role** client scoped by `user_id` — and the explicit Confirm tap is what authorizes that scoped write. The model never silently mutates data.

### Required secrets recap

| Secret | Where to get it |
|---|---|
| `WHATSAPP_VERIFY_TOKEN` | You invent it — must match Meta webhook config |
| `WHATSAPP_APP_SECRET` | Meta → App Settings → Basic → App Secret |
| `WHATSAPP_ACCESS_TOKEN` | Meta → WhatsApp → API Setup (use a **permanent** system-user token in prod) |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta → WhatsApp → API Setup |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |

## Worker Endpoints

| Endpoint | Protection | Purpose |
|---|---|---|
| `POST /chat` | Supabase JWT (Bearer token) | Main agent endpoint — used by the web app |
| `POST /whatsapp/link` | Supabase JWT (Bearer token) | Save & send verification to a phone number |
| `POST /whatsapp/resend-verification` | Supabase JWT (Bearer token) | Re-send a pending verification message |
| `GET /whatsapp` | Webhook verify token | Meta webhook subscription handshake |
| `POST /whatsapp` | Meta HMAC-SHA256 (`X-Hub-Signature-256`) | Inbound WhatsApp messages |

### `POST /chat` contract

Request:

```ts
{
  message: string;           // user text — can be empty if `attachments` has at least 1
  sessionId?: string;        // optional UUID — omit to start a new conversation
  analyticsMode?: boolean;   // optional — one-shot analytics reply, no persistence
  attachments?: Array<{
    url: string;             // publicly fetchable URL (Gemini fetches it server-side)
    contentType:             // MIME — drives backend routing
      | "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    name?: string;           // optional original filename
  }>;                        // max 4 per turn
}
```

At least one of `message` (non-empty after trim) or `attachments` (length ≥ 1) is required. Attachment URLs must be reachable by Gemini's servers — for Supabase Storage, either use a **public** bucket or sign a short-lived URL on the frontend before sending. Attachments are ignored in `analyticsMode`.

Response (chat mode):

```ts
{ message: string | null, pendingToolCalls: PendingAction[] | null, sessionId: string }
```

Response (analytics mode):

```ts
{ message: string | null, pendingToolCalls: null, sessionId: null }
```

Conversation history is persisted server-side in the `chat_message` table — the client only sends the new message each turn and echoes `sessionId` back to continue the same thread.

## Switching AI Provider

Change `AI_PROVIDER` in `worker/wrangler.jsonc` and redeploy — no code changes needed:

```toml
AI_PROVIDER = "gemini"   # or "openrouter"
```

## Deployment

### Frontend

Deploy to [Vercel](https://vercel.com) — set the environment variables in the project settings, then update `NEXT_PUBLIC_WORKER_URL` with the deployed worker URL.

### Worker

The worker auto-deploys to Cloudflare Workers via GitHub Actions on every push to `main` that changes files in `worker/`. To enable this, add a `CLOUDFLARE_API_TOKEN` secret to your GitHub repository (Settings → Secrets and variables → Actions).

To deploy manually:

```bash
npm run deploy:worker
```

## Useful Scripts

| Script | Description |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run worker` | Cloudflare Worker dev with tunnel |
| `npm run deploy:worker` | Deploy worker to Cloudflare |
| `npm run build` | Production build |
| `npm run types` | Regenerate Supabase TypeScript types |
