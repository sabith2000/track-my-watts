# Changelog

All notable changes to this project will be documented in this file.

## [2.3.0] - 2026-08-23
### Added
- **Centralized Notification Helper:** Created `client/src/utils/toast.js` exporting a `notify` helper that wraps React-Toastify with standardized severity durations (success 3s, error 4.5s, warn 4s, info 3.5s), automated Axios/backend error extraction, and optional `toastId`-based deduplication for rapid actions.
- **Export Success Feedback:** `BillingCyclesPage` now displays accurate success toasts upon PDF/Excel generation ("Statement PDF generated successfully." / "Worksheet Excel file generated successfully.").

### Changed
- **Toast Visual Refresh:** Replaced React-Toastify's default `colored` theme with a custom Track My Watts design system: emerald success tints, rose error tints, amber warning tints, indigo info tints, Inter font, rounded-xl cards, slim 2.5px gradient progress bars, and responsive mobile positioning below the 64px sticky navbar.
- **ToastContainer Configuration:** Updated global container to `theme="light"`, `limit={3}`, `newestOnTop={true}`, reduced default autoClose from 5000ms to 3500ms.
- **Error Message Standardization:** All catch blocks across `SettingsPage`, `SlabRateManager`, `DashboardPage`, `ReadingsPage`, `BillingCyclesPage`, `AnalyticsPage`, and `WelcomeWizardPage` now pass error objects to `notify.error()` for automatic backend message extraction instead of suppressing server validation details with hardcoded strings.
- **Validation Severity Fix:** Changed form validation notifications in `SlabRateManager` from `error` to `warn` severity for consistency with all other form validation across the application.
- **Migrated All Pages:** All 6 pages and 1 component now use the centralized `notify` helper instead of direct `toast.*` imports.

## [2.2.1] - 2026-06-21
### Changed
- **Export Button Interactions:** Added premium left-to-right color fill animation on hover (PDF → rose, Excel → emerald), smooth 280ms transition, and `scale(0.95)` active press feedback. Applied consistently across all export buttons (hero card footer, history row desktop/tablet, history row mobile). Idle state remains clean with subtle outlines.

## [2.2.0] - 2026-06-21
### Added
- **Latest Reading Hint:** The Add Reading dialog now shows the meter's most recent recorded reading (value + date) as contextual guidance when a meter is selected, helping prevent accidental lower readings.
- **New API Endpoint:** `GET /api/readings/latest/:meterId` — returns the latest reading for a given meter.

### Changed
- **Hero Card Redesign:** Renamed "Current Active Cycle" to "Current Billing Cycle" for cleaner wording. Split the long rate badge into a compact "Live Estimate" status pill and a separate metadata line showing the active rate configuration. Relocated export buttons (PDF/Excel) from the gradient header to a dedicated footer bar for better visual hierarchy.
- **Closed Cycle Cards:** Replaced the bulky inline "🔒 Finalized (Rate: ...)" badge with a clean subtitle row using a lock icon, dot separator, and subtle typography — keeping rate info visible without dominating the card.

## [2.1.1] - 2026-06-10
### Changed
- **Documentation & URL Update:** Updated documentation to reflect the new V2 Render deployment URL (`trackmywatts-v2.onrender.com`).
- **Documentation:** Updated Context to formally document that the reading chain recalculation bug has been fixed (deleting a reading now correctly triggers chain recalculation).

## [2.1.0] - 2026-06-10
### Added
- **Analytics Overhaul:** Expanded Analytics page with comprehensive lifetime hero statistics.
- **New Visualization:** Added an "Overall Meter Share" Pie Chart to track lifetime unit distribution.
- **Global Data Export:** Added an "Export Full Report" button on the Analytics page that generates a multi-sheet Excel workbook containing lifetime summary insights, full meter breakdown, and cycle history.

## [2.0.1] - 2026-06-10
### Fixed
- Fixed sequential reading deletion chain-repair bug (used `createdAt` as a chronological tie-breaker for identical dates).

### Added
- Explicit Tariff Snapshots appended into both PDF and Excel billing cycle exports.
- `appliedSlabRateSnapshot` details added to UI dropdown history rows in the Billing Cycles page.

## [2.0.0] - 2026-06-09
### Added
- **Major Architecture Update:** Implemented Snapshot architecture for billing cycles (locks in tariff rates at cycle closure).
- Centralized cost calculation engine.
- System Initialization Wizard (`/welcome`) for zero-state onboarding.
- Meter Color Themes for visual identification.
- Data export functionality (PDF and Excel).
- PWA Support with offline caching.

### Changed
- Refactored UI components (Slab Viewer, Badges).
- Stricter input sanitization across all API endpoints.
- Automated consumption chain repair logic.

## [1.6.15] - 2026-06-05
- *Legacy versions prior to 2.0.0 are documented in git history.*
