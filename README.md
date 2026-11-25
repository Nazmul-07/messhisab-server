# MessHisab Backend

Production-oriented, multi-tenant Mess and Room Expense Management SaaS REST API tailored for Bangladesh (`BDT`, `Asia/Dhaka`).

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js + TypeScript (Strict Mode)
- **Database:** MongoDB (Replica Set required for transactions)
- **ORM:** Prisma ORM v6 (`prisma-client` generator)
- **Authentication:** Better Auth (`@better-auth/prisma-adapter`)
- **Validation:** Zod v4
- **Logging & Security:** Pino, Helmet, CORS, Cookie Parser

## Project Structure

```text
messhisab-server/
├── docs/
│   └── API.md
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/          # env validation, Prisma singleton
│   ├── lib/             # Better Auth instance, Pino logger
│   ├── middlewares/     # auth, role/tenant guard, Zod validate, error & 404
│   ├── modules/         # auth, mess, member, invitation, bazar, meal, deposit, expense, settlement, dashboard, report
│   ├── routes/          # /api/v1 router
│   ├── shared/          # AppError, catchAsync, sendResponse, dateUtils, financeUtils, tenantUtils
│   └── types/           # Express Request augmentation & shared types
├── tests/
│   ├── dateUtils.test.ts
│   ├── financeUtils.test.ts
│   └── api.integration.test.ts
├── .env.example
├── .prettierrc
├── package.json
└── tsconfig.json
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Example |
| --- | --- | --- |
| `NODE_ENV` | Environment (`development`, `test`, `production`) | `development` |
| `PORT` | HTTP server port | `5000` |
| `DATABASE_URL` | MongoDB connection string (replica set required) | `mongodb://localhost:27017/messhisab?replicaSet=rs0` |
| `BETTER_AUTH_SECRET` | Secret key (minimum 32 characters) | `your-32-char-secret` |
| `BETTER_AUTH_URL` | Public base URL of this backend | `http://localhost:5000` |
| `CLIENT_URL` | Allowed frontend origin for CORS & cookies | `http://localhost:3000` |

## Installation & Database Setup

```bash
npm install
npm run db:generate
npm run db:push
```

> **Note:** MongoDB transactions (`prisma.$transaction`) require MongoDB to run as a replica set (e.g., MongoDB Atlas or local `mongod --replSet rs0`).

## Scripts

- `npm run dev` — Start development server with `tsx watch`
- `npm run build` — Generate Prisma Client and compile TypeScript to `dist/`
- `npm start` — Run compiled production server (`node dist/server.js`)
- `npm run typecheck` — Run strict TypeScript typechecking
- `npm run format` — Format code with Prettier
- `npm run db:generate` — Generate Prisma Client
- `npm run db:push` — Push Prisma schema to MongoDB
- `npm run db:studio` — Open Prisma Studio
- `npm test` — Run unit and integration tests

## Authentication & Multi-Tenant Security

- Better Auth is mounted at `/api/auth/*` (email & password registration, login, logout, HTTP-only session cookies).
- `GET /api/v1/auth/me` returns the authenticated user and their active mess memberships.
- Roles (`ADMIN`, `MEMBER`) are **mess-specific** via `Membership`.
- Every mess-scoped route enforces:
  1. Valid Better Auth session (`requireAuth`)
  2. Active `Membership` in `:messId` (`requireMessRole`)
  3. Role authorization (`ADMIN` required for all writes; `MEMBER` has read-only access)
  4. Service-level tenant ownership checks on every referenced `membershipId` and entity ID.

## Financial Calculation Rules

- **Integer Paisa:** All monetary amounts are stored and calculated in integer paisa (`৳100 = 10000`). No floating-point arithmetic is used.
- **Meal Half-Units:** Meals are stored in `mealHalfUnits` (`1 = 0.5 meal`, `2 = 1 meal`, `4 = 2 meals`).
- **Meal Rate:** `Total Bazar / Total Meals` (0 when total meals = 0). Member meal costs use largest-remainder integer allocation so `sum(memberMealCost) === totalBazarPaisa`.
- **Other Expenses:**
  - `EQUAL`: Snapshot shares created at write time for eligible members in that month.
  - `CUSTOM`: Admin-provided shares whose sum must exactly equal `amountPaisa`.
  - `MEAL_BASED`: Dynamically computed from meal ratios during preview and materialized on month close.
- **Net Balance:** `Total Cost (Meal + Other Expense Shares) - Total Credit (Deposits + Member-Paid Bazar + Member-Paid Expenses)`. Positive = member owes money; negative = member receives money.
- **Closed Months:** Closing a month (`POST /api/v1/messes/:messId/settlements/close`) persists `MessMonth` and `MemberSettlement` snapshots in a MongoDB transaction and blocks subsequent edits to that month (`409 Conflict`).

See [docs/API.md](./docs/API.md) for full endpoint documentation.
