# SmartHostel – Smart Hostel Management System

Multi-tenant SaaS for universities, colleges and private hostels: admissions, bed-level room allocation, fees with Razorpay, attendance, complaints, leave, visitors, notices, inventory, expenses, reports and subscriptions.

## Architecture

```
smarthostel/
  frontend-next/   Next.js 14 (App Router, TS, Tailwind) – the ONLY backend (REST route handlers) + public site, student and warden portals
  admin-react/     React + Vite + TS admin SPA (Recharts) – calls the Next.js API
  docs/            ARCHITECTURE.md (API contract, data model, allocation + payment design)
```

Both apps use the same API. Auth is a JWT in an httpOnly cookie (bearer-token fallback for the SPA). Roles: `SUPER_ADMIN`, `ADMIN`, `WARDEN`, `STUDENT`. The organization (tenant) always comes from the session on the server, never from the request. Wardens are limited to their assigned hostels and students to their own records. See `docs/ARCHITECTURE.md`.

## Tech stack
Next.js, React, TypeScript, Tailwind, Mongoose/MongoDB Atlas, jose + bcryptjs, zod, Razorpay, Cloudinary, Vite, React Router, Axios, Recharts, Vitest.

## Setup
Requires Node 18.18+ and a MongoDB database (Atlas free tier works; a replica set enables transactions).

```bash
# 1. Backend + portals
cd frontend-next
cp .env.example .env.local      # fill MONGODB_URI and JWT_SECRET at minimum
npm install
npm run seed                    # demo organization, users, hostel, rooms, beds
npm run dev                     # http://localhost:3000

# 2. Admin app (new terminal)
cd admin-react
cp .env.example .env.local
npm install
npm run dev                     # http://localhost:5173 (sign-in redirects to http://localhost:3000/login)
```

Seed logins (password `Demo@12345`, override with `SEED_PASSWORD`):
`admin@demo-hostels.test`, `warden@demo-hostels.test`, `student@demo-hostels.test`, `superadmin@smarthostel.test`.
Everyone (students, wardens, admins) signs in on the single page `http://localhost:3000/login`; admins are forwarded to the admin app automatically.

## Environment variables
See `.env.example` (summary) and `frontend-next/.env.example` / `admin-react/.env.example` (full, commented). Secrets are server-only; only `NEXT_PUBLIC_*` and `VITE_*` values reach the browser.

## MongoDB Atlas
Create a cluster, a database user, allow your IP (or 0.0.0.0/0 for Vercel), and paste the SRV string into `MONGODB_URI`. Indexes are created by Mongoose on first connection.

## Razorpay
1. Create test keys at dashboard.razorpay.com → set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
2. Add a webhook to `https://<your-app>/api/payments/webhook` (event `payment.captured`, plus refund events) and set the same secret in `RAZORPAY_WEBHOOK_SECRET`.
3. Flow: `create-order` (server) → Checkout (client) → `verify` (server HMAC) and webhook (raw-body HMAC). Processing is idempotent; the browser's success callback is never trusted.

## Cloudinary
Set the three `CLOUDINARY_*` variables. Uploads use server-signed parameters via `POST /api/upload`.

## API
Full table in `docs/ARCHITECTURE.md`. Responses are `{ success, data, error, meta }`. Routes live in `frontend-next/app/api/**`.

## Commands
| Where | Command | Purpose |
|---|---|---|
| frontend-next | `npm run dev / build / start` | run / build / serve |
| frontend-next | `npm run typecheck` | TypeScript check |
| frontend-next | `npm test` | Vitest (allocation rules, fee math, payment signatures) |
| frontend-next | `npm run seed` | demo data |
| admin-react | `npm run dev / build / preview` | run / build / preview |

## Testing
Automated: 21 unit tests (`npm test` in `frontend-next`), TypeScript checks and production builds of both apps. **Not yet done:** end-to-end tests against a live database, real Razorpay/Cloudinary sandbox runs, and browser/mobile checks. Run through the workflow list in your requirements manually with the seed data before relying on it.

## Deployment (Vercel)
- `frontend-next`: import as a Vercel project with root directory `frontend-next`; add all env vars; set `ADMIN_ORIGIN` to the admin app's URL.
- `admin-react`: separate project with root directory `admin-react`; set `VITE_API_URL` to the Next.js URL (`vercel.json` already rewrites SPA routes).
- Cross-site cookies: in production the API sets `SameSite=None; Secure` when `ADMIN_ORIGIN` is set, and CORS allows only that origin.
- Point the Razorpay webhook at the deployed URL.

## Known limitations
- Rate limiting is in-memory (per server instance); use a shared store such as Upstash Redis for multi-instance production.
- Enterprise plan is assigned by the platform owner only.
- Screenshots are not included; add them under `docs/` after running the apps.
