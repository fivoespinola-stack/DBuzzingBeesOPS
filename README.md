# DBuzzingBees — Cleaning Business Operations & Scheduling Platform

**DBuzzingBees** is a full-featured, production-ready operations and scheduling platform engineered specifically for residential and commercial cleaning businesses. It manages client schedules, cleaner roster assignments, automated 3-month recurring scheduling, payroll calculations, client invoicing, booking confirmations, and cloud data persistence via Google Cloud Firestore.

---

## Key Production Features

### 1. Database-Backed Cloud Persistence (Google Cloud Firestore)
- **Real-Time Cross-Device Sync**: All client schedules, cleaner profiles, task updates, invoices, payment records, and confirmation logs are securely stored in Google Cloud Firestore and sync live across all staff devices and browser sessions.
- **Offline & Low-Latency Caching**: Utilizes fast local state caching while continuously persisting changes to Firestore collections with secure rule enforcement.
- **Clean Slate Testing**: Start with an unpopulated, clean slate database to manually enter real client and cleaner records, verify calculations, and validate schedules without test data contamination.

### 2. Task Management & Schedule Pagination
- **Configurable Pagination**: Client schedules in the Task List default to a maximum of **20 records per page**, with options to toggle between **20, 50, or 100 items per page**, complete with range counters and interactive page controls.
- **Date Sorting**: Sort all upcoming and past schedules by:
  - **Newest to Oldest** (descending date)
  - **Oldest to Newest** (ascending date)
  - Quick-sortable by clicking the "Date & Time" table column header.
- **Comprehensive Filtering**: Filter by job status, cleaner assignment, payment terms (Cash vs. Invoice), date ranges, or search query.
- **Client & Job Identifiers**: Auto-generates unique client identifiers (e.g. `CL-1042`) and invoice references (e.g. `INV-2026-101`).

### 3. Recurring Scheduling Engine (Strict 3-Month Horizon)
- **3-Month Maximum Projection**: Recurring client schedules are strictly generated and projected within a **3-month period** across daily, weekly, fortnightly, every-3rd-week, and monthly intervals.
- **Weekend Exclusion Rule**: Recurring client appointments automatically avoid Saturday and Sunday, keeping weekends clear for specialized commercial or one-off bookings.
- **Interactive Schedule Preview**: Visual badge indicators display exact visit counts scheduled within the next 3 months directly inside the Task Modal.

### 4. Client Booking Confirmation System (WhatsApp, Messenger, SMS, Email)
- **Multi-Channel Dispatch**:
  - **WhatsApp**: Click-to-chat `wa.me` links with auto-formatted, branded messages.
  - **Facebook Messenger**: `m.me` deep links directly to client chat or company page.
  - **SMS Text**: Native `sms:` mobile links with 1-click clipboard message copy.
  - **Email**: Native `mailto:` links with prefilled subject and message body.
- **Channel Contact Validation**: Channels are automatically checked and disabled if contact info is missing, with inline hints and a quick-edit contact drawer right inside the modal.
- **Customizable Message Templates**:
  - Live editable message preview with template placeholders (`{{clientName}}`, `{{serviceType}}`, `{{date}}`, `{{startTime}}`, `{{address}}`, `{{cleaners}}`, `{{specialInstructions}}`, `{{businessPhone}}`).
  - Customizable default template saved for reuse.
- **Status & Audit Trail**:
  - Statuses: `Not Sent`, `Confirmation Sent`, `Confirmed`, `Needs Reschedule`.
  - Detailed audit logs track timestamp, channel used, recipient, and staff member who sent it.
- **Bulk Confirmation Dispatch**:
  - Select multiple upcoming jobs from the Task List or click "Confirm Tomorrow" to dispatch confirmations in batches.

### 5. Cleaner Management & Accurate Financial Calculations
- **Cleaner Profiles & Custom Rates**: Track active cleaners, individual hourly pay rates, and special weekly stipends/allowances.
- **Wages & Pay Calculation**:
  - Cleaner Wages = `(Allocated Task Hours × Cleaner Hourly Rate) ÷ Number of Cleaners`
  - Weekly stipend additions for active cleaners.
- **Client Invoicing**:
  - Hourly jobs: `Hours × Rate`
  - Fixed Price jobs: Flat fee billing
- **Commission & Profit Margins**:
  - Gross Profit / Margin = `Total Invoiced - Total Cleaner Wages`
  - Real-time margin percentages displayed across weekly, monthly, and annual views.
- **Payment Tracking**:
  - Toggle and track paid/unpaid status with persistent timestamp logs and payment notes.
  - Clear separation of **Cash** vs. **Invoice** payment terms.

### 6. Excel (.xlsx) Import & Export
- Import and export tasks, cleaner rosters, and weekly/monthly pay slips in standard Microsoft Excel (`.xlsx`) format.

### 7. Staff Authentication & Role Security
- **Pre-Configured Accounts**:
  - `admin` / `buzzbee123` (Administrator / Operations Manager)
  - `manager` / `buzzbee123` (Manager / Supervisor)
- **Security Inactivity Auto-Logout**: Unattended sessions automatically expire after 30 minutes of inactivity. Active keystrokes or mouse movement automatically extend the session.

---

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler & Server**: Vite + Node.js (Dev server on port 3000)
- **Database**: Google Cloud Firestore (provisioned database with real-time listeners and security rules)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Spreadsheets**: SheetJS (`xlsx`)

---

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000` in your web browser.

4. Sign in with:
   - Username: `admin`
   - Password: `buzzbee123`

---

## Production Readiness Verification

- ✅ Cloud Firestore persistent database deployed and connected
- ✅ 3-Month recurring scheduling enforced
- ✅ 20-item default pagination with 20/50/100 page size options
- ✅ Date sorting (Newest to Oldest, Oldest to Newest)
- ✅ Clean slate state: 0 initial test clients and 0 test cleaners for manual verification
- ✅ WhatsApp, Messenger, SMS, and Email confirmations with iframe-safe dispatches
- ✅ Real-time calculations across cleaner wages, client invoices, margins, and payment statuses
