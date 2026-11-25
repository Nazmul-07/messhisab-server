# MessHisab API Documentation

Base URL: `http://localhost:5000`  
API Prefix: `/api/v1`

## Response Format

Success:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

Error:
```json
{
  "success": false,
  "message": "Error summary",
  "errors": [{ "field": "amountPaisa", "message": "Amount must be greater than 0" }]
}
```

## Authentication (Better Auth)

- `POST /api/auth/sign-up/email` — Register (`{ name, email, password }`)
- `POST /api/auth/sign-in/email` — Login (`{ email, password }`)
- `POST /api/auth/sign-out` — Logout
- `GET /api/auth/get-session` — Raw Better Auth session
- `GET /api/v1/auth/me` — Current user + active mess memberships (requires session cookie)

## Messes

- `POST /api/v1/messes` — Create mess (creator becomes `ADMIN`)
- `GET /api/v1/messes` — List messes where user is `ACTIVE`
- `GET /api/v1/messes/:messId` — Get mess details (`ADMIN`, `MEMBER`)
- `PATCH /api/v1/messes/:messId` — Update mess (`ADMIN`)

## Members

- `GET /api/v1/messes/:messId/members?status=ACTIVE` — List members (`ADMIN`, `MEMBER`)
- `GET /api/v1/messes/:messId/members/:memberId` — Get member (`ADMIN`, `MEMBER`)
- `PATCH /api/v1/messes/:messId/members/:memberId` — Update member (`ADMIN`)
- `DELETE /api/v1/messes/:messId/members/:memberId` — Soft-remove member (`ADMIN`)

## Invitations

- `POST /api/v1/messes/:messId/invites` — Create email invite (`ADMIN`)
- `GET /api/v1/messes/:messId/invites` — List invites (`ADMIN`)
- `POST /api/v1/messes/:messId/invites/accept` — Accept invite (`{ token, displayName?, phone? }`)
- `PATCH /api/v1/messes/:messId/invites/:inviteId/revoke` — Revoke pending invite (`ADMIN`)

## Bazar

- `POST /api/v1/messes/:messId/bazar` — Create bazar entry (`ADMIN`)
- `GET /api/v1/messes/:messId/bazar?monthKey=YYYY-MM` — List bazar entries (`ADMIN`, `MEMBER`)
- `GET /api/v1/messes/:messId/bazar/:id` — Get bazar entry (`ADMIN`, `MEMBER`)
- `PATCH /api/v1/messes/:messId/bazar/:id` — Update bazar entry (`ADMIN`)
- `DELETE /api/v1/messes/:messId/bazar/:id` — Soft-delete bazar entry (`ADMIN`)

## Meals

- `POST /api/v1/messes/:messId/meals` — Create meal record (`ADMIN`)
- `POST /api/v1/messes/:messId/meals/bulk` — Bulk create meal records for a date (`ADMIN`)
- `GET /api/v1/messes/:messId/meals?monthKey=YYYY-MM&date=YYYY-MM-DD&membershipId=...` — List meals (`ADMIN`, `MEMBER`)
- `GET /api/v1/messes/:messId/meals/:id` — Get meal record (`ADMIN`, `MEMBER`)
- `PATCH /api/v1/messes/:messId/meals/:id` — Update meal record (`ADMIN`)
- `DELETE /api/v1/messes/:messId/meals/:id` — Delete meal record (`ADMIN`)

## Deposits

- `POST /api/v1/messes/:messId/deposits` — Record member deposit (`ADMIN`)
- `GET /api/v1/messes/:messId/deposits?monthKey=YYYY-MM&membershipId=...` — List deposits (`ADMIN`, `MEMBER`)
- `PATCH /api/v1/messes/:messId/deposits/:id` — Update deposit (`ADMIN`)
- `DELETE /api/v1/messes/:messId/deposits/:id` — Soft-delete deposit (`ADMIN`)

## Expenses

- `POST /api/v1/messes/:messId/expenses` — Create shared expense (`ADMIN`)
- `GET /api/v1/messes/:messId/expenses?monthKey=YYYY-MM` — List expenses (`ADMIN`, `MEMBER`)
- `GET /api/v1/messes/:messId/expenses/:id` — Get expense (`ADMIN`, `MEMBER`)
- `PATCH /api/v1/messes/:messId/expenses/:id` — Update expense (`ADMIN`)
- `DELETE /api/v1/messes/:messId/expenses/:id` — Soft-delete expense (`ADMIN`)

## Settlement

- `GET /api/v1/messes/:messId/settlements/preview?monthKey=YYYY-MM` — Preview live monthly settlement (`ADMIN`, `MEMBER`)
- `POST /api/v1/messes/:messId/settlements/close` — Close month and persist snapshots (`ADMIN`, `{ monthKey }`)
- `GET /api/v1/messes/:messId/settlements/:monthKey` — Get closed settlement or live preview (`ADMIN`, `MEMBER`)
- `GET /api/v1/messes/:messId/settlements/:monthKey/members/:memberId` — Get member settlement (`ADMIN`, `MEMBER`)

## Dashboard & Reports

- `GET /api/v1/messes/:messId/dashboard/summary?monthKey=YYYY-MM` — Mess + personal summary (`ADMIN`, `MEMBER`)
- `GET /api/v1/messes/:messId/reports/monthly?monthKey=YYYY-MM` — Full monthly report (`ADMIN`, `MEMBER`)
- `GET /api/v1/messes/:messId/reports/members/:memberId?monthKey=YYYY-MM` — Member statement + itemized records (`ADMIN`, `MEMBER`)
- `GET /api/v1/messes/:messId/reports/transactions?monthKey=YYYY-MM` — Chronological ledger (`ADMIN`, `MEMBER`)
