# Changelog

All notable changes to this project will be documented in this file.

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
