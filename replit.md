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
- **Frontend**: React + Vite, Tailwind CSS v4, shadcn/ui, Wouter routing
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT (jsonwebtoken + bcryptjs), stored in localStorage
- **Validation**: Zod, drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Database Schema (9 tables)

- `users` — employers, admin, ops roles
- `vetting_packages` — Basic (Ksh 2,500), Standard (Ksh 5,000), Premium (Ksh 9,000)
- `vetting_requests` — worker submissions with status workflow
- `vetting_steps` — per-request verification steps
- `reference_contacts` — reference call contacts
- `workers` — verified worker directory with QR codes
- `reports` — completed vetting reports with trust scores
- `staff_records` — employer's household staff list
- `activity_items` — activity feed

## API Routes

All under `/api`:
- `POST /auth/register`, `POST /auth/login` — JWT auth
- `GET /packages` — vetting packages
- `GET/POST /vetting-requests` — submit and list requests
- `GET/PATCH /vetting-requests/:id` — request detail and update
- `GET /dashboard/stats`, `GET /dashboard/recent-requests` — dashboard data
- `GET /workers`, `GET /workers/verify/:qrCode` — worker directory
- `GET/POST/PATCH /staff` — employer staff management
- `GET /reports`, `GET /reports/:id` — completed reports
- `GET/PATCH /admin/requests`, `GET /admin/stats` — admin panel

## Frontend Pages

- `/` — landing page with hero, packages, testimonials
- `/login`, `/register` — auth pages
- `/dashboard` — stats overview + recent requests
- `/vetting-requests` — list of all requests
- `/vetting-requests/new` — submit new vetting request
- `/vetting-requests/:id` — request detail with steps
- `/workers` — verified worker directory
- `/staff` — household staff management
- `/reports` — completed vetting reports
- `/admin` — admin panel (admin/ops roles only)
- `/verify` — public QR code verification

## Demo Accounts

- Employer: `employer@kenyavet.co.ke` / `password123`
- Admin: `admin@kenyavet.co.ke` / `password123`
- Ops: `ops@kenyavet.co.ke` / `password123`

## Design System

- Primary color: teal/emerald (`hsl(168 72% 35%)`)
- Dark sidebar navigation
- Trust score display: green ≥80, amber 60-79, red <60
- Fonts: Inter (body), Playfair Display (headings)
