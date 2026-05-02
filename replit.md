# KenyaVet

## Overview

Production-grade domestic staff vetting and background verification platform for high-end Nairobi households (Karen, Runda, Muthaiga, Kitisuru, Gigiri). Allows homeowners to submit domestic worker details and receive a vetting report within 24-48 hours.

## Architecture

pnpm workspace monorepo with three main artifacts:
- `artifacts/api-server` — Express 5 REST API (port 8080, proxied at `/api`)
- `artifacts/kenyavet` — React + Vite frontend (port 20027, proxied at `/`)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite, Tailwind CSS v4, shadcn/ui, Wouter routing, Recharts
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT (jsonwebtoken + bcryptjs), stored in localStorage
- **Validation**: Zod, drizzle-zod
- **Build**: esbuild

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Database Schema (9 tables)

- `users` — employers, admin, ops roles
- `vetting_packages` — Basic (Ksh 2,500), Standard (Ksh 5,000), Premium (Ksh 9,000)
- `vetting_requests` — worker submissions with status workflow; `mpesa_ref` stores M-Pesa reference
- `vetting_steps` — per-request verification steps (auto-created on payment)
- `reference_contacts` — reference call contacts (1/2/3 per package tier)
- `workers` — verified worker directory with QR codes
- `reports` — completed vetting reports with trust scores
- `staff_records` — employer's household staff list
- `activity_items` — activity feed

## API Routes

All under `/api`:

### Auth
- `POST /auth/register`, `POST /auth/login` — JWT auth
- `PATCH /auth/me/update` — update profile (name, phone, neighbourhood)
- `PATCH /auth/me/password` — change password (requires currentPassword)

### Core
- `GET /packages` — vetting packages
- `GET/POST /vetting-requests` — submit and list requests
- `GET/PATCH /vetting-requests/:id` — request detail and update
- `POST /vetting-requests/:id/pay` — M-Pesa payment, stores mpesaRef
- `GET /vetting-requests/:id/receipt` — printable payment receipt (auth)
- `POST /vetting-requests/:id/references` — add reference contacts

### Dashboard
- `GET /dashboard/stats`, `GET /dashboard/recent-requests`, `GET /dashboard/activity`

### Workers & Reports
- `GET /workers`, `GET /workers/verify/:qrCode` — worker directory (from both workersTable and completed reports)
- `GET /reports`, `GET /reports/:id`, `GET /reports/by-request/:requestId`
- `GET /reports/verify/:reportId` — PUBLIC: QR card verification (no auth)

### Staff
- `GET/POST/PATCH /staff`, `POST /staff/from-request/:requestId`

### Admin/Ops
- `GET/PATCH /admin/requests` — list and update all requests
- `GET /admin/stats` — counts, revenue totals
- `GET /admin/requests/:id/detail` — full request detail with steps[] and references[]
- `PATCH /admin/steps/:stepId` — update individual vetting step status/notes
- `PATCH /admin/references/:refId` — update reference call status/summary (admin/ops only)
- `GET /admin/analytics` — last 6 months activity + package breakdown + revenue
- `PATCH /admin/reports/:id`, `POST /admin/requests/:id/notify`

### Landing
- `GET /landing/stats` — live counter (requests, completed, employers)

## Frontend Pages

- `/` — landing page with hero, packages, testimonials, FAQ, live stats counter, trust score demo
- `/login`, `/register` — auth pages
- `/dashboard` — stats overview, recent requests, activity feed, completion rate bar
- `/vetting-requests` — list of all requests with status filter
- `/vetting-requests/new` — submit new vetting request with reference contacts (1/2/3 by package)
- `/vetting-requests/:id` — request detail with steps, reference contacts (read-only), step progress counter
- `/receipt/:id` — printable M-Pesa payment receipt (auth)
- `/workers` — verified worker directory (merged from workersTable + completed reports)
- `/staff` — household staff management, add-from-report, QR card
- `/reports` — completed vetting reports with QR card button
- `/admin` — admin panel (admin/ops only): Requests tab + Analytics tab (recharts bar/line charts)
- `/ops` — ops workflow: step-by-step drawer with reference contacts, progress bar, complete button
- `/verify` — PUBLIC: QR scan / report ID lookup (?reportId= and ?qr= params)
- `/profile` — user profile + password change (strength meter, show/hide toggle)

## Demo Accounts

- Employer: `employer@kenyavet.co.ke` / `password123`
- Admin: `admin@kenyavet.co.ke` / `password123`
- Ops: `ops@kenyavet.co.ke` / `password123`

## Design System

- Primary color: teal/emerald (`hsl(168 72% 35%)`)
- Dark sidebar navigation
- Trust score display: green ≥80, amber 60-79, red <60
- Fonts: Inter (body), Playfair Display (headings)

## Reference Contacts Logic

- Basic package → 1 reference call required
- Standard package → 2 reference calls required
- Premium package → 3 reference calls required
- Stored in `reference_contacts` table; fetched alongside steps in admin/ops detail views
- Ops drawer: `RefCallCard` component — expandable per-reference editor with call status dropdown (pending/completed/no_answer/busy/wrong_number) + summary textarea + save button; shows X/N called counter in header
- Employer detail page: read-only reference section shows call status badges and summaries once ops has called
- `GET /vetting-requests/:id` now returns `references[]` and `stepProgress` (completed/total counts)
- `GET /vetting-requests` list shows mini step progress bar for in_progress requests
