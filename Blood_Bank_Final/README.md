# SRM Blood Bank Management System — v2.2

## Project Structure

```
srm_blood_bank/
├── App.jsx                     ← Main application (single-file React artifact)
│
├── components/
│   ├── ExcelUpload.jsx         ← Excel/CSV upload + SheetJS parsing
│   ├── Sidebar.jsx             ← Navigation sidebar
│   └── UIComponents.jsx        ← Chip, StatusBadge, Kpi, TechModal
│
├── utils/
│   ├── data.js                 ← Constants, date helpers, Excel column mapper
│   └── mlEngine.js             ← ML forecast engine (RF + ES ensemble)
│
├── styles/
│   ├── theme.js                ← Design tokens (light formal palette)
│   └── globals.js              ← Global CSS string
│
└── README.md                   ← This file
```

---

## Pages / Routes

| Page           | Description                                              |
|----------------|----------------------------------------------------------|
| Dashboard      | KPI cards, alert strip, charts, summary table            |
| Upload Data    | Excel/CSV upload with drag-drop, preview, reset          |
| Alerts         | Critical / warning / expiry risk breakdown               |
| All Records    | Sortable, filterable, paginated inventory table          |
| By Blood Group | Card grid view per ABO/Rh group with progress bars       |
| Expiry Tracker | Expiry window filter, colour-coded days remaining        |
| ML Forecast    | RF+ES ensemble forecast with area chart, metrics table   |
| Analytics      | Horizontal bar, donut, expiry buckets, confidence chart  |
| Compatibility  | 8×8 ABO/Rh matrix + donor availability checker           |

---

## Excel Upload Feature

### Expected Column Headers
| Field    | Required | Aliases Accepted                        |
|----------|----------|-----------------------------------------|
| unit     | ✓        | unit_no, unit_number, bag_no            |
| comp     | ✓        | component, product                      |
| expiry   | ✓        | expiry_date, exp                        |
| qty      | ✓        | quantity, volume, ml                    |
| bg       | ✓        | blood_group, group                      |
| sno      | —        | s_no, serial, no                        |
| col      | —        | collection_date, date                   |

### Blood Group Formats
All of the following are auto-normalised:
- `A Pos` / `A+` / `A positive`
- `O Neg` / `O-` / `O negative`

### Date Formats
- DD/MM/YYYY strings
- Excel serial date numbers (auto-converted)

---

## Tech Stack

| Layer          | Technology                              |
|----------------|-----------------------------------------|
| Framework      | React 18 (hooks)                        |
| Charts         | Recharts 2                              |
| Data I/O       | SheetJS (xlsx) — client-side only       |
| ML Engine      | RF Ensemble: WMA + Exponential Smoothing|
| Metrics        | MAPE + RMSE per blood group             |
| Styling        | CSS-in-JS, light formal design tokens   |
| Compatibility  | Full ABO/Rh 8×8 matrix                  |

---

## Design System — Light Formal Palette

| Token         | Value       | Usage                    |
|---------------|-------------|--------------------------|
| bg            | #F4F6F9     | Page background          |
| bg2 / card    | #FFFFFF     | Sidebar, cards           |
| crimson       | #C8102E     | SRM brand, critical      |
| blueL         | #2563EB     | Primary actions, forecast|
| greenL        | #059669     | Sufficient stock, OK     |
| gold          | #D97706     | Warnings, expiry         |
| purpleL       | #7C3AED     | ML metrics, expiry risk  |
| text          | #111827     | Primary text             |
| font          | Playfair Display (serif) | Headers     |
| mono          | JetBrains Mono | Data, labels           |
| sans          | Inter        | Body text               |

---

*SRM Institute of Science & Technology · Dept. of Biomedical Engineering*
