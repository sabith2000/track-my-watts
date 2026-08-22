# 🔋 TRACK MY WATTS — MASTER AI CONTEXT FILE

> **File:** `context.md`
> **Location:** Project Root (`/context.md`)
> **Purpose:** This is the **single source of truth** for any AI model (Claude, Gemini, or any other) working on this project. Read this file FIRST, in its entirety, before making any changes to the codebase.
> **Last Updated:** August 23, 2026
> **Current Version:** `v2.3.0`

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Technical Stack & Dependencies](#2-technical-stack--dependencies)
3. [Key File & Folder Architecture](#3-key-file--folder-architecture)
4. [Database Schema & Data Models](#4-database-schema--data-models)
5. [API Endpoints Reference](#5-api-endpoints-reference)
6. [System Workflows & Logic](#6-system-workflows--logic)
7. [State of the Application](#7-state-of-the-application)
8. [Critical AI Protocols](#8-critical-ai-protocols)

---

## 1. PROJECT OVERVIEW

### What Is Track My Watts?

**Track My Watts (TrackMyWatts by LMS)** is a personal, full-stack web application designed to digitize and analyze home electricity consumption in India. It is built for a single-user household that has **multiple electricity meters** (e.g., a main 3-phase meter, a dedicated AC meter, and a backup 1-phase meter).

### Core Purpose

The app solves a real-world problem: tracking exactly how many electricity units (kWh) each meter in the house consumes during each **bi-monthly billing cycle**, and then calculating the estimated electricity bill using India's **slab-based tariff system** (where the price-per-unit changes based on total consumption brackets).

### Target Audience

This is a **personal-use application** built by and for "LMS" (the developer's initials). It is deployed publicly on Render.com but is not designed for multi-user or multi-tenant use. There is **no authentication/login system** — the app is open-access.

### Live Application

- **URL:** [https://trackmywatts-v2.onrender.com/](https://trackmywatts-v2.onrender.com/)
- **Hosting:** Render.com (single Web Service — server serves the built client in production)

### Key Concepts

| Concept | Explanation |
|---|---|
| **Meter** | A physical electricity meter in the house. The app tracks 3 meters: one 3-phase general meter, one 1-phase dedicated AC meter, and one 1-phase backup general meter. |
| **Billing Cycle** | A time period (typically ~2 months) between government meter readings. Only ONE billing cycle can be "active" at a time. When the government officer comes to read the meter, the current cycle is "closed" and a new one automatically starts. |
| **Reading** | A manually entered meter reading value (the kWh number shown on the physical meter). The app calculates `unitsConsumedSincePrevious` by subtracting the last reading from the new one. |
| **Slab Rate Config** | The tiered pricing structure set by the electricity board. Different rates apply based on whether total consumption is ≤500 or >500 units, with sub-slabs within each tier. |
| **General Purpose Meter** | Meters that power general home circuits (lights, fans, appliances). The user can "switch" which general-purpose meter is active to strategically manage consumption and stay in lower tariff brackets. |
| **Consumption Target** | A user-configurable unit limit (default: 500 units) used by the dashboard to show progress and remaining units. |

---

## 2. TECHNICAL STACK & DEPENDENCIES

### Architecture

This is a **MERN Stack** monorepo application deployed as a single service:

```
[ React Frontend (Vite) ]  ←→  [ Express.js REST API ]  ←→  [ MongoDB Atlas (Cloud) ]
```

In production, the Express server serves the built React frontend as static files. In development, Vite runs its own dev server with a proxy to the Express backend.

---

### Frontend (`/client`)

| Technology | Version | Purpose |
|---|---|---|
| **React** | `19.1.0` | UI framework (functional components + hooks) |
| **Vite** | `6.3.5` | Build tool and dev server |
| **React Router DOM** | `7.6.1` | Client-side routing (BrowserRouter) |
| **TailwindCSS** | `3.4.17` | Utility-first CSS framework for all styling |
| **Recharts** | `2.15.4` | Chart library for analytics (bar charts, sparklines) |
| **Axios** | `1.9.0` | HTTP client for API communication |
| **React-Toastify** | `11.0.5` | Toast notification system. All pages use the centralized `notify` helper (`client/src/utils/toast.js`) instead of direct `toast` calls. The helper standardizes error extraction, severity durations, and optional deduplication via `toastId`. |
| **jsPDF** | `4.0.0` | PDF generation for billing cycle export |
| **jspdf-autotable** | `5.0.7` | Table plugin for jsPDF |
| **ExcelJS** | `4.4.0` | Excel (.xlsx) file generation for export |
| **file-saver** | `2.0.5` | Client-side file download helper |
| **vite-plugin-pwa** | `1.2.0` | Progressive Web App (PWA) support with Workbox service worker |
| **PostCSS** | `8.5.4` | CSS processing (required by TailwindCSS) |
| **Autoprefixer** | `10.4.21` | CSS vendor prefix automation |
| **ESLint** | `9.25.0` | Code linting |

**Google Fonts Used:**
- **Inter** (weights: 400, 500, 600, 700, 800) — Primary body font
- **Russo One** — Display/title font for the app name header
- **Birthstone** — Signature/cursive font for "By LMS" branding

**Google AdSense:**
- AdSense script is loaded in `index.html` with publisher ID `ca-pub-6009232915438218`

---

### Backend (`/server`)

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | v18.x+ | JavaScript runtime |
| **Express.js** | `4.19.2` | REST API framework |
| **Mongoose** | `8.4.1` | MongoDB ODM (Object Data Modeling) |
| **dotenv** | `16.4.5` | Environment variable management |
| **cors** | `2.8.5` | Cross-Origin Resource Sharing middleware |
| **nodemon** | `3.1.11` | Dev-only auto-restart on file changes |

---

### Database

- **MongoDB Atlas** — Cloud-hosted MongoDB database
- Connection string stored in `server/.env` as `MONGODB_URI`
- The server uses Mongoose to connect with detailed logging (censored URI, connection state events)
- The server **exits with code 1** if `MONGODB_URI` is missing or connection fails

---

### Root-Level Dev Tool

| Technology | Version | Purpose |
|---|---|---|
| **concurrently** | `10.0.3` | Runs both frontend and backend dev servers simultaneously with `npm run dev` |

---

### PWA Configuration

The app is a **Progressive Web App** configured in `client/vite.config.js`:
- **Register Type:** `autoUpdate` (service worker auto-updates in background)
- **Theme Color:** `#0f172a` (dark navy, matches the header)
- **Background Color:** `#0f172a` (splash screen)
- **Display:** `standalone` (appears like a native app)
- **Icons:** `pwa-192x192.png` and `pwa-512x512.png` (both with `any maskable` purpose)
- **Workbox Cache Limit:** 4MB (`maximumFileSizeToCacheInBytes`)
- **Cached Assets:** `**/*.{js,css,html,ico,png,svg}`

---

### Environment Variables

**`server/.env`** (NOT committed to git):
```
MONGODB_URI=<mongodb+srv connection string>
PORT=5001
```

**`client/.env`** (NOT committed to git):
```
VITE_API_BASE_URL=/api
```

**`client/vite.config.js`** (build-time injection):
```
VITE_APP_VERSION → read from client/package.json "version" field
```

---

## 3. KEY FILE & FOLDER ARCHITECTURE

```
track-my-watts/
├── context.md                    ← THIS FILE (Master AI Context)
├── README.md                     ← Public-facing project description
├── package.json                  ← Root: version 2.0.0, dev scripts, concurrently
├── package-lock.json
├── .gitignore
│
├── client/                       ← FRONTEND (React + Vite + TailwindCSS)
│   ├── .env                      ← VITE_API_BASE_URL=/api
│   ├── index.html                ← Entry HTML (fonts, AdSense, theme-color meta)
│   ├── package.json              ← Frontend dependencies, version 1.6.15
│   ├── vite.config.js            ← Vite config (PWA, proxy, version injection)
│   ├── tailwind.config.js        ← TailwindCSS config (Inter, Russo One, Birthstone fonts)
│   ├── postcss.config.js         ← PostCSS plugins (tailwindcss, autoprefixer)
│   ├── eslint.config.js          ← ESLint rules
│   │
│   ├── public/                   ← Static assets served as-is
│   │   ├── logo.png              ← App logo (favicon + header)
│   │   ├── pwa-192x192.png       ← PWA icon (small)
│   │   ├── pwa-512x512.png       ← PWA icon (large)
│   │   └── vite.svg              ← Default Vite asset (unused)
│   │
│   └── src/                      ← Application source code
│       ├── main.jsx              ← React entry point (BrowserRouter wraps App)
│       ├── App.jsx               ← Route definitions + ToastContainer
│       ├── App.css               ← Legacy Vite boilerplate CSS (mostly unused)
│       ├── index.css             ← Tailwind directives + Inter font base layer
│       │
│       ├── assets/               ← Bundled assets
│       │   └── react.svg         ← Default Vite asset (unused)
│       │
│       ├── components/           ← Reusable UI components
│       │   ├── Layout.jsx        ← App shell: Header (nav), <Outlet/>, Footer
│       │   ├── AddReadingForm.jsx ← Modal form for adding new meter readings
│       │   ├── MeterCard.jsx     ← Dashboard meter card with stats & sparkline
│       │   ├── Loader.jsx        ← Reusable loading spinner component
│       │   └── SlabRateManager.jsx ← Full CRUD UI for managing slab rate configs
│       │
│       ├── pages/                ← Route-level page components
│       │   ├── DashboardPage.jsx ← Main dashboard: cycle info, meter cards, total bill
│       │   ├── ReadingsPage.jsx  ← All readings with filters, pagination, CRUD, delete-all
│       │   ├── BillingCyclesPage.jsx ← Cycle history, start/close cycles, export (PDF/Excel)
│       │   ├── AnalyticsPage.jsx ← Charts: consumption & cost per cycle, meter breakdown
│       │   └── SettingsPage.jsx  ← Meter strategy, slab rate management, consumption target
│       │
│       ├── services/             ← API communication layer
│       │   └── api.js            ← Axios instance (baseURL from VITE_API_BASE_URL)
│       │
│       └── utils/                ← Utility/helper functions
│           └── exportHelper.js   ← PDF + Excel export logic for billing cycles
│
└── server/                       ← BACKEND (Node.js + Express + Mongoose)
    ├── .env                      ← MONGODB_URI, PORT (NOT in git)
    ├── package.json              ← Backend dependencies, version 1.6.15
    ├── server.js                 ← Express app setup, routes, static file serving
    │
    ├── config/
    │   └── db.js                 ← MongoDB connection with detailed logging
    │
    ├── models/                   ← Mongoose schemas & models
    │   ├── Meter.js              ← Meter schema (name, type, general-purpose flags)
    │   ├── Reading.js            ← Reading schema (meter ref, cycle ref, value, units consumed)
    │   ├── BillingCycle.js       ← Billing cycle schema (start/end dates, status)
    │   ├── SlabRateConfig.js     ← Slab rate schema (two slab arrays: ≤500 and >500)
    │   └── Settings.js           ← Singleton settings document (consumptionTarget)
    │
    ├── controllers/              ← Business logic for each resource
    │   ├── dashboardController.js   ← Aggregates data for dashboard summary
    │   ├── readingController.js     ← CRUD for readings + delete-all
    │   ├── billingCycleController.js ← Cycle lifecycle + export data generation
    │   ├── analyticsController.js   ← Aggregation pipelines for charts
    │   ├── meterController.js       ← CRUD for meters + set-active-general
    │   ├── slabRateController.js    ← CRUD for slab configs + activate
    │   └── settingsController.js    ← Get/update singleton settings
    │
    └── routes/                   ← Express route definitions
        ├── dashboardRoutes.js    ← GET /api/dashboard/summary
        ├── readingRoutes.js      ← CRUD /api/readings + delete-all-globally
        ├── billingCycleRoutes.js ← CRUD /api/billing-cycles + start/close/export
        ├── analyticsRoutes.js    ← GET /api/analytics/cycle-summary & meter-breakdown
        ├── meterRoutes.js        ← CRUD /api/meters + set-active-general
        ├── slabRateRoutes.js     ← CRUD /api/slabs + activate
        ├── systemRoutes.js       ← GET /api/system/status
        └── settingsRoutes.js     ← GET/PUT /api/settings
```

---

## 4. DATABASE SCHEMA & DATA MODELS

### 4.1 Meter (`Meter` model)

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | Yes (unique) | Human-readable name, e.g., "Main 3-Phase" |
| `meterType` | String (enum) | Yes | `'1-phase'` or `'3-phase'` |
| `isGeneralPurpose` | Boolean | Yes | `true` for meters powering general home circuits |
| `isCurrentlyActiveGeneral` | Boolean | No (default: false) | Only one general-purpose meter can be `true` at a time |
| `description` | String | No | Optional notes about the meter |
| `createdAt` | Date | Auto | Creation timestamp |

**Pre-save Middleware:** When a meter is saved with `isCurrentlyActiveGeneral: true`, all other general-purpose meters are automatically set to `false`.

---

### 4.2 Reading (`Reading` model)

| Field | Type | Required | Description |
|---|---|---|---|
| `meter` | ObjectId (ref: Meter) | Yes | Which meter this reading belongs to |
| `billingCycle` | ObjectId (ref: BillingCycle) | Yes | Which billing cycle this reading falls under |
| `date` | Date | Yes | When the reading was taken |
| `readingValue` | Number | Yes (≥0) | The raw kWh value from the meter display |
| `unitsConsumedSincePrevious` | Number | Yes (default: 0) | Calculated: `currentReadingValue - previousReadingValue` |
| `isEstimated` | Boolean | No (default: false) | Flag if the reading is an estimate |
| `notes` | String | No | Optional notes |
| `createdAt` / `updatedAt` | Date | Auto (timestamps) | Mongoose timestamps |

**Key Validation:** A new reading's `readingValue` must be ≥ the previous reading's value for the same meter (sequential enforcement).

---

### 4.3 BillingCycle (`BillingCycle` model)

| Field | Type | Required | Description |
|---|---|---|---|
| `startDate` | Date | Yes | When the cycle begins |
| `endDate` | Date | No (default: null) | Set when cycle is closed |
| `governmentCollectionDate` | Date | No (default: null) | The date the officer collected readings |
| `status` | String (enum) | Yes | `'active'` or `'closed'` |
| `notes` | String | No | Optional notes |
| `createdAt` / `updatedAt` | Date | Auto (timestamps) | Mongoose timestamps |

**Pre-save Middleware:** When creating a new `active` cycle, all other cycles are automatically set to `closed`.

---

### 4.4 SlabRateConfig (`SlabRateConfig` model)

| Field | Type | Required | Description |
|---|---|---|---|
| `configName` | String | Yes (unique) | e.g., "Rates from July 2024" |
| `effectiveDate` | Date | No (default: now) | When these rates became effective |
| `isCurrentlyActive` | Boolean | No (default: false) | Only one config should be active at a time |
| `slabsLessThanOrEqual500` | Array of Slab | Yes | Pricing tiers when total consumption ≤ 500 units |
| `slabsGreaterThan500` | Array of Slab | Yes | Pricing tiers when total consumption > 500 units |

**Slab Sub-document:**

| Field | Type | Description |
|---|---|---|
| `fromUnit` | Number | Inclusive start of range (e.g., 1, 101, 201) |
| `toUnit` | Number | Inclusive end of range (e.g., 100, 200; or 999999 for ∞) |
| `rate` | Number | Cost per kWh unit in this slab |

---

### 4.5 Setting (`Setting` model — Singleton)

| Field | Type | Required | Description |
|---|---|---|---|
| `key` | String | Yes (unique, default: `'user_settings'`) | Ensures only one settings document exists |
| `consumptionTarget` | Number | Yes (default: 500, min: 1) | The user's target unit consumption per billing cycle |
| `createdAt` / `updatedAt` | Date | Auto (timestamps) | Mongoose timestamps |

---

## 5. API ENDPOINTS REFERENCE

All endpoints are prefixed with `/api`. There is **no authentication** on any endpoint.

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/summary` | Returns full dashboard data: active cycle, meter summaries with consumption, cost, sparklines, tier info, previous cycle comparison |

### Readings
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/readings` | Get all readings (supports query params: `meterId`, `billingCycleId`, `startDate`, `endDate`, `limit`, `page`) |
| `POST` | `/api/readings` | Add a new reading (body: `meterId`, `date`, `readingValue`, optional `notes`, `isEstimated`) |
| `GET` | `/api/readings/latest/:meterId` | Get the latest reading for a specific meter (returns `readingValue`, `date`, `unitsConsumedSincePrevious`) |
| `GET` | `/api/readings/:id` | Get a single reading by ID |
| `PUT` | `/api/readings/:id` | Update a reading |
| `DELETE` | `/api/readings/:id` | Delete a single reading |
| `DELETE` | `/api/readings/action/delete-all-globally` | **DANGER:** Delete ALL readings from the database |

### Billing Cycles
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/billing-cycles` | Get all billing cycles (enriched with meter breakdown, consumption, and cost) |
| `POST` | `/api/billing-cycles/start` | Start a new billing cycle (body: `startDate`, optional `notes`) |
| `POST` | `/api/billing-cycles/close-current` | Close active cycle and start a new one (body: `governmentCollectionDate`, optional `notesForClosedCycle`, `notesForNewCycle`) |
| `GET` | `/api/billing-cycles/active` | Get the current active billing cycle |
| `GET` | `/api/billing-cycles/:id` | Get a single billing cycle by ID |
| `PUT` | `/api/billing-cycles/:id` | Update a billing cycle |
| `DELETE` | `/api/billing-cycles/:id` | Delete a billing cycle (only if it has 0 associated readings) |
| `GET` | `/api/billing-cycles/:id/export-data` | Get complete export data for a cycle (summary, raw readings, analytics) |

### Meters
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/meters` | Get all meters |
| `POST` | `/api/meters` | Add a new meter (body: `name`, `meterType`, `isGeneralPurpose`, optional `description`, `isCurrentlyActiveGeneral`) |
| `GET` | `/api/meters/:id` | Get a single meter by ID |
| `PUT` | `/api/meters/:id` | Update meter (rename: `name`, `description`) |
| `PUT` | `/api/meters/:id/set-active-general` | Set a general-purpose meter as the active one |

### Slab Rates
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/slabs` | Get all slab rate configurations |
| `POST` | `/api/slabs` | Create a new slab rate configuration |
| `GET` | `/api/slabs/active` | Get the currently active slab rate configuration |
| `PUT` | `/api/slabs/:id/activate` | Set a specific slab rate config as active (deactivates all others) |
| `DELETE` | `/api/slabs/:id` | Delete a slab rate config (cannot delete the active one) |

### Settings
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/settings` | Get user settings (creates defaults if none exist) |
| `PUT` | `/api/settings` | Update user settings (body: `consumptionTarget`) |

### System
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/system/status` | Check if the system has been initialized (has meters, slabs, cycles) |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/cycle-summary` | Get consumption and cost totals per billing cycle (for bar chart) |
| `GET` | `/api/analytics/meter-breakdown` | Get per-meter consumption grouped by cycle (for stacked bar chart) |

---

## 6. SYSTEM WORKFLOWS & LOGIC

### 6.1 Application Startup Flow

**Development Mode (`npm run dev` from root):**
1. `concurrently` launches two processes simultaneously:
   - `npm run dev --prefix server` → starts Express with `nodemon` on port 5001
   - `npm run dev --prefix client` → starts Vite dev server on port 5173
2. Vite's proxy forwards all `/api/*` requests to `http://localhost:5001`
3. Client reads `VITE_API_BASE_URL=/api` from `client/.env`

**Production Mode (`npm run build` then `npm start` from root):**
1. Build step installs dependencies for both server and client, then runs `vite build` in `/client`
2. `npm start` runs `node server.js` in `/server`
3. Express detects `NODE_ENV=production` and:
   - Serves `client/dist/` as static files
   - Catches all non-API routes with `app.get('*')` to serve `index.html` (SPA fallback)

---

### 6.2 Database Connection Flow (`server/config/db.js`)

1. Load `MONGODB_URI` from environment variables
2. If `MONGODB_URI` is missing → log `FATAL ERROR` → `process.exit(1)`
3. Log a censored version of the URI (password replaced with `****`)
4. Register Mongoose event listeners: `connecting`, `connected`, `error`, `disconnected`
5. Call `mongoose.connect(mongoURI)`
6. On failure → log `FATAL ERROR during initial mongoose.connect()` → `process.exit(1)`

---

### 6.3 Billing Cycle Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│                   BILLING CYCLE FLOW                     │
│                                                          │
│  1. User clicks "Start New Cycle"                        │
│     └─→ POST /api/billing-cycles/start                   │
│         └─→ Creates new cycle with status: 'active'      │
│             (Blocked if another active cycle exists)      │
│                                                          │
│  2. User adds readings during the cycle                  │
│     └─→ POST /api/readings                               │
│         └─→ Automatically linked to the active cycle     │
│                                                          │
│  3. Government officer collects readings                 │
│     └─→ User clicks "Close Current Cycle"                │
│         └─→ POST /api/billing-cycles/close-current       │
│             ├─→ Sets current cycle: status='closed',     │
│             │   endDate = governmentCollectionDate        │
│             └─→ Automatically creates NEW active cycle   │
│                 with startDate = governmentCollectionDate │
└─────────────────────────────────────────────────────────┘
```

**Key Rules:**
- Only ONE billing cycle can be `active` at any time
- A cycle cannot be closed if no active cycle exists
- The government collection date must be ≥ the cycle's start date
- Closing a cycle automatically starts a new one (no gap between cycles)

---

### 6.4 Reading Addition & Consumption Calculation

```
User submits: { meterId, date, readingValue }

1. Validate: meter exists, active billing cycle exists
2. Validate: reading date ≥ active cycle's start date
3. Find the LATEST previous reading for this meter (sorted by date DESC, createdAt DESC)
4. If previous reading exists:
   a. Validate: newReadingValue ≥ previousReadingValue (sequential enforcement)
   b. Calculate: unitsConsumed = newReadingValue - previousReadingValue
5. If NO previous reading (first ever for this meter):
   a. unitsConsumed = 0 (baseline reading)
6. Save Reading with computed unitsConsumedSincePrevious
```

**✅ Chain Recalculation:** Deleting a reading triggers an automatic recalculation of the consumption chain for all subsequent readings of that meter, preserving sequential integrity.

---

### 6.5 Slab-Based Cost Calculation

The cost calculation logic is implemented as a **helper function** duplicated in three controllers: `dashboardController.js`, `billingCycleController.js`, and `analyticsController.js`.

```
function calculateCostForConsumption(consumedUnits, slabConfig):

1. Determine which slab set to use:
   - If consumedUnits ≤ 500 → use slabConfig.slabsLessThanOrEqual500
   - If consumedUnits > 500 → use slabConfig.slabsGreaterThan500

2. Sort the applicable slabs by fromUnit (ascending)

3. For each slab (marginal/tiered calculation):
   a. If consumedUnits reaches into this slab:
      unitsInThisSlab = min(consumedUnits, slab.toUnit) - max(billedSoFar, slab.fromUnit - 1)
   b. cost += unitsInThisSlab × slab.rate
   c. Track total billed units
   d. Stop when all units are billed

4. Return totalCost (rounded to 2 decimal places)
```

**Important:** Cost is calculated **per meter independently**, then summed for the total bill. Each meter's consumption is priced against the full slab structure separately.

---

### 6.6 Dashboard Data Aggregation (`GET /api/dashboard/summary`)

The dashboard endpoint performs the most complex data aggregation:

1. Fetch active billing cycle, active slab config, all meters, and user settings
2. For EACH meter:
   - Fetch all readings in the current billing cycle
   - Sum `unitsConsumedSincePrevious` for total cycle consumption
   - Calculate cost using slab-based calculation
   - Compute: average daily consumption, units remaining to target, percentage to target
   - Generate **sparkline data** (last 7 days of daily consumption)
   - Determine **current tier info** (which slab rate the meter is currently in)
   - Fetch **previous cycle comparison** data
3. Sum all per-meter costs into `currentCycleTotalBill`
4. Return complete payload with all meter summaries

---

### 6.7 Analytics Data Pipeline

**Cycle Summary (`GET /api/analytics/cycle-summary`):**
- Uses MongoDB `$aggregate` pipeline to group readings by billing cycle AND meter
- Calculates cost for each meter's consumption independently
- Re-groups by cycle to get total consumption and total cost
- Returns data sorted by start date for chart rendering

**Meter Breakdown (`GET /api/analytics/meter-breakdown`):**
- Uses MongoDB `$aggregate` with `$lookup` joins to billingcycles and meters collections
- Groups by (cycle × meter) to get per-meter consumption per cycle
- Returns data formatted for Recharts stacked bar chart

---

### 6.8 Export System (PDF & Excel)

The export system lives entirely on the **client side** in `client/src/utils/exportHelper.js`:

1. Client calls `GET /api/billing-cycles/:id/export-data` to fetch the complete data package
2. The server returns: `{ cycle (with meterDetails), readings (populated), analytics }`
3. Client generates the file:

**Excel Export (`exportToExcel`):**
- 3 worksheets: Summary (meter breakdown + analytics), Raw Readings, Analytics
- Professional styling with indigo header rows, data borders, number formatting
- File naming: `TrackMyWatts_Report_{startDate}_{timestamp}.xlsx`

**PDF Export (`exportToPDF`):**
- Single-page bill statement with indigo header
- Summary section with billing period and amount due
- Auto-generated table with meter breakdown
- File naming: `TrackMyWatts_Bill_{startDate}_{timestamp}.pdf`

---

### 6.9 PWA Behavior

- The service worker is generated by `vite-plugin-pwa` using Workbox
- **Register Type:** `autoUpdate` — the service worker updates silently in the background
- **Cache Strategy:** Pre-caches all built assets (JS, CSS, HTML, images) up to 4MB each
- **Offline Capability:** The app shell loads offline from the cache, but API calls will fail without network connectivity (no offline data sync is implemented)
- **Install Prompt:** The app is installable as a standalone app on mobile (Android/iOS) and desktop

---

### 6.10 Frontend Routing

| Route | Component | Description |
|---|---|---|
| `/` | `DashboardPage` | Main dashboard (index route inside Layout). Redirects to `/welcome` if uninitialized. |
| `/welcome` | `WelcomeWizardPage`| 3-Step Wizard for first-time setup (Tariffs, Meters, Start Cycle). |
| `/readings` | `ReadingsPage` | Readings management |
| `/billing-cycles` | `BillingCyclesPage` | Billing cycle history and management |
| `/analytics` | `AnalyticsPage` | Data visualization charts |
| `/settings` | `SettingsPage` | Meter strategy, slab rates, consumption target |

All routes are nested inside `Layout` which provides the header navigation, footer, and `<Outlet/>` for page content (except `/welcome`). Route transitions use a `softFadeUp` animation.

---

### 6.11 Meter Strategy System

The Settings page allows the user to "switch" which general-purpose meter is active:

1. Display all meters categorized by type (General Purpose vs. Dedicated)
2. The currently active general meter is highlighted
3. User can click "Activate" on another general-purpose meter
4. This calls `PUT /api/meters/:id/set-active-general`
5. The Meter model's pre-save middleware automatically deactivates all other general meters
6. Purpose: Strategic switching between meters to manage which one approaches the 500-unit threshold

---

## 7. STATE OF THE APPLICATION

### Current Version: `v2.3.0`

### Version Tracking

The version number is maintained in **three** `package.json` files that must be kept in sync:
1. `/package.json` (root)
2. `/client/package.json`
3. `/server/package.json`

The version is displayed in the app footer via `import.meta.env.VITE_APP_VERSION`, injected at build time by Vite from `client/package.json`.

---

### Features Fully Deployed ✅

| Feature | Status | Notes |
|---|---|---|
| **Dashboard** with real-time meter stats | ✅ Complete | Includes sparklines, tier info, cost estimates, target tracking |
| **Multi-meter tracking** (3 meters) | ✅ Complete | 1 × 3-phase, 2 × 1-phase (one dedicated AC, one backup general) |
| **Readings CRUD** | ✅ Complete | Add, view (paginated), filter (by meter/date), delete individual, delete all |
| **Sequential reading validation** | ✅ Complete | New reading must be ≥ previous reading for the same meter |
| **Billing cycle management** | ✅ Complete | Start, close (auto-starts new), view history, delete (if empty) |
| **Slab rate management** | ✅ Complete | Full CRUD, dual slab sets (≤500 / >500), activate/deactivate |
| **Cost calculation engine** | ✅ Complete | Tiered/marginal slab calculation, per-meter independent billing |
| **Analytics page** | ✅ Complete | Consumption & cost bar chart + stacked meter breakdown chart |
| **PDF export** | ✅ Complete | Professional billing statement with jsPDF |
| **Excel export** | ✅ Complete | Multi-sheet workbook with ExcelJS |
| **PWA support** | ✅ Complete | Installable, auto-updating service worker, offline app shell |
| **Responsive design** | ✅ Complete | Mobile-first with TailwindCSS, mobile drawer nav |
| **Meter strategy switching** | ✅ Complete | Switch active meter from Settings |
| **Consumption target** | ✅ Complete | Configurable target with dashboard progress tracking |
| **Toast notifications** | ✅ Complete | react-toastify with centralized `notify` helper and custom UI |
| **Google AdSense** | ✅ Integrated | Script loaded in index.html |
| **Modern UI/UX** | ✅ Complete | Gradient header, animations, custom fonts, premium design |
| **Meter renaming & styling** | ✅ Complete | Edit meter names and select color themes (`colorTheme`) |
| **Snapshot Architecture** | ✅ Complete | Billing cycles freeze data (rates, units, costs) upon closure |
| **Input Sanitization** | ✅ Complete | APIs strictly sanitize strings and numbers before saving |
| **Onboarding Wizard** | ✅ Complete | 3-Step setup wizard (`/welcome`) for first-time installation |

---

### Known Limitations / Technical Debt ⚠️

| Item | Description |
|---|---|
| **No authentication** | App is completely open-access. Anyone with the URL can read/modify data. |
| **No offline data sync** | PWA caches the app shell, but API calls require network. No IndexedDB or background sync. |
| **Single-user design** | No concept of users, tenants, or permissions. All data is shared. |

---

### Recent Changelog (from Git History)

| Version | Key Changes |
|---|---|
| `v2.3.0` | **Notification Standardization & Visual Refresh**: Centralized `notify` helper, custom UI/UX styling matching Track My Watts design system, automatic Axios backend error extraction, consistent validation severity (`warn`), and PDF/Excel export feedback. |
| `v2.2.1` | **Export Button Polish**: Left-to-right color fill animation on hover, active press feedback, applied consistently to all PDF/Excel export buttons. |
| `v2.2.0` | **UI/UX Improvements**: Hero card redesign (cleaner title, split rate badge, footer export buttons), closed cycle card cleanup (compact finalized rate subtitle), Add Reading dialog enhancement (latest reading contextual hint), new `GET /api/readings/latest/:meterId` endpoint. |
| `v2.1.1` | **Documentation & URL Update**: Updated deployment URL to v2 and documented chain recalculation fix. |
| `v2.1.0` | **Analytics Overhaul**: Added lifetime hero statistics, Overall Meter Share pie chart, and Global Excel Export functionality. |
| `v2.0.1` | **Bug Fix & Polish**: Fixed sequential reading deletion chain-repair bug (used `createdAt` as chronological tie-breaker). Appended explicit Tariff Snapshots into both PDF and Excel cycle exports. Added `appliedSlabRateSnapshot` to UI dropdown history rows. |
| `v2.0.0` | **Major Architecture Update**: Implemented Snapshot architecture for billing cycles, centralized cost calculation, input sanitization, automated consumption chain repair, UI enhancements (Slab Viewer, Badges), System Initialization Wizard (`/welcome`), and Meter Color Themes. |
| `v1.6.15` | Updated package versions, fixed favicon path to use `logo.png` |
| `v1.6.14` | Overhauled Settings Page with tabbed interface, meter cards, improved UX |
| `v1.6.13` | Overhauled Readings Page with mobile cards, modal form, filter bar |
| `v1.6.12` | Refreshed Dashboard with modern gradients and custom SVG icons |
| `v1.6.11` | Updated header title/subtitle fonts and reduced header height |
| `v1.6.9` | Finalized PWA theme colors to dark navy (#0f172a) |
| `v1.6.9` | Finalized layout with sticky footer fix and pro styling |
| `v1.6.7` | Refined header/footer layout and animations |
| `v1.6.4` | Added global Loader component to BillingCyclesPage |
| `v1.6.3` | Complete Billing UI overhaul with responsive fixes |
| `v1.5.9` | Optimized dev workflow with Concurrently and Nodemon |
| `v1.5.8` | Finalized PDF alignment and Excel data mapping for production export |

---

## 8. CRITICAL AI PROTOCOLS

> **🚨 MANDATORY RULES FOR ALL AI MODELS WORKING ON THIS PROJECT 🚨**
>
> The following rules are **non-negotiable**. Every AI session (Claude, Gemini, ChatGPT, or any other model) that touches this codebase **MUST** follow these protocols without exception.

---

### Protocol 1: The Non-Coder Rule

**The user (LMS) is a non-coder who uses VS Code.** The user cannot write code, interpret pseudo-code, or fill in gaps.

**You MUST follow these rules for EVERY code change:**

1. **Always provide 100% complete, fully written-out code.** Never use shortcuts like:
   - ❌ `// ... existing code here ...`
   - ❌ `// ... rest of the component ...`
   - ❌ `// logic goes here`
   - ❌ `// same as before`
   - ❌ `/* unchanged */`

2. **Always include the exact file path** at the top of every code block, like:
   ```
   // File: client/src/pages/DashboardPage.jsx
   ```

3. **Always provide clear, step-by-step copy-paste instructions.** Tell the user:
   - Which file to open
   - Whether to replace the entire file or specific sections
   - If replacing specific sections, give clear markers (e.g., "Find this line... Replace with...")
   - What to save after changes

4. **Never assume the user can infer, debug, or improvise.** If something might go wrong, proactively warn about it and provide the fix.

5. **When modifying a file, provide the COMPLETE file content** unless the file is exceptionally long (200+ lines). For very long files, provide the complete modified section with enough surrounding context (at least 5 lines before and after) to locate the edit precisely.

---

### Protocol 2: The Auto-Update Rule

**Whenever a feature implementation, bug fix, or version update is successfully completed, the AI MUST proactively update this `context.md` file.**

Do NOT wait for the user to ask. After confirming that your changes work, immediately:

1. **Update the version number** in Section 7 if the version was bumped
2. **Add new features** to the "Features Fully Deployed" table
3. **Update the "Recent Changelog"** table with what was done
4. **Add any new files/folders** to the architecture tree in Section 3
5. **Add any new API endpoints** to the reference table in Section 5
6. **Add any new database fields** to the schema tables in Section 4
7. **Update known limitations** if any were fixed or new ones were introduced
8. **Update the "Last Updated" date** at the top of this file

---

### Protocol 3: Version Bump Procedure

When bumping the version number, you must update ALL THREE `package.json` files:

1. `/package.json` → `"version": "x.x.x"`
2. `/client/package.json` → `"version": "x.x.x"`
3. `/server/package.json` → `"version": "x.x.x"`

The version displayed in the app footer is read from `client/package.json` at build time.

---

### Protocol 4: File Modification Safety

Before modifying any file, always:

1. **State which file you are modifying** with the full path
2. **Explain what the change does** in plain English BEFORE showing the code
3. **Never delete existing functionality** unless explicitly asked to
4. **Preserve all existing comments** unless they are being updated for accuracy
5. **Test your logic mentally** — walk through the code path to ensure it works

---

### Protocol 5: Deployment Awareness

- The app is deployed on **Render.com** as a single Web Service
- The **build command** on Render is: `npm install --prefix server && npm install --prefix client --include=dev && npm run build --prefix client`
- The **start command** on Render is: `npm start --prefix server`
- Environment variables (`MONGODB_URI`, `PORT`) are set in the Render dashboard
- `NODE_ENV=production` is set on Render, which triggers static file serving in `server.js`
- After any deployment-affecting changes, explicitly tell the user whether a redeploy is needed

---

### Protocol 6: Technology Constraints

- **Frontend styling:** Use **TailwindCSS utility classes** (v3.4.x). Do not introduce a different CSS framework.
- **State management:** The app uses React's built-in `useState`/`useEffect` hooks. There is no Redux, Zustand, or Context API in use. Do not introduce a state management library without explicit user approval.
- **Backend:** The server uses **CommonJS** (`require`/`module.exports`), NOT ES Modules. The client uses **ES Modules** (`import`/`export`).
- **Database:** MongoDB Atlas via Mongoose. Do not suggest switching databases.
- **Fonts:** Inter (body), Russo One (title), Birthstone (signature). Loaded from Google Fonts in `index.html`.

---

### Protocol 7: Documentation Sync Rule

**Whenever you complete a feature, fix a bug, or bump the version, you MUST update BOTH `README.md` and `CHANGELOG.md` to reflect the changes.**

Do not wait for the user to ask. Keep the documentation perfectly synced with the codebase state.
- **`CHANGELOG.md`**: Add an entry under the new version number outlining what was fixed/added/changed.
- **`README.md`**: Update the "Key Features" or "Installation" sections if your changes impact the core application functionality or setup process.

---

*This document was generated by analyzing every file in the Track My Watts codebase. It is the authoritative reference for all AI-assisted development on this project.*
