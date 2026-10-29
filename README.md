# DBuzzingBees — Cleaning Business Operations & Scheduling Platform

**DBuzzingBees** is a business management and scheduling application designed specifically for residential and commercial cleaning operations. It coordinates cleaning tasks, cleaner roster assignments, automated 6-month recurring scheduling, payroll calculation, client invoicing, and Excel spreadsheet imports/exports.

---

## Key Features

### 1. Operations Dashboard
- **Key Metrics At A Glance**: Track total cleaning tasks, completed vs. pending cleans, active cleaners, and weekly revenue/wage projections.
- **Urgent & Today's Schedule**: Real-time overview of tasks scheduled for today and upcoming visits.
- **Fast Navigation**: One-click jumps to the task list, calendar, cleaner roster, and payroll.

### 2. Task Management & Client Scheduling
- **Task List View**: Filterable by date, cleaner assignment, payment type, completion status, or search query.
- **Client Identification**: Displays client names and addresses clearly across all tables and cards.
- **Auto-Generated Client Numbers**: Unique identifiers (e.g., `CL-1042`) automatically assigned when adding new clients.
- **Task Duplication & Editing**: Duplicate existing cleanings or modify details on the fly.

### 3. Cleaning Calendar (With 6-Month Forward Projection)
- **Month, Week, & Day Views**: Client names appear directly on calendar blocks for fast dispatch recognition.
- **Automated Recurrence Engine**: Automatically schedules recurring cleans across a 6-month horizon for daily, weekly, bi-weekly/fortnightly, and monthly jobs.
- **Weekend Exclusion Rule**: Recurring client cleans never fall on Saturday or Sunday—weekends are reserved exclusively for special or one-off assignments.

### 4. Cleaner Roster & Job Breakdown
- **Cleaner Profiles**: Maintain cleaner contact details (phone, email) and custom hourly pay rates.
- **Workload Tracking**: View individual cleaner schedules, assigned clients, and job counts.

### 5. Pay & Invoicing (Weekly, Monthly & Annual)
- **Wage Calculation**: Automatically computes cleaner wages based on allocated cleaning hours and cleaner-specific pay rates.
- **Client Billing & Margins**: Calculates client charges and profit margins per job and aggregate period.
- **Flexible Summary Views**:
  - Weekly view with week selector
  - Monthly view
  - Multi-month or full-year summary options
- **Payment Status Tracking**: Toggle cleaner payment records (Paid vs. Unpaid) with persistent status history.
- **Clear Reference**: Job breakdowns display Client Name and Job Address.

### 6. Excel (.xlsx) Import & Export
- **Spreadsheet Integration**: Import tasks and cleaners directly from Excel spreadsheets (`.xlsx`).
- **Comprehensive Backups**: Export current task lists, cleaner rosters, and payroll breakdowns to standard Excel files.

### 7. Staff Users & Access Control
- **Role-Based Accounts**: Supports `admin`, `manager`, `supervisor`, and `staff` access levels.
- **Staff User Management**: Admins can add new team members, edit roles, update credentials, and toggle account status (`Active` / `Inactive`).
- **Inactivity Auto-Logout**: Unattended sessions automatically expire after 30 minutes of inactivity to protect client addresses and pricing data. Active user interactions automatically extend the timer.

### 8. Client Booking Confirmation System (Messenger, WhatsApp, SMS, Email)
- **Multi-Channel Dispatch**: Send formatted booking confirmations directly to clients via:
  - **WhatsApp**: Click-to-chat `https://wa.me/` link with pre-formatted message.
  - **Facebook Messenger**: `https://m.me/` direct messaging link or client page handle.
  - **SMS Text**: Native `sms:` URI launcher for phones and web SMS gateways.
  - **Formatted Email & Clipboard Copy**: 1-click clipboard copy or `mailto:` trigger.
- **Smart Contact Validation**: Automatically disables channels when contact information (phone, messenger handle) is missing, with clear warning notices and input hints.
- **Dynamic Message Templates**:
  - Auto-interpolates `{clientName}`, `{jobType}`, `{date}`, `{time}`, `{address}`, `{cleanerNames}`, `{duration}`, `{total}`, and special instructions or add-ons.
  - Includes standard confirmation wording, e.g., *"Please reply YES to confirm or message us if you need to reschedule."*
  - Pre-packaged templates: Standard Friendly, Formal Business, Short Reminder, and Date/Time Reschedule Notification.
  - Custom templates can be authored, saved, and reused across sessions.
- **Confirmation Status Tracking**:
  - Live status tracking per job: `Not Sent / Unconfirmed`, `Confirmation Sent`, `Client Confirmed`, `Needs Reschedule`, and `Declined`.
  - Manual status override dropdown for when clients confirm via phone or message.
  - Comprehensive audit trail (`confirmationLogs`): logs timestamp, channel used, recipient, and staff member who sent it.
- **Bulk Confirmation Dispatch**:
  - Select multiple upcoming jobs from the Task List or click **"Confirm Tomorrow"** on the Dashboard to confirm all scheduled clients in one unified batch workflow.
- **Privacy & Role Enforcement**:
  - Confirmation status and logs are stored securely with client records and respect client preferred channels.

### 9. Light & Dark Mode
- Full support for both light and dark color schemes, with quick-toggle in the top header and persistent user preference.

---

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Bundler & Dev Server**: Vite
- **Styling**: Tailwind CSS v4 (with custom `@custom-variant dark` support)
- **Icons**: Lucide React
- **Spreadsheets**: SheetJS (`xlsx`)
- **Storage**: Local browser storage with persistent state management and session isolation

---

## Getting Started

### Prerequisites

- Node.js (version 18 or later recommended)
- npm or bun

### Installation

1. Clone or open the project directory:
   ```bash
   cd dbuzzingbees
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`.

### Default Demo Credentials

You can sign in using either of the built-in staff accounts:

| Username | Password | Role |
| :--- | :--- | :--- |
| `admin` | `buzzbee123` | Administrator (Operations Manager) |
| `manager` | `buzzbee123` | Manager |

*You can create additional staff and user accounts anytime via the **Staff Users** modal in the top navigation bar.*

---

## Project Structure

```
├── public/                 # Static assets and icons
├── src/
│   ├── components/         # React UI views and modals
│   │   ├── BeeLogo.tsx              # Brand logo component
│   │   ├── CalendarView.tsx         # Month/Week/Day cleaning calendar
│   │   ├── CleanerManagementView.tsx # Cleaner roster & pay rates
│   │   ├── DashboardView.tsx        # High-level metrics & urgent schedule
│   │   ├── ImportExportModal.tsx    # Excel (.xlsx) file import & export
│   │   ├── LoginPage.tsx            # Staff authentication & login
│   │   ├── Navbar.tsx               # Header, session timer, navigation
│   │   ├── PayAndInvoiceView.tsx    # Weekly/monthly wage & invoice breakdown
│   │   ├── StaffUsersModal.tsx      # Staff user creation & administration
│   │   ├── TaskListView.tsx         # Task data table & search/filter
│   │   └── TaskModal.tsx            # Add/Edit task modal
│   ├── data/               # Seed data and defaults
│   ├── services/
│   │   ├── excelService.ts # Excel export & import parser
│   │   └── storage.ts      # LocalStorage & session management
│   ├── types/              # TypeScript interface definitions
│   ├── utils/              # Date formatters & recurring recurrence logic
│   ├── App.tsx             # Root application orchestrator
│   ├── index.css           # Tailwind CSS imports & theme definitions
│   └── main.tsx            # React application entry point
├── package.json            # Project dependencies and npm scripts
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite build configuration
```

---

## Available Scripts

- `npm run dev` — Starts the Vite dev server on `http://0.0.0.0:3000`.
- `npm run build` — Bundles the production application to the `/dist` directory.
- `npm run preview` — Locally preview the production build.
- `npm run lint` — Validates TypeScript types across the codebase with `tsc --noEmit`.

---

## License

Private and proprietary. Built for DBuzzingBees Cleaning Operations.
