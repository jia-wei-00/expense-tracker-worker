# Expense Tracker AI Worker

A full-stack expense tracking application with an AI-powered chat agent. Built with Next.js and a Cloudflare Worker backend for AI inference.

> This is the AI Worker version. For the original app without the AI worker, see [expense-tracker](https://github.com/jia-wei-00/expense-tracker).

## Features

- **Expense & Income Tracking** — log transactions with categories and dates
- **Loan Management** — track money lent or borrowed
- **AI Agent** — chat with an AI that can read your expenses and add new ones on your behalf
- **Financial Analytics** — AI-generated spending insights and tips
- **Charts & Visualizations** — spending breakdowns via Recharts
- **Dark / Light Theme** — via next-themes
- **Auth** — Supabase SSR authentication

## Tech Stack

| Layer          | Technology                           |
| -------------- | ------------------------------------ |
| Frontend       | Next.js 16, React 19, TypeScript     |
| Styling        | Tailwind CSS v4, shadcn/ui, Radix UI |
| State / Data   | TanStack Query, React Hook Form, Zod |
| Backend / Auth | Supabase (Postgres + Auth)           |
| AI Worker      | Cloudflare Workers, OpenRouter API   |
| Analytics      | Vercel Analytics                     |

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── agent/        # AI chat interface
│   │   │   ├── expenses/     # Expense management
│   │   │   ├── loans/        # Loan management
│   │   │   └── settings/     # User settings
│   │   └── login/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── providers/
│   └── types/
└── worker/                   # Cloudflare Worker (AI backend)
    └── src/
        ├── index.ts          # Worker entry point + /chat route
        ├── tools.ts          # AI tool definitions
        ├── write-tools.ts    # Tools that require user confirmation
        └── utils.ts
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [OpenRouter](https://openrouter.ai) API key
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) for the Cloudflare Worker

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Set this after deploying the Cloudflare Worker
NEXT_PUBLIC_WORKER_URL=https://your-worker.workers.dev
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run the AI Worker locally

```bash
npm run worker
```

This starts the Cloudflare Worker locally with a tunnel via Wrangler.

The worker requires these secrets — set them with `wrangler secret put`:

```bash
wrangler secret put OPENROUTER_API_KEY --config worker/wrangler.toml
```

And update `worker/wrangler.toml` vars:

```toml
[vars]
SUPABASE_URL = "your_supabase_project_url"
SUPABASE_ANON_KEY = "your_supabase_anon_key"
ALLOWED_ORIGIN = "https://your-frontend-domain.com"
```

## Deployment

- **Frontend**: Deploy to [Vercel](https://expense-tracker-worker.vercel.app/) — set the environment variables in the project settings.
- **Worker**: Deploy to Cloudflare Workers via `npx wrangler deploy --config worker/wrangler.toml`, then update `NEXT_PUBLIC_WORKER_URL` in Vercel with the deployed worker URL.
