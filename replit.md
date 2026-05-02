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
- **Phase 25 — Unread Message Badges:**
  - `lib/db/src/schema/messages.ts` — added `isRead` boolean column (default false) to `messages` table; semantic: "read by the intended recipient" — employer messages unread by ops, ops/admin messages unread by employer; DB schema pushed
  - `artifacts/api-server/src/routes/messages.ts` — `PATCH /vetting-requests/:id/messages/read` (requireAuth): marks all unread messages from the opposite role as read in the current thread (employer opens → ops/admin messages marked read; ops opens → employer messages marked read); `GET /messages/unread-count` (requireAuth): employer gets count of unread ops/admin messages on their requests via JOIN on employerId; ops/admin gets count of all unread employer messages platform-wide; uses `ne` and `sql` drizzle helpers for `ANY()` array operator
  - `artifacts/kenyavet/src/components/layout/AppLayout.tsx` — `msgUnread` state; `useEffect` fetches `GET /messages/unread-count` on mount and every 60s via `setInterval`; "Vetting Requests" nav link conditionally renders a red pill badge `(msgUnread)` when count > 0, hiding the active chevron when badge is visible to avoid layout clash; capped at "99+"
  - `artifacts/kenyavet/src/pages/vetting-request-detail.tsx` — `loadMessages` now auto-marks thread as read (fire-and-forget `PATCH /messages/read`) whenever unread messages from another user exist in the fetched thread; badge count clears when employer navigates to any request with unread messages
- **Phase 24 — In-app Messaging per Vetting Request:**
  - `lib/db/src/schema/messages.ts` — new `messages` table: id, requestId (FK→vetting_requests, cascade delete), userId (FK→users), role (text, "employer"/"ops"/"admin"), senderName (text), body (text), createdAt; exported from schema index; DB pushed via `drizzle-kit push`
  - `artifacts/api-server/src/routes/messages.ts` — `GET /vetting-requests/:id/messages` (requireAuth): employer-scoped by employerId check, ops/admin see all; returns chronological message list; `POST /vetting-requests/:id/messages` (requireAuth): validates body, checks access, looks up sender name from usersTable by userId (ops/admin get "KenyaVet Ops"/"KenyaVet Admin" as fallback), inserts and returns new message; registered in routes/index.ts
  - `artifacts/kenyavet/src/pages/vetting-request-detail.tsx` — `Message` interface added; `messages`, `msgInput`, `msgSending`, `msgBottomRef` state; `loadMessages()` fetches thread silently; `sendMessage()` POSTs and appends to local state + auto-scrolls; both called on mount; message thread card renders after vetting steps (hidden for pending_payment requests): scrollable bubble list (max-h-80) with own messages right-aligned in primary colour, ops/admin messages left-aligned in blue tinted bubble with "KenyaVet" badge, timestamps below each bubble, empty state with icon; compose area: textarea (Enter to send, Shift+Enter for newline) + Send button with Loader2 spinner while sending; `MessageSquare` and `Send` icons from lucide imported
- **Phase 23 — Re-vetting Scheduler:**
  - `artifacts/api-server/src/routes/staff.ts` — added `GET /staff/renewals` (requireAuth, employer-scoped, must be registered before `/staff/:id`): queries active staff with renewalDueAt; computes `daysUntil` (ceiling days to due date, negative when overdue) and `urgency` ("overdue" when past, "due_soon" within 60 days, "ok" otherwise); sorts overdue first then due_soon then ok, then by daysUntil ascending; returns `{ renewals: [...] }`; also updated `PATCH /staff/:id` to accept `renewalDueAt` field (converts ISO date string to Date or null before DB update)
  - `artifacts/kenyavet/src/pages/dashboard.tsx` — added `StaffRenewal` interface (id, workerName, role, renewalDueAt, daysUntil, urgency); `renewals` state; `GET /staff/renewals` fetched in parallel with other dashboard data (employer role only); filters to only overdue/due_soon, max 5; `CalendarClock` added to lucide imports; re-vetting widget renders above the Recent Requests grid when list is non-empty — colour-coded red (overdue) or amber (due soon) banner with header count badge, urgency label, staff cards showing avatar initial, name, role, days countdown, "Submit Re-vetting Request" CTA button linking to `/vetting-requests/new`; widget hidden when all renewals are ok or staff has none
  - `artifacts/kenyavet/src/pages/staff-detail.tsx` — added `editingRenewal`, `renewalInput`, `renewalSaving` state; `Edit2`, `Save`, `X` icons imported; renewal date editor added inside the Re-Vetting Schedule card (below the status message, above the re-vet CTA): a "Edit renewal date" link that expands into a date input (min: today) + Save button + cancel X; Save PATCHes `renewalDueAt` and updates member state; "Schedule Re-vetting Now" CTA button shown whenever renewal is overdue or due soon, pre-fills `workerName` and `workerRole` query params in the new request URL
- **Phase 22 — Server-side PDF Report Download:**
  - `artifacts/api-server/src/routes/reports.ts` — added `GET /reports/:id/pdf` (requireAuth, employer-scoped or admin/ops global); imports `pdfkit`; builds a full A4 PDF report: dark green header banner (KenyaVet branding, report ID, date), rounded worker identity card (avatar initial circle, name, role, ID, phone, employer, package), trust score circle with colour-coded numeric display, recommendation badge (SAFE TO HIRE / PROCEED WITH CAUTION / DO NOT HIRE) in corresponding colour; verification checks table (5 rows with icon, label, pts, pass/fail status); score breakdown horizontal bar chart per category with colour-coded fills; Executive Summary, References Summary, Social Media Review text sections; flags list; footer with report ID and confidentiality note; streams as `application/pdf` with `Content-Disposition: attachment` and sanitised filename
  - `artifacts/api-server/build.mjs` — added `pdfkit` and `fontkit` to the esbuild externals list so pdfkit's transitive CJS/SWC dependencies are loaded from node_modules at runtime rather than bundled (fixes `@swc/helpers` MODULE_NOT_FOUND crash)
  - `artifacts/kenyavet/src/pages/report-detail.tsx` — added primary "Download PDF Report" button above the existing Print button in the actions sidebar; onclick: fetches `GET /reports/:id/pdf` with Authorization header, converts response to Blob, creates object URL, triggers `<a download>` click, then revokes URL (clean client-side download without exposing the JWT in the URL bar)
- **Phase 21 — Analytics & Insights page:**
  - `artifacts/api-server/src/routes/analytics.ts` — `GET /analytics` (requireAuth): employer-scoped (filter by employerId) or platform-wide for admin/ops; computes: `totals` (totalRequests, completedRequests, totalSpendingKsh by joining packages table for paid requests, avgTrustScore rounded); `requestsOverTime` 12-month scaffold using `TO_CHAR` PostgreSQL grouping with count and spending per month; `statusBreakdown` grouped by status with display label mapping; `trustScoreDistribution` 5 buckets (0-20, 21-40, 41-60, 61-80, 81-100) computed in-memory; `topRoles` top 6 worker roles by count ordered by COUNT(*) DESC
  - `artifacts/api-server/src/routes/index.ts` — registers analyticsRouter
  - `artifacts/kenyavet/src/pages/analytics.tsx` — full analytics page using recharts (already installed); 4 KPI stat cards (Total Requests + completion rate, Completion Rate %, Total Spent KSh with avg-per-request sub-label, Avg Trust Score with contextual colour and label); chart row 1: `LineChart` for requests over time (12-month x-axis, custom ChartTooltip, blue line), `PieChart` doughnut for status breakdown with `STATUS_COLORS` map and legend; chart row 2: colour-coded `BarChart` for trust score distribution (green→red gradient per bucket), `BarChart` for monthly spending with k-suffix Y-axis; horizontal role ladder with coloured progress bars and rank numbers; `EmptyBar` fallback with BarChart2 icon; skeleton loader during fetch; `StatCard` component with colour-coded icon boxes
  - `artifacts/kenyavet/src/App.tsx` — `/analytics` PrivateRoute added
  - `artifacts/kenyavet/src/components/layout/AppLayout.tsx` — `BarChart2` icon imported, "Analytics" nav item added (visible to all roles, between Reports and Billing)
- **Phase 20 — Worker ratings & reviews, Email notification preferences:**
  - `lib/db/src/schema/worker_reviews.ts` — new `worker_reviews` table: id, workerId (FK→workers), employerId (FK→users), rating (integer 1–5), review (text nullable), createdAt; cascade delete on parent removal
  - `lib/db/src/schema/users.ts` — added `notificationPrefs` jsonb column with typed default `{ report_ready: true, payment_confirmed: true, re_vetting_due: true, weekly_digest: false }`; DB migrated via `pnpm --filter @workspace/db run push`
  - `lib/db/src/schema/index.ts` — exports `workerReviewsTable`
  - `artifacts/api-server/src/routes/workers.ts` — rewrote with correct `and` import (bug fixed); `GET /workers/:id` and `GET /workers/verify/:qrCode` now include `avgRating` (rounded to 1 decimal) and `reviewCount` computed from workerReviewsTable; `GET /workers/:id/reviews` (public) returns paginated review list joined with usersTable for employerName and employerNeighbourhood, plus avgRating/totalReviews; `POST /workers/:id/review` (requireAuth) validates rating 1–5, checks worker exists, upserts (insert-or-update) the employer's review — one review per employer per worker
  - `artifacts/api-server/src/routes/auth.ts` — `GET /auth/me/notifications` returns current notificationPrefs with defaults; `PATCH /auth/me/notifications` accepts partial update (any subset of the 4 keys), merges with existing prefs, persists to DB
  - `artifacts/kenyavet/src/pages/worker-profile.tsx` — rewritten with reviews section: star rating summary bar (avg + count in the identity card), animated `StarRow` component (interactive when `onChange` provided, read-only otherwise, hover effects), "Leave a review / Edit my review" link (employer-only); review form: star picker + optional textarea, submit/cancel buttons, spinner while submitting; reviews list: reviewer name, neighbourhood pill, formatted date, star row, review text; empty state with "Be the first to review" CTA; `loadReviews` function called on mount and after submission; detects if current user already has a review (by name match) and pre-fills form
  - `artifacts/kenyavet/src/pages/profile.tsx` — new "Email Notifications" card: `NOTIF_LABELS` config array; fetches `GET /auth/me/notifications` on mount; toggle switches (custom CSS pill toggles, primary color when on) for each of the 4 preference keys; clicking a toggle calls `PATCH /auth/me/notifications` with the changed key and shows a toast; "weekly_digest" starts off; footnote clarifying transactional emails always arrive regardless of settings
- **Phase 19 — Dark mode toggle, Shareable public report link:**
  - `artifacts/kenyavet/index.html` — inline anti-flash script (before React hydrates): reads `kv_dark_mode` from localStorage and applies `.dark` to `<html>` synchronously; also respects `prefers-color-scheme` for first-time visitors
  - `artifacts/kenyavet/src/lib/theme.ts` — `useTheme()` hook: reads/writes `kv_dark_mode` localStorage key, applies/removes `.dark` class on `document.documentElement`, returns `{ theme, toggle }`; defaults to system preference when no key is set
  - `AppLayout.tsx` — dark mode toggle button (Moon/Sun icon from lucide) in top header between search bar and notification bell; uses `useTheme()`; tooltip states "Switch to light/dark mode"; hardcoded `bg-white`/`border-gray-100` in search overlay and notification dropdown replaced with `bg-popover`/`border-popover-border`/`border-border` so they render correctly in both modes
  - `POST /reports/:id/share` in reports.ts (auth-required, employer-scoped): validates report ownership; generates 48-byte hex token stored in in-memory `shareTokens` Map with 48-hour TTL; returns `{ shareToken, expiresAt }`
  - `GET /reports/share/:shareToken` in reports.ts (PUBLIC, no auth): looks up token in `shareTokens`, validates expiry (auto-purges), fetches report + vetting request from DB; returns public-safe report payload with `sharedBy` (employer name) and `expiresAt`; route registered BEFORE `GET /reports/:id` to avoid Express path conflict
  - `artifacts/kenyavet/src/pages/report-public.tsx` — `/r/:shareToken` public page (no auth, no AppLayout): trust score ring (SVG, colour-coded), "Safe to Hire/Caution/Do Not Hire" recommendation badge, verification summary, check rows (Identity/DCI/References/Social), score breakdown grid with per-dimension bars, flags panel (red), "Shared by X · Expires Y" attribution line, "Vet your own staff" CTA footer; expired/invalid link handled with AlertCircle not-found state
  - `report-detail.tsx` — "Share Report Link" button in actions sidebar: calls `POST /reports/:id/share`, displays share URL in a compact inline box with copy-to-clipboard (Check icon confirmation), "Revoke and hide link" toggle; spinner while generating; uses `window.location.origin + BASE_URL` for correct URL in any deploy environment
  - `App.tsx` — `/r/:shareToken` public route registered (before the catch-all), `ReportPublic` component imported
- **Phase 18 — Forgot/reset password, Public worker share page:**
  - `POST /auth/forgot-password` in auth.ts: looks up user by email; generates 32-byte hex token stored in in-memory `resetTokens` Map with 1-hour TTL; cleans up expired/old tokens for same user; returns `{ resetUrl, token }` with URL pointing to `/reset-password?token=…` (uses `REPLIT_DOMAINS` env var for hostname); does NOT reveal whether email exists for unknown addresses
  - `POST /auth/reset-password` in auth.ts: validates token exists and hasn't expired in `resetTokens` Map; bcrypt-hashes new password; updates `usersTable`; deletes used token; returns success
  - `artifacts/kenyavet/src/pages/forgot-password.tsx` — `/forgot-password` standalone page (no AppLayout): email input form; on success shows the reset URL directly (demo mode note explaining production would email it); copy-to-clipboard button and "Open reset page" button; "Back to sign in" link
  - `artifacts/kenyavet/src/pages/reset-password.tsx` — `/reset-password` standalone page: reads `?token=` from URL via `useSearch`; no-token guard with "invalid link" UI; new password + confirm fields with strength meter (4-segment bar, red/amber/emerald) and show/hide toggle; on success shows green checkmark and auto-redirects to `/login` after 3s via `setTimeout`
  - `artifacts/kenyavet/src/pages/login.tsx` — added "Forgot password?" link inline with the Password label (`flex justify-between`), linking to `/forgot-password`
  - `artifacts/kenyavet/src/pages/worker-public.tsx` — `/w/:qrCode` public route (no auth, no AppLayout): fetches `GET /workers/verify/:qrCode`; `TrustRing` SVG component (r=64, animated stroke-dasharray, colour-coded green/amber/red); `RecommendationBadge` component (Safe to Hire / Caution / Do Not Hire); shows worker avatar initial, name, role, trust ring, recommendation, score label badge, neighbourhood + verified date meta row, verified badges list with CheckCircle icons, languages, QR certificate ID; "Powered by KenyaVet" footer with signup CTA; "Verified Worker Profile" pill in header; not-found and loading states; registered as public route in App.tsx
