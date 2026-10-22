# Purplexity

An AI answer engine: ask a question, it searches the web, and an LLM streams back an answer with its sources and suggested follow-up questions. Conversations are saved so you can pick them up and keep asking follow-ups.

- **Frontend** (`frontend/`): React 19, React Router, Tailwind CSS v4, served and bundled by Bun.
- **Backend** (`backend/`): Express 5 on Bun, Prisma with PostgreSQL.
- **Services**: [Supabase](https://supabase.com) for Google/GitHub sign-in and Postgres, [Tavily](https://tavily.com) for web search, [OpenRouter](https://openrouter.ai) for the LLM.

## How it works

1. The user signs in with Google or GitHub through Supabase Auth.
2. A question goes to `POST /purplexity_ask`. The backend verifies the Supabase token, searches the web with Tavily, and streams the model's answer back as plain text, followed by a sources block.
3. The conversation is saved to Postgres, and follow-ups (`POST /purplexity_ask/follow_up`) are answered with the earlier turns as context.

## Prerequisites

- [Bun](https://bun.com) 1.3.11 or newer
- A Supabase project (its Postgres database and Auth are both used)
- A Tavily API key and an OpenRouter API key

## Setup

### 1. Install

```bash
cd backend && bun install
cd ../frontend && bun install
```

Installing the backend also generates the Prisma client (`backend/prisma/generated`).

### 2. Configure Supabase Auth

In the Supabase dashboard:

1. **Authentication > Providers**: enable **Google** and **GitHub** and enter each provider's OAuth client ID and secret. When creating those OAuth apps, use the callback URL Supabase shows there (`https://<project-ref>.supabase.co/auth/v1/callback`).
2. **Authentication > URL Configuration**: add `http://localhost:3000` (and your production URL) to **Redirect URLs**.

### 3. Environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

| File | Variable | Description |
| --- | --- | --- |
| `backend/.env` | `DATABASE_URL` | Postgres connection string (Supabase: Project Settings > Database) |
| | `TAVILY_API_KEY` | Tavily API key |
| | `AI_API_KEY` | OpenRouter API key |
| | `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| | `SUPABASE_SECRET_KEY` | Supabase secret key, used to verify users' tokens |
| | `PORT` | Optional, defaults to `3001` |
| | `AI_MODEL` | Optional OpenRouter model id, defaults to `nvidia/nemotron-3-super-120b-a12b:free` |
| | `CORS_ORIGIN` | Optional comma-separated list of allowed origins; any origin is allowed when unset |
| `frontend/.env` | `BUN_PUBLIC_SUPABASE_URL` | Same as `SUPABASE_URL` |
| | `BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (public) key |
| | `BUN_PUBLIC_BACKEND_URL` | Optional, defaults to `http://localhost:3001` |

`BUN_PUBLIC_*` values are inlined into the browser bundle, so never put a secret in `frontend/.env`.

### 4. Create the database tables

```bash
cd backend
bun run db:migrate
```

### 5. Run

In two terminals:

```bash
cd backend && bun run dev     # http://localhost:3001
```

```bash
cd frontend && bun run dev    # http://localhost:3000
```

Open http://localhost:3000 and sign in.

## Scripts

| Package | Script | What it does |
| --- | --- | --- |
| backend | `bun run dev` | Start the API with file watching |
| | `bun run start` | Start the API |
| | `bun run typecheck` | Type-check with `tsc` |
| | `bun run db:migrate` | Apply Prisma migrations to `DATABASE_URL` |
| | `bun run db:generate` | Regenerate the Prisma client after editing `schema.prisma` |
| frontend | `bun run dev` | Dev server with hot reload |
| | `bun run build` | Production build into `frontend/dist` |
| | `bun run start` | Serve the app in production mode |
| | `bun run typecheck` | Type-check with `tsc` |

## Deploying

- Set `BUN_PUBLIC_BACKEND_URL` to the deployed API URL before building the frontend, since it is inlined at build time.
- Set `CORS_ORIGIN` on the backend to the frontend's URL.
- Add the frontend's URL to Supabase's Redirect URLs.

## Project structure

```
backend/
  index.ts          API routes and answer streaming
  middleware.ts     Verifies the Supabase token and syncs the user row
  prompt.ts         System prompt and prompt template
  prisma/           Schema and migrations
frontend/
  src/pages/        Auth, Home (new search) and Conversation pages
  src/components/   Answer renderer, sidebar, source cards, etc.
  src/lib/          Supabase client, config and stream parsing
```

## License

[MIT](LICENSE)
