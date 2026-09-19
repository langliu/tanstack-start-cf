# Kite

A modern, high-performance full-stack media gallery and management system built with **TanStack Start**, **React 19**, **Drizzle ORM**, and **ORPC**.

---

## Features

### Public Showcase

- **Virtualized Masonry Grid**: Smooth, infinite-scrolling image waterfall powered by `masonic` with responsive column layouts.
- **Faceted Search & Filtering**: Multi-dimensional filtering by models, tags, agencies, and albums with real-time keyword search.
- **Flexible Sorting**: Sort by latest additions, popularity (top), or randomize exploration with reproducible seeds.
- **Albums & Collections**: Dedicated album browsing (`/albums`) and contextual album detail views (`/albums/$albumSlug`).
- **Interactive Lightbox & Dialogs**: Fast image inspection modal with dominant color placeholders, metadata badges, and deep links.

### Admin Management (`/admin`)

- **Media Library**: Comprehensive asset management powered by TanStack Table v9 with batch selection, pagination, status toggling, and quick editing.
- **Model Directory**: Manage model profiles, aliases, bios, and image associations.
- **Taxonomy & Tags**: Color-coded tag management with custom slugs and categorization.
- **Agencies & Albums**: Group assets into agencies and curated album collections.
- **Direct Object Storage (OSS)**: Secure asset management with presigned V4 URL uploads and storage integration.

---

## Tech Stack

| Category             | Technology                                                                                                                               |
| :------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**        | [TanStack Start](https://tanstack.com/start) (Full-stack React 19 SSR, React Compiler)                                                   |
| **Routing**          | [TanStack Router](https://tanstack.com/router) (Type-safe file-based routing)                                                            |
| **Data Fetching**    | [TanStack Query v5](https://tanstack.com/query) & `@orpc/tanstack-query`                                                                 |
| **API & RPC**        | [oRPC](https://orpc.unnoq.com/) (End-to-end type-safe RPC, OpenAPI & JSON-Schema)                                                        |
| **Database & ORM**   | [Neon](https://neon.tech/) (Serverless PostgreSQL) + [Drizzle ORM](https://orm.drizzle.team/)                                            |
| **Authentication**   | [Better Auth](https://www.better-auth.com/) (Drizzle adapter, session management)                                                        |
| **Styling & UI**     | [Tailwind CSS v4](https://tailwindcss.com/), [Base UI](https://base-ui.com/), [Lucide React](https://lucide.dev/)                        |
| **Tooling & Linter** | [Biome](https://biomejs.dev/), [Vite 8](https://vite.dev/), [Vitest](https://vitest.dev/), [TypeScript](https://www.typescriptlang.org/) |

---

## Project Structure

```text
src/
├── components/          # Reusable UI components (Base UI, layout, gallery masonry)
│   ├── admin/           # Admin dashboard tables, forms, and dialogs
│   ├── public/          # Public-facing gallery components
│   └── ui/              # Base UI design primitives
├── db/                  # Database configuration & schemas
│   ├── auth-schema.ts   # Better Auth tables (user, session, account, verification)
│   ├── index.ts         # Neon serverless client & Drizzle connection
│   └── schema.ts        # Business schemas (images, models, tags, albums, agencies)
├── lib/                 # Utility functions, auth client, query client setup
├── orpc/                # End-to-end type-safe RPC routes & contracts
│   ├── client.ts        # Client-side oRPC caller integrated with TanStack Query
│   └── router/          # Backend procedures (public gallery, admin CRUD)
├── routes/              # TanStack Router file-based routes
│   ├── __root.tsx       # Root layout & providers
│   ├── index.tsx        # Landing page
│   ├── images.tsx       # Public image waterfall
│   ├── albums/          # Album directory & album slug pages
│   ├── admin/           # Admin dashboard routes (library, models, tags, etc.)
│   └── api/             # Auth endpoints and oRPC server handlers
└── server/              # Server-only utilities (Aliyun OSS presigned URLs, auth)
```

---

## Getting Started

### Prerequisites

- **Node.js**: `24.x` (or `>= 22.12.0`)
- **Package Manager**: `pnpm` `12.x`

### 1. Installation

```bash
pnpm install
```

### 2. Environment Variables

Create a `.env.local` file in the project root:

```ini
# Database
DATABASE_URL="postgresql://user:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require"

# Authentication
BETTER_AUTH_SECRET="your-secure-random-secret"
BETTER_AUTH_URL="http://localhost:3000"

# Aliyun OSS (Object Storage)
OSS_ACCESS_KEY_ID="your-access-key-id"
OSS_ACCESS_KEY_SECRET="your-access-key-secret"
OSS_BUCKET="your-bucket-name"
OSS_ENDPOINT="oss-cn-hangzhou.aliyuncs.com"
OSS_REGION="oss-cn-hangzhou"
```

> **Tip**: Generate a secure auth secret via:
>
> ```bash
> pnpm dlx @better-auth/cli secret
> ```

### 3. Database Migration

Push or migrate schemas to your PostgreSQL database:

```bash
# Push schema directly to database
pnpm db:push

# Or generate and run migrations
pnpm db:generate
pnpm db:migrate

# Open Drizzle Studio to inspect data
pnpm db:studio
```

### 4. Development Server

Start the local Vite development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Command                  | Description                                            |
| :----------------------- | :----------------------------------------------------- |
| `pnpm dev`               | Start development server on port 3000                  |
| `pnpm build`             | Build the full-stack application for production        |
| `pnpm preview`           | Preview production build locally                       |
| `pnpm test`              | Run test suite with Vitest                             |
| `pnpm lint`              | Lint code with Biome                                   |
| `pnpm format`            | Format code with Biome                                 |
| `pnpm check`             | Run Biome lint, format, and import organization checks |
| `pnpm db:push`           | Push Drizzle schema changes directly to the database   |
| `pnpm db:migrate`        | Run pending Drizzle migrations                         |
| `pnpm db:generate`       | Generate migration SQL files from schema               |
| `pnpm db:studio`         | Launch Drizzle Studio Web UI                           |
| `pnpm deploy:staging`    | Build and deploy staging release to Vercel             |
| `pnpm deploy:production` | Build and deploy production release to Vercel          |

---

## Deployment

The project is configured for deployment to **Vercel** or **Cloudflare Workers**:

- **Vercel**: Deployments are automated via `pnpm deploy:production` or connected Git integrations.
- Ensure all required environment variables (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `OSS_*`) are configured in your hosting platform dashboard.

---

## License

Private repository. All rights reserved.
