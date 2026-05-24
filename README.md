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
│       └── deploy-worker.yml   # CI/CD: auto-deploy worker on push to main
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── agent/          # AI chat interface
│   │   │   ├── expenses/       # Expense management
│   │   │   ├── loans/          # Loan management
│   │   │   └── settings/       # User settings (incl. WhatsApp linking)
│   │   └── login/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── providers/
│   └── types/
└── worker/                     # Cloudflare Worker (AI backend)
    └── src/
        ├── index.ts            # Worker entry point + /chat + /whatsapp/link routes
        ├── whatsapp-handler.ts # WhatsApp webhook handlers
        ├── whatsapp.ts         # Meta WhatsApp Cloud API helpers + signature verification
        ├── tools.ts            # AI tool definitions
        ├── constants.ts        # Shared constants and magic values
        ├── types.ts            # Shared TypeScript types
        └── utils.ts            # Shared utilities
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

Update `worker/wrangler.toml` vars:

```toml
[vars]
SUPABASE_URL = "your_supabase_project_url"
SUPABASE_ANON_KEY = "your_supabase_anon_key"
ALLOWED_ORIGIN = "https://your-frontend-domain.com"
AI_PROVIDER = "openrouter"   # "openrouter" | "gemini"
```

Set secrets once via Wrangler (only set what you need based on `AI_PROVIDER`):

```bash
# AI provider — set one depending on AI_PROVIDER value
npx wrangler secret put OPENROUTER_API_KEY --config worker/wrangler.toml
npx wrangler secret put GEMINI_API_KEY --config worker/wrangler.toml

# Supabase
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config worker/wrangler.toml

# WhatsApp (optional — only needed if using the WhatsApp bot)
npx wrangler secret put WHATSAPP_VERIFY_TOKEN --config worker/wrangler.toml
npx wrangler secret put WHATSAPP_ACCESS_TOKEN --config worker/wrangler.toml
npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID --config worker/wrangler.toml
npx wrangler secret put WHATSAPP_APP_SECRET --config worker/wrangler.toml
```

### 4. Run the development servers

```bash
# Next.js frontend
npm run dev

# Cloudflare Worker (with tunnel)
npm run worker
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## WhatsApp Setup

1. Create a Meta Developer app and enable WhatsApp Cloud API
2. Add a WhatsApp phone number in the app settings
3. Set the webhook URL to `https://your-worker.workers.dev/whatsapp`
4. Set the verify token to the same value as `WHATSAPP_VERIFY_TOKEN`
5. Get your **App Secret** from Meta Developer Console → App Settings → Basic → Show
6. Link your WhatsApp number in the app under **Settings → WhatsApp** — a verification message will be sent to that number
7. Tap **Confirm** in WhatsApp to verify and activate the bot
8. Send text, voice, or image messages to start tracking expenses

### WhatsApp number verification flow

When you save a phone number in Settings:
1. The worker inserts the number as **pending** (`is_verified = false`)
2. A WhatsApp message is sent to the number with Confirm / Cancel buttons
3. Tapping **Confirm** sets `is_verified = true` and activates the bot
4. Tapping **Cancel** removes the number

Unverified numbers receive a "pending verification" message and cannot use the bot.

## Security

| Endpoint | Protection |
|---|---|
| `POST /chat` | Supabase JWT (Bearer token) |
| `POST /whatsapp/link` | Supabase JWT (Bearer token) |
| `GET /whatsapp` | Webhook verify token |
| `POST /whatsapp` | Meta HMAC-SHA256 signature (`X-Hub-Signature-256`) |

## Switching AI Provider

Change `AI_PROVIDER` in `worker/wrangler.toml` and redeploy — no code changes needed:

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
