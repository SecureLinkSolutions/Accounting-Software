# Iron Ledger

**Modern accounting software for small and medium businesses.**

Built by SecureLink Solutions — a full-featured, double-entry accounting system that runs as a desktop app or a self-hosted web application.

---

## Features

### Core Accounting
- **Double-entry accounting** with a full Chart of Accounts
- **Journal Entries** for manual ledger adjustments
- **Tax Templates** with configurable tax rates
- **BAS Report** for Australian GST compliance

### Sales
- Sales Quotes → Sales Invoices workflow
- Sales Payments tracking
- Customer management
- Loyalty program and coupon code support
- Pricing rules

### Purchases
- Purchase Invoices and Purchase Payments
- Supplier management

### Margin Tracking
- **Cost Price** per item with auto-computed **Margin %**
- **Set Price from Margin** toggle — enter a target margin and the selling rate is calculated automatically
- Invoice edit view shows **Total Profit** and **Total Margin %** across all line items (not included in customer-facing print output)

### Projects
- **Projects** with status tracking (Planning / Active / On Hold / Completed), budgets, and customer linking
- **Tasks** and **Milestones** as child records on each project
- **Timesheets** with line-level time entries, billable hours, hourly rates, and computed totals
- Projects linkable directly on Sales and Purchase Invoices
- Per-project rollup of total billed, total expenses, and total hours

### Bank Feed (Plaid)
- Connect bank accounts via **Plaid Link** with a single click
- **Sync transactions** using Plaid's cursor-based incremental sync
- Transaction reconciliation with three actions per transaction:
  - **Match** — link to an existing Payment, Journal Entry, or Invoice
  - **Create JE** — auto-create a draft Journal Entry and open it for completion
  - **Ignore** — dismiss transactions that need no action (restorable)
- Connected accounts show current balance and last-synced time

### Inventory *(optional module)*
- Stock Movements, Shipments, and Purchase Receipts
- Stock Ledger and Stock Balance reports
- Serial numbers and batch tracking
- Auto-create shipment/purchase receipt on invoice submit

### Reports
- General Ledger
- Profit and Loss
- Balance Sheet
- Trial Balance
- BAS (Business Activity Statement)
- Stock Ledger / Stock Balance *(inventory module)*

### Setup & Customization
- Import Wizard for bulk data import
- Print Templates with a visual template builder
- Customize Form — add custom fields to any document type
- Number Series configuration

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 + TypeScript |
| Desktop | Electron |
| Web server | Node.js + Express |
| Database | SQLite (via `better-sqlite3`) |
| ORM | Fyo (built-in) |
| Bank feeds | Plaid API |

---

## Running as a Web Application

Iron Ledger can run as a self-hosted web server without Electron.

### Requirements

- Node.js v20+
- npm or yarn

### Install

```bash
git clone https://github.com/securelinksolutions/accounting-software.git
cd accounting-software
npm install
```

### Start the server

```bash
npm run start:server
```

The server starts on port `3000` by default. Set environment variables to configure:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DATA_DIR` | `./data` | Directory where `.books.db` files are stored |
| `PLAID_CLIENT_ID` | — | Plaid API client ID (required for bank feeds) |
| `PLAID_SECRET` | — | Plaid API secret (required for bank feeds) |
| `PLAID_ENV` | `sandbox` | Plaid environment: `sandbox`, `development`, or `production` |

Then open `http://localhost:3000` in your browser.

---

## Running as a Desktop App (Electron)

### Development mode

```bash
npm run dev
```

The Electron window opens immediately; the UI takes a few seconds to appear on first boot while the dev server compiles assets.

**Debug the main process:** Electron runs with `--inspect` on port `5858` in dev mode. Connect via `chrome://inspect`.

### Build an installer

```bash
npm run build
```

This produces a platform-specific installer in `dist_electron/bundled/`. To cross-compile (e.g. Linux from macOS):

```bash
npm run build -- --linux
```

---

## Bank Feed Setup

Bank feeds use the [Plaid API](https://plaid.com/docs/). To enable them:

1. Create a Plaid developer account at [dashboard.plaid.com](https://dashboard.plaid.com)
2. Obtain your `client_id` and `secret` from the Plaid dashboard
3. Set the environment variables before starting the server:

```bash
PLAID_CLIENT_ID=your_client_id \
PLAID_SECRET=your_secret \
PLAID_ENV=sandbox \
npm run start:server
```

4. Navigate to **Banking → Transactions** in the app and click **Connect Bank**

In `sandbox` mode you can use Plaid's test credentials to connect a demo bank account without real banking credentials.

---

## Project Structure

```
/
├── main/               # Electron main process
├── models/             # Fyo document models (business logic, formulas)
│   └── baseModels/     # Core models (Invoice, Item, Party, Project, BankAccount, …)
├── schemas/            # JSON schema definitions for all document types
├── server/             # Express web server (index.ts)
├── src/
│   ├── pages/          # Vue page components
│   │   ├── Banking/    # Bank feed reconciliation UI
│   │   ├── Dashboard/  # Charts and summary widgets
│   │   └── …
│   ├── components/     # Shared Vue components
│   └── utils/          # Sidebar config, routing helpers, filters
├── reports/            # Report definitions and exporters
└── translations/       # i18n translation files
```

---

## License

AGPL-3.0-only
