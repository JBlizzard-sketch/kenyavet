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
- `GET /admin/reports` — all generated reports with worker, employer, scores, flags
- `POST /admin/requests/:id/report` — ops-authored report creation (replaces auto-generation); accepts score breakdown, summaries, identity/DCI status, flags; auto-computes trust score, marks request completed, fires email
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
- `/admin` — admin panel (admin/ops only): Requests tab + Analytics tab (recharts bar/line charts) + Reports tab (all published reports with trust scores, recommendation badges, checks)
- `/ops` — ops workflow: step-by-step drawer with reference contacts, progress bar, and full ReportBuilder form (trust score sliders, identity/DCI selects, summaries, flags, "Publish Report" button)
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
- Ops drawer: `ReportBuilder` component — replaces the old "Complete" button; live trust score gauge, per-dimension sliders (Identity/25, References/30, DCI/20, Social/15, Address/10 for premium), identity + DCI selects, summary/refs/social textareas, flag chips; "Publish Report & Notify Employer" sends email and marks request complete
- Worker registry auto-population: on report publish, worker is auto-inserted (or updated) in `workersTable` with QR code `KV-{year}-{reportId}`, badges (ID Verified, DCI Clean, No Flags, Top/Highly Rated), trust score, and photo
- Email: fully redesigned HTML template — table-based layout for email-client compatibility, live trust score bar, per-dimension score breakdown bars (identity/references/DCI/social/address), color-coded recommendation badge, verify URL hint; accepts `scoreBreakdown` field
- Dashboard "Report Ready" banner: emerald callout section above stats cards — auto-surfaces any recently completed requests with direct "View Report" buttons; `reportId` now included in `GET /dashboard/recent-requests` response
- Dashboard "Pending Payment" nudge: amber banner lists any requests stuck in `pending_payment` with a direct "Pay Now" button to the request detail page
- Workers page: 300ms debounced search input (prevents API hammering on every keystroke); `setLoading(true)` on filter change for correct loading state
- Workers API (`GET /workers`): fixed multi-condition query bug — was always using only `conditions[0]`; now correctly uses `and(...conditions)` when multiple filters (role + query + minScore) are combined
- Staff page: re-vetting overdue/due-soon banner above the roster with red (overdue) or amber (within 60 days) styling and "Schedule Re-Vetting" CTA; StaffCard now shows exact renewal date and differentiates "overdue" (red) from "due soon" (amber)
- Toast notifications: shadcn `toast()` wired into every mutating action across ops, admin, staff, and profile pages — step updates, reference saves, report publish, notes save, status changes, staff add/roster/status, profile save, password change all fire success/destructive toasts; removed now-redundant inline "Saved" text from admin DetailDrawer
- Employer detail page: read-only reference section shows call status badges and summaries once ops has called
- `GET /vetting-requests/:id` now returns `references[]` and `stepProgress` (completed/total counts)
- `GET /vetting-requests` list shows mini step progress bar for in_progress requests
- **Phase 11 — Request cancellation, Admin Employers tab, Ops SLA urgency:**
  - `POST /vetting-requests/:id/cancel` — employer-scoped cancel; only allowed on `pending_payment` status; returns 400 with clear message for any other status
  - Vetting request detail page: "Cancel Request" ghost button appears below the Pay button for `pending_payment` requests; shows inline confirmation ("Cancel this request? / Yes, cancel / Keep") with spinner; fires success/destructive toast
  - `GET /admin/employers` — role-guarded (admin/ops) endpoint returning all employer accounts with per-employer stats: `totalRequests`, `completedRequests`, `pendingRequests`, `inProgressRequests`, `totalSpendKsh`, `lastRequestAt`
  - Admin panel: new "Employers" tab alongside Requests/Analytics/Reports; shows full employer table (name/email/phone, neighbourhood, request counts with coloured badge breakdowns, total spend, joined date, last request date)
  - `GET /admin/requests` now returns `turnaroundHours` (from joined `vettingPackagesTable`) and `packageSlug` per request
  - Ops queue: `getSlaInfo()` helper computes SLA from `updatedAt` (paid-at proxy) + `turnaroundHours`; each queue card shows colour-coded SLA pill — blue "Due in Xh" (>6h), amber "Due in Xh" (≤6h urgent), red "Overdue by Xh"
- **Phase 12 — CSV export, re-submission, and employer stat cards:**
  - Admin Requests tab: "Export CSV" button (disabled when filtered list is empty) generates a client-side CSV of all filtered columns (ID, worker, role, ID number, package, price, status, trust score, employer, email, neighbourhood, dates) and triggers a browser download named `kenyavet-requests-YYYY-MM-DD.csv`
  - Vetting request detail sidebar: "Re-submit Same Worker" button appears on `completed` or `cancelled` requests; navigates to `/vetting-requests/new` with `workerName`, `workerRole`, `workerIdNumber`, `workerPhone` as URL search params
  - New vetting request form: reads URL search params on mount; if any worker param is present, pre-fills the form fields and shows a blue info banner "Worker details pre-filled from a previous request — review and update as needed before submitting"
  - Employer vetting requests list: 2×2 / 4-column grid of compact stat cards (Total, In Progress, Completed, Cancelled) rendered above the filters whenever there are any requests
- **Phase 13 — Worker profile page, Admin activity log, clickable worker cards:**
  - `artifacts/kenyavet/src/pages/worker-profile.tsx` — full dedicated `/workers/:id` page with: animated SVG trust score ring gauge (green/amber/red), recommendation badge ("Safe to Hire / Hire with Caution / Do Not Hire"), identity card panel (neighbourhood, experience, languages, vet count, QR code), verification badges grid with emoji icons, verification record table (KenyaVet ID, QR certificate, last verified date, vet count, registry date), trust score breakdown progress bars per dimension, "Verify on Public Portal" QR link, "Submit New Vetting" CTA
  - App.tsx: `/workers/:id` route registered (before `/workers` to avoid conflict); `WorkerProfile` imported and wired as private route
  - Workers page: worker cards for positive-ID workers (those in `workersTable`) are now clickable — `cursor-pointer` class and `onClick` navigate to `/workers/:id`; report-sourced cards (negative IDs) remain non-clickable
  - `GET /admin/activity` endpoint added to admin.ts — role-guarded (admin/ops); joins `activityItemsTable` + `usersTable`; returns last 200 events with `type`, `message`, `workerName`, `linkId`, `createdAt`, `userName`, `userRole`
  - Admin panel: new "Activity" tab (5th tab, bell icon) with `ActivityLogItem` interface, `loadActivity()` async fetch, `useEffect` trigger on tab switch; renders chronological event feed — each row has coloured icon (emerald=report_ready, blue=in_progress, violet=payment), type pill badge, actor name, timestamp, and "View →" link to the associated vetting request
- **Phase 14 — Report detail page, Notifications page, Staff detail page:**
  - `activityItemsTable` schema: added `readAt` nullable timestamp column; DB migrated via `pnpm --filter @workspace/db run push`
  - `GET /dashboard/activity`: now returns `readAt` per item and limit raised to 50
  - `PATCH /notifications/:id/read`: marks a single notification as read (updates `readAt`); scoped to the requesting employer
  - `POST /notifications/mark-all-read`: marks all unread notifications for the employer as read in one query using `isNull(readAt)` filter
  - `GET /staff/:id`: returns a single staff record (employer-scoped) including `vettingRequestId` for vetting history link
  - `artifacts/kenyavet/src/pages/report-detail.tsx` — dedicated `/reports/:id` page with: animated SVG trust score ring, recommendation badge, worker details panel (name/role/ID/phone/employer), score breakdown grid with emoji icons and per-dimension bars, full verification checks table (pass/fail with scores), detailed findings (references + social media), flags list, print-to-PDF button with print CSS (`@media print`), QR certificate card button, "View Vetting Request" link
  - `artifacts/kenyavet/src/pages/notifications.tsx` — `/notifications` page with: date-grouped feed (Today/Yesterday/X days ago), unread dot indicator, per-item "mark as read" checkmark button, "Mark all read" button in header, type pill badges, relative timestamps, "View request →" links per item; calls `PATCH /notifications/:id/read` and `POST /notifications/mark-all-read`
  - `artifacts/kenyavet/src/pages/staff-detail.tsx` — `/staff/:id` page with: identity card (avatar, name, role, status badge, trust score, phone, start date, notes), re-vetting schedule panel (start date, renewal due date, days-until countdown, overdue/due-soon/OK states with color coding), staff record table (KenyaVet Staff ID, role, status, dates, vetting request link, trust score), "Submit Re-Vetting" CTA pre-filling worker details, "Deactivate/Reactivate" toggle with toast
  - App.tsx: registered `/reports/:id`, `/staff/:id`, `/notifications` routes (all before their list-level siblings to avoid path conflicts)
  - Staff page: staff member avatar and name are now `<Link>` elements to `/staff/:id` with hover effects; cards have `hover:shadow-sm` transition
  - AppLayout notification dropdown footer: "View all notifications →" links to `/notifications`; secondary "Requests →" link added alongside it
- **Phase 15 — Global search, Ops analytics tab, Enhanced verify page:**
  - `artifacts/api-server/src/routes/search.ts` — `GET /search?q=` endpoint (auth-required, employer-scoped); searches across workersTable (name/role/neighbourhood), vettingRequestsTable (workerName/workerRole/workerIdNumber, scoped to employer), and reportsTable (workerName/workerRole, scoped to employer); returns grouped results with type (`worker`/`request`/`report`), id, title, subtitle, and href; min 2 chars, limit 5 per category; registered in index.ts
  - `GET /ops/analytics` endpoint in admin.ts (role-guarded admin/ops): returns queue counts (total/pending/inProgress/completed/completedToday/completedThisWeek), avgCompletionHours (ms diff from createdAt to completedAt), overall slaAdherence (% completed within turnaround hours), packageBreakdown array (slug, name, total, completed, slaAdherence%, avgHours per package), stepBreakdown array (stepName, total/completed/inProgress/pending/failed counts, completionRate%)
  - `AppLayout.tsx` redesigned header: search trigger button (`⌘K` shortcut label) replaces the empty flex-1 spacer; full Cmd+K/Ctrl+K keyboard overlay (`z-[60]`, backdrop blur, max-w-xl modal); search input with 280ms debounce calling `/search?q=`; results displayed in grouped sections (Workers/Requests/Reports) with type icons, title, subtitle, and chevron; arrow-key navigation with `selectedIdx` state; Enter key navigates to the selected result's href; Esc closes overlay; `useEffect` auto-focuses input on open
  - `ops.tsx` Analytics tab: `OpsAnalytics` TypeScript interface added; `OpsAnalyticsPanel` component fetches `/ops/analytics` on mount; renders 4 KPI cards (In Queue, Done Today, This Week, Total Vetted), SLA adherence panel with colour-coded percentage + progress bar (green ≥90%, amber ≥70%, red below), Avg completion time panel with context labels, Package breakdown section with per-package completion bars + avg hours + SLA%, Step completion rates sorted ascending (bottlenecks first) with colour-coded bars; main `Ops` component gets `activeView` state and a Queue/Analytics toggle in the header (pill-style switcher); queue view is unchanged
  - `verify.tsx` completely redesigned: `TrustRing` SVG component with animated stroke-dasharray (1s ease transition, colour-coded green/amber/red); `Recommendation` badge component (Safe to Hire/Hire with Caution/Do Not Hire with matching colour + icon); shared `VerifyCard` component used for both report and legacy-worker results, with: gradient header band, trust ring, recommendation badge, package label, vet count pill, verified-checks badge list, flags panel (amber), left-border summary quote, metadata grid (date + report ID), print button calling `window.print()`, `@media print` CSS injected via `<style>` tag; empty state redesigned with QR icon card and homeowner CTA at bottom
- **Phase 16 — Billing history, Admin user management, Dashboard activity chart:**
  - `GET /billing/history` in dashboard.ts (auth-required, employer-scoped): joins vettingRequestsTable + vettingPackagesTable where mpesaRef is not null; returns totalSpend, last30DaysSpend, transactionCount, transactions array (id, workerName, workerRole, packageName, packageSlug, priceKsh, mpesaRef, paidAt, status)
  - `GET /dashboard/weekly-activity` in dashboard.ts: returns last 7 days with label (Mon/Tue/…), date (YYYY-MM-DD), and count of requests created that day for the authenticated employer
  - `GET /admin/users` in admin.ts (admin/ops only): left-joins usersTable with vettingRequestsTable to count requests per user; returns all users with id, name, email, role, phone, neighbourhood, createdAt, requestCount
  - `POST /admin/users/create` in admin.ts (admin only): validates name/email/password (≥8 chars)/role; checks for duplicate email; bcrypt hashes password; inserts into usersTable; returns created user
  - `PATCH /admin/users/:id/role` in admin.ts (admin only): validates role enum; prevents self-role-change; updates usersTable.role; returns updated user
  - `artifacts/kenyavet/src/pages/billing.tsx` — `/billing` page (employer nav item): 3 summary cards (Total Spend / Last 30 Days / Transaction Count); transaction list with worker avatar, name, role, package badge, M-Pesa ref in monospace, amount in emerald, date, and "Receipt" link to `/receipt/:id`; empty state with CTA to submit first request
  - `artifacts/kenyavet/src/pages/admin.tsx` — new "Accounts" tab: `UserRecord` interface; `usersList`/`createForm`/`creating`/`createError`/`roleUpdating` state; `loadUsers()`/`handleCreateUser()`/`handleRoleChange()` functions; tab button with Shield icon; Accounts panel has: create-account form (name, email, password, role select) in 2-col grid; all-users table with avatar, name/email, joined date, request count, and inline role Select dropdown (calls PATCH on change); admin-only enforcement
  - `artifacts/kenyavet/src/pages/dashboard.tsx` — added `WeekDay` interface; fetches `/dashboard/weekly-activity` in parallel with other dashboard calls; renders "This Week" chart card side-by-side with completion rate using CSS div bars (height proportional to count, today's bar in primary colour, other days in primary/25, min bar height 3px for zero days, 8% floor for non-zero); total submitted count shown in header
  - AppLayout.tsx: added Billing nav item (CreditCard icon) visible only to employers (roles: ["employer"])
  - App.tsx: registered `/billing` route
- **Phase 17 — Worker comparison panel, Onboarding widget, CSV exports:**
  - `GET /dashboard/onboarding` in dashboard.ts (auth-required, employer-scoped): checks profile completeness (phone + neighbourhood), has any request, has any paid request, has any completed report with reportId; returns `{ steps: OnboardingStep[], allDone }` with 4 steps (profile, request, payment, report)
  - `GET /billing/export` in dashboard.ts (auth-required, employer-scoped): joins vettingRequestsTable + vettingPackagesTable where mpesaRef is not null; returns CSV file with Content-Disposition header (worker name/role, package, price, M-Pesa ref, date, status); requires Authorization header in fetch (blob download pattern)
  - `GET /admin/export/requests` in admin.ts (admin/ops only): joins vettingRequestsTable + vettingPackagesTable + usersTable; returns full CSV of all requests including employer details, trust score, M-Pesa ref; role-guarded (403 for employer)
  - `artifacts/kenyavet/src/pages/workers.tsx` — `ComparePanel` component: slide-up fixed bottom panel; `ScoreBar` inner component with colour-coded fill; shows "Select one more worker" prompt when only 1 selected; 2-column layout with avatar, name, role, trust score + bar, neighbourhood, experience, verified date, badge pills, language list, "View Profile" CTA; `compareList: number[]` state (max 2, FIFO eviction); `toggleCompare(id)` function; "Compare" toggle button on each real worker card (id > 0) with active/inactive styling using `GitCompareArrows` icon; panel mounts when `compareList.length > 0`, closed via X button
  - `artifacts/kenyavet/src/pages/dashboard.tsx` — `OnboardingStep` interface; `onboarding` + `onboardingDismissed` state (localStorage key `kv_onboarding_dismissed`); onboarding fetched in parallel with other dashboard data (employer role only); widget renders after greeting section — gradient border card with Zap icon header, X dismiss button (sets localStorage), 4 step rows with numbered circle or green CheckCircle, label + sublabel, strikethrough + opacity for done steps, ArrowRight for pending steps, each row is a `<Link>` to the step's href; hidden if `allDone` or dismissed
  - `artifacts/kenyavet/src/pages/billing.tsx` — `handleExport()` async function: fetches `/billing/export` with Authorization header, converts to blob, creates object URL, triggers `<a>` download, revokes URL; `exporting` state for loading text; "Export CSV" button in page header (visible when transactionCount > 0) with Download icon; uses `API_BASE` imported from `@/lib/api`
