# Oxiaura POS Frontend — Phase-by-Phase Build Specification

This document is the source of truth for building the frontend against
[`API_ENDPOINTS.md`](API_ENDPOINTS.md). It defines implementation order, screen
scope, API usage, permissions, state rules, and acceptance criteria. Do not build
features from assumptions when the API contract already defines their behavior.

## 0. Product and technical foundation

### 0.1 Recommended stack

- React 19 with TypeScript and Vite
- React Router for routing
- TanStack Query for server state and cache invalidation
- React Hook Form with Zod for form validation
- Axios or a small `fetch` wrapper for HTTP
- Tailwind CSS with a reusable component layer
- Recharts for dashboards and reports
- Vitest, React Testing Library, and Playwright
- ESLint, Prettier, and strict TypeScript

Equivalent technologies are acceptable, but the behavior in this specification is
not optional.

### 0.2 Visual direction and color modes

Use a modern monochrome POS design inspired by the attached reference: a compact
three-column cashier workspace, strong typography, efficient spacing, rounded cards,
subtle borders, and restrained shadows. It must feel like a professional retail
application rather than a generic admin template.

Core navigation, selection, buttons, surfaces, and typography use neutral black,
white, and gray tokens. Reserve color for semantic feedback and small status
indicators. Do not use gradients, decorative glass effects, oversized shadows, or a
permanent brand accent color.

Required semantic theme tokens:

```css
:root {
  color-scheme: light;
  --background: #f4f4f5;
  --surface: #ffffff;
  --surface-subtle: #fafafa;
  --surface-elevated: #ffffff;
  --foreground: #111113;
  --foreground-muted: #6b6b73;
  --border: #e4e4e7;
  --border-strong: #c9c9cf;
  --primary: #171719;
  --primary-foreground: #ffffff;
  --selected: #27272a;
  --selected-foreground: #ffffff;
  --success: #15803d;
  --warning: #b45309;
  --danger: #b91c1c;
  --focus-ring: #52525b;
  --shadow-card: 0 1px 2px rgb(0 0 0 / 0.06);
}

[data-theme="dark"] {
  color-scheme: dark;
  --background: #0d0d0f;
  --surface: #171719;
  --surface-subtle: #202024;
  --surface-elevated: #242428;
  --foreground: #f5f5f6;
  --foreground-muted: #a1a1aa;
  --border: #303036;
  --border-strong: #48484f;
  --primary: #f4f4f5;
  --primary-foreground: #111113;
  --selected: #f4f4f5;
  --selected-foreground: #111113;
  --success: #4ade80;
  --warning: #fbbf24;
  --danger: #f87171;
  --focus-ring: #d4d4d8;
  --shadow-card: 0 1px 2px rgb(0 0 0 / 0.35);
}
```

- Implement light, dark, and system modes. Default to system preference on first use.
- Persist an explicit choice locally and apply it before React paints to avoid a theme
  flash during startup.
- Provide an accessible theme control in the profile menu and Settings screen.
- Every component must use semantic tokens; do not scatter light-only raw colors through
  feature code.
- Product photography remains full color and uses a neutral fallback placeholder.
- Availability, success, warning, and danger states use an icon or label as well as color.
- Controls, focus states, charts, tables, and disabled states satisfy WCAG 2.2 AA in both
  modes.
- Use an 8px spacing rhythm, 10-12px card radii, 8-10px control radii, compact 36-40px
  controls, and 44px minimum touch targets for primary tablet actions.

The application is desktop-first and must remain usable on tablets. Dense financial
tables may scroll horizontally on smaller screens. Primary actions must remain visible
without relying only on color.

### 0.2.1 POS application shell and cashier workspace

The authenticated sales shell follows the reference structure:

```text
┌──────────────┬───────────────────────────────────┬────────────────────┐
│ Brand/user   │ Branch + date/time + page tools   │                    │
├──────────────┼───────────────────────────────────┤ Order summary      │
│ Primary nav  │ Search + category filters         │ Cart lines         │
│              │ Product card grid                 │ Totals             │
│              │                                   │ Order options      │
│ Settings     │                                   │ Confirm action     │
└──────────────┴───────────────────────────────────┴────────────────────┘
```

- Left sidebar: business identity, role-aware primary navigation, Settings, and Logout.
  The current route uses a solid high-contrast selected state.
- Top bar: current branch, local date/time, connectivity indicator, theme control, and
  user/profile menu.
- Main sales area: product search, horizontally scrollable category chips, result count,
  refresh control, and responsive product grid.
- Product cards: 4:3 image, product name, exact selling price, availability/low-stock
  label, and one clear add action. Cards without images retain the same height.
- Order summary: sticky on desktop, with editable cart lines, quantities, notes,
  discounts, subtotal, taxes if returned, total, customer/order metadata, and final action.
- Use approximately `240px / minmax(0, 1fr) / 360px` columns at wide desktop sizes.
  The sidebar may collapse to icons at medium widths. On tablets, open the order summary
  as a right drawer or full-width step and show a persistent cart button with count/total.
- Preserve filters and cart state while opening selectors or dialogs. Warn before
  abandoning a non-empty draft cart.
- Design empty, loading, offline, no-image, unavailable, insufficient-stock, and
  failed-payment states in both color modes.
- The image is directional only. Do not copy its restaurant labels, logo, prices, or data;
  use Oxiaura terminology and backend-provided content.

### 0.3 API conventions

Base path: `/api/v1`.

Normal success:

```ts
type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
    pages?: number;
    [key: string]: unknown;
  };
};
```

Normal error:

```ts
type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};
```

Money arrives as exact decimal strings. Keep money as strings or a decimal type
through calculations; never use binary floating-point for financial totals.

Dates use `YYYY-MM-DD`. Datetimes are UTC API values rendered in
`Asia/Colombo`. Do not shift date-only values through a timezone conversion.

PDF and XLSX endpoints return binary bodies. The API client must support `Blob`
responses and read the filename from `Content-Disposition` when downloading.

### 0.4 Roles

```ts
type UserRole =
  | "ADMIN"
  | "HO_STAFF"
  | "BRANCH_MANAGER"
  | "SALES_REP"
  | "ACCOUNTS";
```

The backend is the final authorization boundary. The frontend must also hide or
disable unavailable navigation and actions so users are not invited into a 403.

- `ADMIN`: all screens and actions
- `HO_STAFF`: operational and financial work, excluding users, audit log, and
  ADMIN-only configuration
- `BRANCH_MANAGER`: own-branch operational views and permitted branch actions
- `SALES_REP`: own-branch sales, customer/product lookup, and permitted stock views
- `ACCOUNTS`: payments, receivables, expenses, reports, and cost-visible views

Branch-scoped users must not see an editable global branch filter. Display their
assigned branch as read-only. Unrestricted roles may select a branch or “All”.

### 0.5 Golden frontend rules

1. Server state belongs in TanStack Query, not duplicated global stores.
2. Route components coordinate; reusable feature modules own forms and tables.
3. Every mutation must invalidate all affected queries. Financial mutation
   responses should also update the visible record immediately.
4. Never optimistically mark financial operations successful. Wait for the server.
5. Confirm irreversible or reversal-producing actions with a modal that states the
   consequence.
6. Show backend `error.message`; use `error.details` for field or row errors.
7. Preserve list filters, sort, page, and tab in URL search parameters.
8. Empty, loading, error, forbidden, and stale states are designed states.
9. Never calculate stock, balances, invoice totals, or report KPIs independently
   when the backend returns them.
10. All create/edit forms prevent duplicate submission while pending.

### 0.6 Suggested project structure

```text
src/
  app/                 router, providers, layouts
  api/                 client, endpoint functions, generated/manual types
  auth/                token lifecycle, guards, permission helpers
  components/          generic UI components
  features/            one folder per business domain
  hooks/               shared application hooks
  lib/                 money, date, download, query-key utilities
  pages/               route-level compositions
  styles/              theme and global styles
  test/                fixtures and test setup
```

### 0.7 Required shared components

- Application shell, collapsible sidebar, top bar, breadcrumb, branch selector, and
  light/dark/system theme control
- `PageHeader`, `Card`, `StatCard`, `StatusBadge`
- Product card/grid, category chips, sticky cart/order summary, quantity control, and
  responsive tablet cart drawer
- `DataTable`, pagination, sortable/filterable column utilities
- `SearchInput`, date range, branch, status, product, customer, and supplier filters
- `FormField`, money input, date input, async entity combobox
- Loading skeleton, empty state, inline error, forbidden state, not-found page
- Confirmation modal and reason modal
- Toast notifications
- PDF preview/download and file download helper
- Responsive line-entry table for invoices, POs, transfers, and counts

## 1. Phase plan

Build exactly one phase at a time. A phase is complete only after its acceptance
criteria and tests pass.

---

## Phase 0 — Scaffold, theme, API client, and quality gates

### Deliverables

- Initialize the selected TypeScript frontend stack.
- Add theme tokens and global layout primitives.
- Configure routing, query provider, error boundary, and toast provider.
- Implement the typed API client and success/error parsing.
- Add exact decimal, date, datetime, and binary-download utilities.
- Configure unit, component, and end-to-end test runners.
- Add environment variables such as `VITE_API_BASE_URL`.

### API work

- `GET /health` for a development connectivity indicator.

### Acceptance

- Application boots with no TypeScript or lint errors.
- API errors appear in the standard error UI.
- Money formatting preserves decimal accuracy.
- PDF/XLSX helper downloads a mocked blob correctly.
- CI commands for lint, type-check, unit tests, and production build pass.

---

## Phase 1 — Authentication, session lifecycle, and protected shell

### Screens

- Login
- Authenticated application shell
- Profile/account panel
- Change-password dialog/page
- Unauthorized, forbidden, and session-expired states

### Endpoints

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password`

### Behavior

- Attach the access token to authenticated requests.
- Refresh once after a 401 caused by an expired access token; queue concurrent
  requests during refresh. Do not loop on refresh failure.
- Clear credentials and navigate to login after invalid refresh/logout.
- Show the current user, role, and branch in the shell.
- Respect login `429` responses and prevent repeated automatic retries.

### Acceptance

- Valid login reaches the default permitted route.
- Invalid credentials and rate limits show clear messages.
- Refresh restores a request without duplicating it.
- Protected routes cannot render before authentication resolves.
- Role-driven navigation is covered by tests for all five roles.

---

## Phase 2 — Users, branches, settings, and permission framework

### Screens

- User list, create, edit, activate/deactivate
- Branch list, detail, create, edit, deactivate
- Settings list and setting editor

### Endpoints

- All `/users` endpoints
- All `/branches` endpoints
- All `/settings` endpoints

### Behavior

- User administration is visible to `ADMIN` only.
- Branch writes and setting writes are `ADMIN` only.
- Branch-scoped users see only the branch returned by the backend.
- Require confirmation before user/branch deactivation.
- Role and branch fields enforce compatible combinations.

### Acceptance

- Lists preserve filters and pagination in the URL.
- Forms display backend uniqueness/validation failures beside relevant fields.
- Status changes invalidate lists, details, and current-user data when applicable.
- Forbidden navigation items are absent, not merely disabled.

---

## Phase 3 — Product catalogue and price history

### Screens

- Product list with search, category, active status, and low-stock indicators
- Product detail
- Product create/edit
- Price history timeline/table
- Price-change dialog
- Product movement history tab

### Endpoints

- All `/products` endpoints
- `GET /products/:id/movement`

### Behavior

- Cost fields render only when returned by the API.
- Product codes become read-only when backend rules reject recoding.
- Price changes are separate from ordinary product edits.
- Movement history shows opening/closing balance and a running-balance table.

### Acceptance

- Non-cost roles never see blank placeholders suggesting hidden cost values.
- Price changes refresh product detail and history.
- Movement filters and pagination are URL-backed.
- Product deactivation requires confirmation.

---

## Phase 4 — Customers, suppliers, and expense categories

### Screens

- Customer list/detail/create/edit/deactivate
- Customer statement tab
- Supplier list/detail/create/edit/deactivate
- Expense-category administration

### Endpoints

- All `/customers` endpoints
- `GET /customers/:id/statement`
- All `/suppliers` endpoints
- All `/expense-categories` endpoints

### Behavior

- Entity selectors use searchable async comboboxes and show code plus name.
- Customer statements show opening balance, debit, credit, running balance, and
  closing balance.
- Date filters do not discard the returned opening balance.
- Master-data writes follow role visibility from the backend.

### Acceptance

- Duplicate-code and validation errors are actionable.
- Statement totals reconcile visually to the returned closing balance.
- Deactivated entities remain readable where referenced historically but are not
  offered for new transactions.

---

## Phase 5 — Stock dashboard, matrix, movements, and opening balances

### Screens

- Stock levels list
- Branch-by-product stock matrix
- Stock valuation
- Global movement register
- ADMIN opening-balance importer/editor

### Endpoints

- All `/stock` endpoints

### Behavior

- Low stock is visually distinct and filterable.
- Matrix supports sticky product and branch headers and horizontal scrolling.
- Valuation warnings are prominent; never substitute zero for missing cost.
- Opening load supports multiple rows, displays created and skipped results, and
  clearly communicates idempotency.
- Cost-bearing views/actions use role gates.

### Acceptance

- Matrix totals use only server-returned values.
- `as_of` is visible whenever viewing historical stock.
- Opening results identify every skipped product/branch pair and reason.
- Branch-scoped roles cannot manipulate the branch query parameter through UI.

---

## Phase 6 — Purchase orders, goods receipt, and payables

### Screens

- Purchase-order register and detail
- Draft PO create/edit with line editor
- Goods-receipt workflow
- Supplier-payment workflow and payment history
- Outstanding-payables report

### Endpoints

- All `/purchase-orders` endpoints
- `GET /payables/outstanding`

### Behavior

- Line totals and PO totals display server-calculated values.
- Draft-only edit actions disappear after lifecycle transition.
- Goods receipt accepts per-line quantities and date, then shows posted movements.
- Prevent obvious client-side over-receipt but treat backend validation as final.
- Payment form shows balance before and after submission.

### Acceptance

- PO line editor supports add/remove without duplicate products.
- Receive screen clearly shows ordered, previously received, and outstanding units.
- Successful receipt refreshes PO, stock, movements, and payables queries.
- Cost data is hidden for unauthorized roles.

---

## Phase 7 — Invoice drafting, issue, delivery, cancellation, and PDF

### Screens

- Invoice register
- Invoice detail with lifecycle actions
- Draft invoice create/edit and line editor
- Cashier POS workspace for fast product search, cart building, customer selection, and
  draft/issue flow
- Delivery update workflow
- Invoice PDF preview/download

### Endpoints

- All `/invoices` endpoints
- `GET /invoices/:id/pdf`

### Behavior

- Server owns invoice number and all totals.
- The cashier workspace uses the three-column shell in section 0.2.1 and is the default
  sales-entry experience on desktop. It supports keyboard-first search and cart entry.
- Product cards use catalogue data and display server-returned price and stock status.
  Never infer availability from a locally decremented quantity.
- Adding or changing a line updates the draft through supported invoice endpoints and
  displays server-calculated totals. Debounce safe quantity edits and serialize mutations
  per draft so responses cannot apply out of order.
- The order summary distinguishes draft creation/issue from payment. Never label an
  invoice paid unless a successful payment endpoint response confirms it.
- Draft lines support add/edit/remove; issued invoices become read-only except for
  permitted delivery actions.
- Issue confirmation warns that stock will be posted.
- Insufficient-stock `details` identify failing lines inline.
- Cancellation requires a reason and explains that reversal movements are posted.
- Discount approval errors explain which role is required.
- PDF opens inline when supported and remains downloadable.

### Acceptance

- Invoice status controls available actions exactly.
- Cashier search, category filtering, add/remove, quantity editing, customer selection,
  discount errors, and responsive cart behavior have component and Playwright coverage.
- The POS workspace is visually complete and contrast-compliant in light and dark modes,
  including loading, empty, unavailable, offline, and insufficient-stock states.
- Issue refreshes invoice, stock, movement, product-performance, and dashboard data.
- Cancellation shows reversal outcome and removes invalid actions.
- Free-issue invoices are visibly labeled as zero-revenue stock movements.

---

## Phase 8 — Payments, receipts, receivables, and customer accounts

### Screens

- Payment register
- Record-payment dialog/page
- Payment detail and reversal
- Receipt PDF preview/download
- Outstanding receivables
- Aging analysis

### Endpoints

- All `/payments` endpoints
- All `/receivables` endpoints
- Customer statement endpoint from Phase 4

### Behavior

- Payment entry starts from an eligible invoice and shows current balance.
- Do not allow an obvious amount above balance, but show backend `OVERPAYMENT` as
  final authority.
- Payment reversal requires a reason and confirmation.
- Reversed payments remain visible and clearly marked.
- Aging buckets and totals render exactly as returned.

### Acceptance

- Payment success refreshes invoice, payment list, statements, receivables, and
  dashboard queries.
- Reversal restores the updated invoice balance without local arithmetic.
- Receipt PDF uses a binary response and meaningful filename.
- Ineligible invoice statuses cannot enter the payment flow.

---

## Phase 9 — Transfers and in-transit inventory

### Screens

- Transfer register and detail
- Draft transfer creation
- Dispatch workflow
- Receipt workflow with variance review
- In-transit stock view
- Transfer cancellation

### Endpoints

- All `/transfers` endpoints

### Behavior

- Source and destination branches must differ.
- Dispatch shows source availability and warns that stock leaves the source only.
- Receipt displays dispatched quantity and permits a lower received quantity.
- Shortfalls must be rendered as unresolved variances, never hidden in a toast.
- Cancellation explains whether it will simply cancel a draft or reverse dispatched
  stock.

### Acceptance

- Dispatch and receive actions follow transfer status.
- Variance rows visibly identify product, dispatched, received, and shortfall.
- All stock-related query caches refresh after dispatch, receive, and cancellation.
- Branch-scoped users see only transfers involving their branch.

---

## Phase 10 — Samples, disposals, and stock counts

### Screens

- Sample register, detail, and issue form
- Disposal register, detail, create, and approval queue
- Stock-count register, draft count entry, submission review, and approval

### Endpoints

- All `/samples` endpoints
- All `/disposals` endpoints
- All `/stock-counts` endpoints

### Behavior

- Sample issue shows authorizer and resulting stock movement.
- Pending disposals remain clearly “not yet posted”; approval warns that stock will
  be written off.
- Stock-count entry handles many products efficiently, including zero counts.
- Submission shows system quantity and variance but does not imply adjustment.
- Approval shows adjustment movements and final status.

### Acceptance

- Approval actions are visible only to permitted roles.
- Stock-count lifecycle is visually explicit: Draft → Submitted → Approved.
- Zero-variance lines are distinguishable from adjusted lines.
- Successful stock-changing actions invalidate every relevant stock query.

---

## Phase 11 — Expenses and approval workflows

### Screens

- Expense register and detail
- Expense create form
- Pending approval queue
- Approve and reject workflows

### Endpoints

- All `/expenses` endpoints
- Expense-category endpoints from Phase 4

### Behavior

- Status badges distinguish pending, approved, and rejected records.
- Approval follows role and configured-threshold behavior returned by the backend.
- Rejection requires a reason.
- Approved/rejected records remain historical and read-only.

### Acceptance

- Expense mutations refresh expense lists, expense breakdown, P&L, and dashboard.
- Approval and rejection are double-submit safe.
- Branch-scoped users cannot select another branch.

---

## Phase 12 — Dashboard, reports, XLSX/PDF exports, and print workflows

### Screens

- Executive dashboard
- Product performance
- Sales by branch
- Sales by representative
- Invoice status
- Expense breakdown
- Profit and loss
- Stock valuation report

### Endpoints

- All `/reports/*` JSON endpoints
- `GET /reports/:name/export?format=xlsx|pdf`
- Invoice and receipt PDF endpoints from earlier phases

### Behavior

- A shared report toolbar controls dates, branch, refresh, XLSX, and PDF.
- Charts always have an adjacent accessible table or summary.
- P&L and valuation warnings are prominent and retained in exports.
- Export buttons show progress, handle binary errors, and preserve current filters.
- Dashboard cards link to their detailed report/register where appropriate.

### Acceptance

- All eight reports render empty and populated datasets.
- Displayed totals match API values without frontend recomputation.
- Export filenames and MIME types are handled correctly.
- Changing a filter cancels or supersedes stale report requests.

---

## Phase 13 — Audit log, operational UX, and administration hardening

### Screens

- ADMIN-only audit-log register
- Audit-entry comparison drawer/modal
- Operational status area for connectivity and request IDs

### Endpoints

- `GET /audit-log`
- `GET /health`

### Behavior

- Filters: table, record ID, user, action, and date range.
- Old/new JSON values render as a field-level comparison with raw JSON fallback.
- Request ID from response headers is available in technical error details so an
  incident can be traced in structured logs.
- Audit values are read-only and export/copy friendly.

### Acceptance

- Audit navigation and routes are inaccessible to non-ADMIN users.
- Changed, added, and removed values are visually differentiated.
- Large JSON values do not break the page.
- Error UI exposes a copyable request ID without exposing tokens or secrets.

---

## Phase 14 — Cross-feature integration, accessibility, and release readiness

### Deliverables

- Full role-by-route navigation audit
- Keyboard and screen-reader pass
- Responsive tablet pass
- Light, dark, and system-theme visual regression pass
- Performance profiling and bundle review
- Error/empty/loading-state audit
- End-to-end financial workflow tests
- Deployment configuration and frontend observability

### Required end-to-end workflows

1. Login → create draft invoice → issue → record payment → download receipt.
2. Issue invoice → cancel → verify reversed stock and updated receivable.
3. Create PO → receive goods → verify stock → record supplier payment.
4. Create transfer → dispatch → inspect in transit → partially receive → inspect variance.
5. Create disposal → approve → verify movement and report impact.
6. Create stock count → submit → approve → verify final stock.
7. Create expense → approve/reject → verify report impact.
8. Run each report with filters and download XLSX/PDF.
9. ADMIN reviews corresponding audit entries.

### Acceptance

- No critical WCAG 2.2 AA violations in automated and manual checks.
- No theme flash on startup, and every supported screen remains readable and operable in
  light and dark modes.
- No role can navigate to an unauthorized feature through visible UI.
- All mutation workflows show pending, success, and error states.
- Production build passes and contains no secrets or development API URLs.
- Playwright critical-path tests pass against a seeded backend.

## 2. Route map

Recommended frontend routes:

```text
/login
/dashboard
/pos
/users
/branches
/products
/products/:id
/customers
/customers/:id
/suppliers
/suppliers/:id
/stock
/stock/matrix
/stock/movements
/stock/valuation
/purchase-orders
/purchase-orders/:id
/payables
/invoices
/invoices/new
/invoices/:id
/payments
/receivables/outstanding
/receivables/aging
/transfers
/transfers/:id
/transfers/in-transit
/samples
/disposals
/stock-counts
/stock-counts/:id
/expenses
/reports/:name
/settings
/audit-log
```

Use route metadata for required roles, navigation grouping, breadcrumb labels, and
document titles. Permission checks must use one centralized policy module.

## 3. Query and mutation cache policy

Use hierarchical keys such as:

```ts
["invoices", "list", filters]
["invoices", "detail", invoiceId]
["stock", "levels", filters]
["reports", reportName, filters]
```

At minimum:

- Invoice issue/cancel invalidates invoices, stock, movements, receivables, and reports.
- Payment create/reverse invalidates payments, invoice detail, receivables, customer
  statements, and reports.
- PO receipt invalidates PO detail, stock, movements, payables, and reports.
- Transfer dispatch/receive/cancel invalidates transfers, in-transit, stock, and movements.
- Sample/disposal/count approval invalidates its register, stock, movements, and reports.
- Expense decisions invalidate expenses and financial reports.
- Master-data changes invalidate all relevant selectors.

## 4. Form and error standards

- Client validation mirrors obvious required fields, formats, ranges, and maximum lengths.
- Backend errors override client assumptions.
- Map `error.details` to fields/rows when keys are recognizable.
- For line-based errors, retain entered lines and highlight the failing products.
- Dirty forms prompt before route changes.
- Reason fields for cancel/reverse/reject operations are mandatory.
- Successful mutations show concise confirmation and navigate only when it improves flow.

## 5. Definition of done for every phase

- All named screens and endpoint integrations are implemented.
- Role and branch behavior is tested.
- Loading, empty, error, forbidden, and success states are present.
- Forms have client validation and backend error mapping.
- Query invalidation is verified after every mutation.
- Responsive and keyboard behavior has been checked.
- Unit/component tests cover core behavior.
- At least one Playwright happy path covers the phase.
- Lint, strict type-check, tests, and production build are green.
- `API_ENDPOINTS.md` remains the authoritative wire contract; discrepancies are fixed
  in documentation or backend rather than patched with frontend guesses.
