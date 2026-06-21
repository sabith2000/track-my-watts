# Changelog

All notable changes to this project will be documented in this file.

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
