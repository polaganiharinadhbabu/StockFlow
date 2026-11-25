# StockFlow: Simple Inventory Management

A multi-tenant inventory MVP. Each owner signs up with an organization and only sees that organization's data.

| Part | Technology |
|---|---|
| Frontend | Next.js 14 + React (JavaScript, plain CSS) |
| Backend | Node.js + Express |
| Database | PostgreSQL, accessed with the Prisma ORM |
| Login | Email and password (bcrypt) with JWT tokens |

## Run it locally (Windows PowerShell)
You need Node.js 18+ and either Docker (for PostgreSQL) or your own reachable PostgreSQL server. From the repository root:
```powershell
Set-Location .\StockFlow
docker compose up -d                      # starts local PostgreSQL (skip if using your own)
Set-Location .\backend
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Configure DATABASE_URL and a random 32+ character JWT_SECRET in backend\.env
npm install
npm run db:push                           # uses this project's pinned Prisma CLI
npm run dev                               # API on http://localhost:4000
```
In a second terminal:
```powershell
Set-Location .\StockFlow\frontend
npm install
npm run dev                               # website on http://localhost:3000
```

Run package commands from the corresponding `backend` or `frontend` folder, not the repository root. Running `npm` or `npx prisma` from the wrong folder can fail to find the project or download a different Prisma version. If `db:push` reports `P1001`, check that the PostgreSQL server named in `backend\.env` is running and reachable.

### Supabase connection errors
If your Supabase direct database hostname resolves to IPv6 but your network cannot connect over IPv6, use the **Session pooler** connection string from your Supabase dashboard's **Connect** dialog. Supabase recommends session mode for persistent backends on IPv4-only networks. Copy the full connection string provided by Supabase into `DATABASE_URL` in `backend\.env`; do not construct the pooler hostname or username yourself. Keep the database password private and percent-encode reserved characters in it. See [Supabase's connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Code map
- `backend/prisma/schema.prisma`: the tables (Organization, User, Product)
- `backend/src/index.js`: input rules, helpers, routes (read top to bottom)
- `backend/tests/smoke.test.js`: automated checks (start the API, then `npm test`)
- `frontend/app/`: pages (login, signup, dashboard, products, settings); `components/`: shared pieces; `lib/api.js`: calls to the backend

## Requirements coverage
| Requirement | Where |
|---|---|
| FR-1 signup (email, password, confirm, organization) and login | `/api/auth/*`, `AuthForm.jsx` |
| FR-2 one organization per owner, all data scoped to it | `orgId` in every query, `myProduct()` |
| FR-3 product fields, SKU unique per organization | `schema.prisma` (`@@unique([orgId, sku])`) |
| FR-4 create, list with search, edit, delete with confirm | `/api/products`, `products/page.jsx` |
| FR-5 edit quantity or adjust +/- with a note, last updated by | `/adjust` route, "Adjust stock" dialog |
| FR-6 dashboard: product count, units, low-stock table | `/api/dashboard`, `dashboard/page.jsx` |
| FR-7 default threshold; a product's own value wins, including 0 | `/api/settings`, `show()` |

## Test
```powershell
Set-Location .\StockFlow\backend
npm test
```
Manual checks: two organizations with the same SKU, duplicate SKU rejected, negative quantity rejected, clear an optional price, change the threshold, adjust stock, delete with confirm, sign out and in, resize to 360 / 768 / desktop, restart and confirm the data is still there.

## Deploy
This project is stored under `StockFlow/` in the repository. Configure each deployment service's root directory relative to the repository root:

- **Render backend:** `StockFlow/backend`. Set `DATABASE_URL` and `JWT_SECRET`, use `npm install` as the build command, and `npm start` as the start command. Run `npm run db:push` from this directory when setting up the database.
- **Vercel frontend:** `StockFlow/frontend`. Set `API_URL` to the deployed backend URL (without a trailing slash), then redeploy.

Never commit `.env`; use HTTPS.
