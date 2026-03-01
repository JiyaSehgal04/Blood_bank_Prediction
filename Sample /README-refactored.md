# SRM Blood Bank — Refactored (light theme + structure)

This is the refactored version of `srm_blood_bank.jsx` with:

- **Light theme** — `theme.js` defines a light palette (off-white background, white cards, dark text, subtle borders).
- **Separate charts** — Each chart lives in `charts/`:
  - `UnitsByBloodGroupBarChart.jsx`
  - `ComponentPieChart.jsx`
  - `VolumeDistributionBarChart.jsx`
  - `DemandForecastAreaChart.jsx`
  - `ExpiryRiskBucketsChart.jsx`
  - `MlConfidenceMapeChart.jsx`
  - `HorizontalUnitsBarChart.jsx`
  - `VolumeByComponentPieChart.jsx`
- **Reusable components** — `components/`: `Chip.jsx`, `StatusBadge.jsx`, `Kpi.jsx`, `TechModal.jsx`.
- **Page components** — `pages/`: `Dashboard.jsx`, `Alerts.jsx`, `Inventory.jsx`, `BloodGroups.jsx`, `Expiry.jsx`, `Forecast.jsx`, `Analytics.jsx`, `Compatibility.jsx`.
- **Shared data & ML** — `data.js` (RAW, ALL_GROUPS, COMPAT, TODAY, parseDMY, daysTo), `mlEngine.js` (buildForecast, expSmoothing, wma, rfEnsemble).

## How to run

Use the refactored app as the root component:

- In Vite/React: set the entry to render `App.refactored.jsx` (e.g. in `main.jsx`: `import App from './App.refactored.jsx'`), or
- Rename `App.refactored.jsx` to `App.jsx` and keep your existing entry that imports `App`.

Original single-file app remains at `srm_blood_bank.jsx`.
