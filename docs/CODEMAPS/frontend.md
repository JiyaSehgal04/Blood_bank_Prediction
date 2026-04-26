<!-- Generated: 2026-04-26 | Files scanned: 14 | Token estimate: ~750 -->

# Frontend Architecture

## Stack
React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + Recharts 3

## Route Tree

```
/                   → Landing (public)
/login              → Login (redirects to /dashboard if authenticated)
/dashboard          → Dashboard (protected)
/inventory          → Inventory (protected)
/manual-entry       → ManualEntry (protected)
/allocate           → Allocate (protected)
/donors             → Donors (protected)
/predictions        → Predictions (protected)
/alerts             → Alerts (protected)
/upload             → Upload (protected)
/*                  → Redirect to /
```

## Component Hierarchy

```
App
├── AuthProvider (context/AuthContext.tsx)
│   └── BrowserRouter
│       └── AppRoutes
│           ├── Landing (public page)
│           ├── Login (public page)
│           └── ProtectedRoute wrapper
│               └── Layout (components/Layout.tsx)
│                   ├── Sidebar (nav with 8 items)
│                   ├── Header (notifications + avatar)
│                   └── {children} — page content
├── Pages (src/pages/)
│   ├── Dashboard.tsx
│   ├── Inventory.tsx
│   ├── ManualEntry.tsx
│   ├── Allocate.tsx
│   ├── Donors.tsx
│   ├── Predictions.tsx
│   ├── Alerts.tsx
│   └── Upload.tsx
```

## State Management
- **Auth state**: React Context (`AuthContext`) + sessionStorage for token persistence
- **API client**: Axios instance (`lib/api.ts`) with request interceptor for auth token
- **Page state**: Local useState/useEffect per page (no global state library)

## Auth Flow
1. `POST /api/auth/login` with credentials
2. Token stored in `sessionStorage('auth_token')`
3. Axios interceptor attaches `Authorization: Bearer <token>` to all requests
4. Fallback: if API unreachable, accepts `admin/bloodbank2026` locally

## UI Theme
Dark sidebar (`#1b1c15`) with active state green (`#006d30`). Light content area (`#fbfaee`).
"SRM Global Hospitals" branding. Lucide icons + Material Symbols for nav.

## Upload Flow Changes (2026-04-26)
- Removed bulk-load button and `handleBulkLoad` handler from Upload.tsx
- `BusyAction` type narrowed to `'upload' | null` (was broader)
- `invalidateDataCaches()` now called unconditionally on successful upload (not guarded by `inserted > 0`)
- Effect: cache clears immediately, subsequent page navigation/tabs see fresh data

## Predictions Page Changes (2026-04-26)
- Aggregate total demand shows `—` placeholder when `loading === true` (fixes stale cache display during refresh)
- `handleRunPredictions()` now calls `setLoading(false)` in catch block (ensures UI recovers after failed runs)

## Key Dependencies

| Package | Purpose |
|---------|---------|
| react-router-dom v7 | Client-side routing |
| axios | HTTP client |
| recharts v3 | Charts (Dashboard, Predictions) |
| lucide-react | Icon set |
| tailwindcss v4 | Utility-first CSS |
