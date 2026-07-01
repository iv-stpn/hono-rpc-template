# Hono RPC Demo — Auth + Todos

An end-to-end-typed full-stack application: a Hono API on Cloudflare Workers + D1 with rate limiting via Durable Objects, a Vite + React Router frontend with internationalization (i18n), and shared validation schemas. The frontend calls the API through Hono's RPC client (`hc`), so route inputs and responses are fully typed across the network boundary with no codegen.

The two apps run on separate origins (web on `:5173`, API on `:8787`) and talk cross-origin with credentialed CORS. The frontend gets its types from the backend's emitted declaration files: `apps/api` runs `build:types` to emit `dist/*.d.ts`, which `@app/api` exposes so the web app's `hc<AppType>` stays in sync without importing backend source.

## Key Features

- **End-to-end type safety** with Hono RPC client
- **Rate limiting** using Cloudflare Durable Objects
- **Internationalization (i18n)** with i18next (English/French)
- **Modern UI** with Radix UI components and Tailwind CSS
- **State management** with Zustand for themes and query caching
- **Snowflake IDs** for distributed ID generation
- **Session-based auth** with secure cookie handling

## Layout

```
.
├── apps/
│   ├── api/          # Hono worker on Cloudflare Workers + D1
│   │   ├── src/
│   │   │   ├── index.ts                    # app entry; mounts routes, exports AppType
│   │   │   ├── routes/                     # auth + todos route definitions
│   │   │   ├── middleware/                 # rate limiter middleware
│   │   │   ├── durable-objects/            # Durable Object implementations
│   │   │   │   └── rate-limiter.ts         # rate limiting DO
│   │   │   ├── auth.ts                     # session middleware + cookie helpers
│   │   │   ├── crypto.ts                   # Argon2id hashing + token helpers
│   │   │   ├── snowflake.ts                # distributed ID generation
│   │   │   └── types.ts                    # API type definitions
│   │   ├── migrations/                     # D1 SQL migrations
│   │   ├── tsconfig.build.json             # emits dist/*.d.ts for the frontend
│   │   └── wrangler.toml                   # Cloudflare config (D1 + DO bindings)
│   └── web/          # Vite + React Router SPA
│       └── src/
│           ├── api.ts                      # hc<AppType> client pointed at VITE_API_URL
│           ├── auth.tsx                    # auth context (login/register/logout/me)
│           ├── router.tsx                  # routes + auth gates
│           ├── routes/                     # login, register, todos pages
│           ├── components/
│           │   ├── Controls.tsx            # language/theme switcher
│           │   └── ui/                     # Radix UI components (button, card, dropdown, etc.)
│           ├── store/
│           │   ├── themeStore.ts           # Zustand theme state
│           │   └── queryStore.ts           # client-side query cache
│           ├── hooks/
│           │   └── useQuery.ts             # custom query hook with cache
│           ├── i18n/                       # internationalization
│           │   ├── index.ts                # i18next setup
│           │   └── locales/                # en.ts, fr.ts translations
│           └── lib/
│               └── utils.ts                # UI utilities (cn, etc.)
└── packages/
    ├── schemas/      # Zod validation schemas (shared)
    └── utils/        # shared domain types + utilities
```

The type-safety chain: `apps/api` exports `AppType` from its entry → `bun run
build:types` emits `apps/api/dist/*.d.ts` → `apps/web/src/api.ts` imports that
type via `@app/api` and wraps it in `hc<AppType>`, giving typed calls like
`api.api.todos.$post({ json: { title } })`. Only declaration files cross the
boundary — no worker source is bundled into the frontend. Shared validation schemas live in `@app/schemas`, and shared utilities in `@app/utils`.

## Prerequisites

- [Bun](https://bun.sh) (used as the package manager + workspace runner)
- A Cloudflare account + `wrangler` (bundled as a dev dependency) for D1 and Durable Objects
- Node.js 18+ (for compatibility with certain dependencies)

## Setup

```bash
bun install
```

### Create the D1 database

```bash
cd apps/api
bunx wrangler d1 create hono_rpc_db
```

Copy the printed `database_id` into [apps/api/wrangler.toml](apps/api/wrangler.toml),
replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`. Then apply migrations to the local
dev database:

```bash
# from the repo root
bun run db:migrate:local
```

### Configure the API URL (optional in dev)

The web app reads `VITE_API_URL` to find the worker (defaults to
`http://localhost:8787`). To override it, copy the example file:

```bash
cp apps/web/.env.example apps/web/.env
```

The worker reads `WEB_ORIGIN` to set the allowed CORS origin (defaults to
`http://localhost:5173`); override it in [apps/api/wrangler.toml](apps/api/wrangler.toml).

## Tech Stack

### Backend (`apps/api`)
- **Hono** — fast, lightweight web framework for Cloudflare Workers
- **Cloudflare D1** — SQLite database at the edge
- **Cloudflare Durable Objects** — distributed rate limiting
- **Zod** — runtime schema validation
- **Argon2id** (via [argon2-wasm-edge](https://github.com/ComicScrip/hash-wasm-edge)) — memory-hard password hashing in WebAssembly

### Frontend (`apps/web`)
- **React 18** — UI framework
- **React Router 6** — client-side routing
- **Vite** — build tool and dev server
- **Tailwind CSS 4** — utility-first CSS framework
- **Radix UI** — accessible component primitives
- **i18next** — internationalization framework
- **Zustand** — lightweight state management
- **Lucide React** — icon library
- **Sonner** — toast notifications

### Shared Packages
- **@app/schemas** — Zod validation schemas
- **@app/utils** — shared domain types and utilities

## Develop

Run both apps together from the repo root:

```bash
bun run dev
```

- API (worker): http://localhost:8787
- Web (Vite): http://localhost:5173

The two apps run on separate origins. The worker allows credentialed CORS from
`WEB_ORIGIN`, and the `SameSite=None; Secure` session cookie is sent on
cross-origin requests (`localhost` counts as a secure context, so this works
over HTTP in dev). Open the web app, create an account, and add some todos.

Run them individually if you prefer:

```bash
bun run dev:api
bun run dev:web
```

## Typecheck & build

```bash
bun run typecheck     # emits backend types, then checks web + utils
bun run build         # emits backend types, then builds the web app
```

`typecheck` and `build` both run the backend's `build:types` first, since the
web app's `AppType` import resolves to `apps/api/dist/*.d.ts`.

## Deploy

Apply migrations to the remote D1 database and deploy the worker:

```bash
bun run db:migrate
cd apps/api && bunx wrangler deploy
```

Set `WEB_ORIGIN` (in [apps/api/wrangler.toml](apps/api/wrangler.toml)) to your
deployed web origin so CORS reflects it, and set `VITE_API_URL` to the deployed
worker URL when building the web app.

## API surface

| Method | Path                 | Auth | Body                          | Returns                |
| ------ | -------------------- | ---- | ----------------------------- | ---------------------- |
| POST   | `/api/auth/register` | —    | `{ email, password }`         | `{ user }`             |
| POST   | `/api/auth/login`    | —    | `{ email, password }`         | `{ user }`             |
| POST   | `/api/auth/logout`   | —    | —                             | `{ ok }`               |
| GET    | `/api/auth/me`       | ✓    | —                             | `{ user }`             |
| GET    | `/api/todos`         | ✓    | —                             | `{ todos }`            |
| POST   | `/api/todos`         | ✓    | `{ title }`                   | `{ todo }`             |
| PATCH  | `/api/todos/:id`     | ✓    | `{ title?, done? }`           | `{ todo }`             |
| DELETE | `/api/todos/:id`     | ✓    | —                             | `{ ok }`               |

## Notes & limitations

This is a demo showcasing modern full-stack patterns. Some areas intentionally simplified:

- **Auth**: Passwords are hashed with Argon2id (memory-hard KDF) via the `argon2-wasm-edge` WebAssembly library, which runs in the Cloudflare Workers runtime. Hashes are stored as self-describing `$argon2id$...` encoded strings.
- **Sessions**: Opaque tokens stored in D1, carried in an `httpOnly`, `secure`, `SameSite=None` cookie. Expired sessions are cleaned up lazily on lookup.
- **Rate limiting**: Implemented with Cloudflare Durable Objects for distributed, per-IP rate limiting. Production systems may need more sophisticated strategies (user-based, tiered limits, etc.).
- **IDs**: Uses Snowflake IDs for distributed, time-ordered ID generation. Suitable for production use but requires proper epoch configuration.
- **Cross-origin cookies**: `SameSite=None` is required because the web app and API are on different origins, and it forces `secure: true`. Browsers treat `localhost` as a secure context, so the cross-origin cookie flow works in dev over plain HTTP; in production both origins must be HTTPS.
- **i18n**: English and French translations included as examples. Production apps would need more comprehensive translation coverage and RTL support for certain languages.
- **UI components**: Radix UI components provide accessibility but may need additional ARIA attributes and keyboard navigation testing for production.
- **Missing features**: No email verification, password reset, 2FA, comprehensive audit logging, or advanced monitoring.
