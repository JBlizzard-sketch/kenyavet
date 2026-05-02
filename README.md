# KenyaVet — Domestic Staff Vetting Platform

> Professional background verification for housekeepers, drivers, nannies, cooks, and gardeners in Nairobi's premium neighbourhoods.

[![Live Demo](https://img.shields.io/badge/Live-Demo-teal?style=flat-square)](https://kenyavet.replit.app)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
![Stack](https://img.shields.io/badge/Stack-React%20%2B%20Express%20%2B%20PostgreSQL-blueviolet?style=flat-square)

---

## What Is KenyaVet?

KenyaVet is a full-stack SaaS platform that lets Nairobi homeowners submit domestic staff details and receive a comprehensive vetting report within **24–48 hours**. Every report covers:

| Check | Details |
|---|---|
| 🪪 Identity Verification | National ID cross-referenced with IPRS |
| 📋 DCI Certificate | Criminal record clearance check |
| 📞 Reference Calls | Minimum 3 human-verified reference calls |
| 🌐 Social Media Review | Digital footprint assessment |
| 🤝 Trust Score | Composite 0–100 score with hire recommendation |

---

## Screenshots

| Landing Page | Dashboard | Worker Verification |
|---|---|---|
| Hero with Nairobi social proof | Stats, recent requests, quick actions | QR-based instant verification card |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS v4, shadcn/ui, Wouter |
| **Backend** | Express 5, Node.js 24 |
| **Database** | PostgreSQL 16 + Drizzle ORM |
| **Auth** | JWT (jsonwebtoken) + bcryptjs |
| **Monorepo** | pnpm workspaces |
| **Language** | TypeScript 5.9 (strict) |
| **Logging** | Pino |
| **Validation** | Zod v4 + drizzle-zod |
| **API codegen** | Orval (OpenAPI → React Query hooks) |

---

## Project Structure

```
kenyavet/
├── artifacts/
│   ├── api-server/          # Express REST API (port 8080, proxied at /api)
│   │   ├── src/
│   │   │   ├── routes/      # auth, vetting-requests, workers, staff, reports, admin, dashboard
│   │   │   ├── db/          # Drizzle schema + migrations
│   │   │   └── index.ts     # App entry point
│   └── kenyavet/            # React + Vite frontend (port 20027, proxied at /)
│       ├── src/
│       │   ├── pages/       # Landing, Login, Register, Dashboard, Vetting, Workers, Staff, Reports, Admin, Verify
│       │   ├── components/  # AppLayout, UI primitives (shadcn)
│       │   └── lib/         # auth.tsx, api.ts, utils.ts
├── lib/                     # Shared TypeScript libraries
├── scripts/                 # Utility scripts (seed, git-push)
├── pnpm-workspace.yaml      # Workspace config + catalog pins
└── replit.md                # Agent memory / architecture notes
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- PostgreSQL 15+

### 1. Clone

```bash
git clone https://github.com/JBlizzard-sketch/kenyavet.git
cd kenyavet
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

Create a `.env` file in `artifacts/api-server/`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/kenyavet
SESSION_SECRET=your-random-secret-here
PORT=8080
```

Create a `.env` file in `artifacts/kenyavet/`:

```env
PORT=5173
```

### 4. Push Database Schema

```bash
pnpm --filter @workspace/db run push
```

### 5. Seed Demo Data

```bash
pnpm --filter @workspace/scripts run seed
```

### 6. Run in Development

Start the API server:
```bash
pnpm --filter @workspace/api-server run dev
```

Start the frontend (separate terminal):
```bash
pnpm --filter @workspace/kenyavet run dev
```

---

## API Reference

All endpoints are prefixed with `/api`.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register new employer account |
| `POST` | `/auth/login` | Login, returns JWT |

### Vetting Packages

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/packages` | List all available packages |

### Vetting Requests

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/vetting-requests` | List employer's requests (paginated) |
| `POST` | `/vetting-requests` | Submit new vetting request |
| `GET` | `/vetting-requests/:id` | Request detail with verification steps |
| `PATCH` | `/vetting-requests/:id` | Update request |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/dashboard/stats` | Summary stats for employer |
| `GET` | `/dashboard/recent-requests` | 5 most recent requests |

### Workers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/workers` | Browse verified worker directory |
| `GET` | `/workers/verify/:qrCode` | Verify worker by QR code (public) |
| `GET` | `/workers/:id` | Worker detail |

### Staff

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/staff` | List employer's household staff |
| `POST` | `/staff` | Add a worker to staff |
| `PATCH` | `/staff/:id` | Update staff record (active/inactive) |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/reports` | List completed reports for employer |
| `GET` | `/reports/:id` | Full report detail |

### Admin (admin/ops role only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/requests` | All vetting requests across all employers |
| `PATCH` | `/admin/requests/:id/status` | Update request status, auto-generates report |
| `GET` | `/admin/stats` | Platform-wide statistics |

---

## Database Schema

```
users               — employers, admin, ops roles
vetting_packages    — Basic (Ksh 2,500), Standard (Ksh 5,000), Premium (Ksh 9,000)
vetting_requests    — worker submissions, status workflow
vetting_steps       — per-request verification step tracking
reference_contacts  — reference call contacts per request
workers             — verified worker directory with QR codes
reports             — completed vetting reports with trust scores
staff_records       — employer household staff list
activity_items      — audit/activity feed
```

---

## Vetting Status Workflow

```
pending_payment → paid → in_progress → review → completed
                                              ↘ cancelled
```

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Employer | employer@kenyavet.co.ke | password123 |
| Admin | admin@kenyavet.co.ke | password123 |
| Operations | ops@kenyavet.co.ke | password123 |

---

## QR Verification

Any person can verify a KenyaVet-certified worker by visiting `/verify` and entering their QR code (format: `KV-YYYY-NNNNN`). Demo codes: `KV-2025-00001` through `KV-2025-00008`.

---

## Pricing Packages

| Package | Price (KES) | Checks Included |
|---------|-------------|-----------------|
| **Basic Check** | 2,500 | ID Verification + DCI Certificate |
| **Standard Check** | 5,000 | Basic + 3 Reference Calls + Social Media |
| **Premium Deep Check** | 9,000 | Standard + Extended History + Biometric Verification |

---

## Roadmap

- [ ] M-Pesa payment integration (Safaricom Daraja API)
- [ ] SMS notifications (Africa's Talking)
- [ ] Mobile app (React Native / Expo)
- [ ] Biometric fingerprint integration
- [ ] Employer-to-employer private reference sharing
- [ ] Expiry reminders and re-vetting scheduling
- [ ] Multi-property support (households)
- [ ] Bulk staff import via CSV

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push and open a pull request

---

## License

MIT © 2026 KenyaVet. Built for Nairobi's premium households.
