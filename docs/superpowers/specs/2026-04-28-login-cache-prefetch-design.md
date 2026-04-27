# Login-Time Cache Prefetch — Design Spec

**Date:** 2026-04-28  
**Status:** Approved

## Problem

Each page populates its sessionStorage cache lazily — only when the user navigates to it. First visit to any page incurs a full Supabase round-trip. With 8 distinct data sets across the app, a user clicking between pages repeatedly waits on each first load.

## Goal

Pre-warm all page caches immediately after login so every page loads instantly on first visit.

## Approach

Frontend-only. No backend changes. On successful login, fire all 8 API calls in parallel (fire-and-forget) and write results into sessionStorage using the exact cache keys each page already reads on mount.

## Architecture

### Files Changed

**`frontend/src/lib/sessionCache.ts`**  
Add `prefetchAllCaches(apiClient)`. Calls all 8 endpoints in parallel via `Promise.allSettled`. Each settled result is written to sessionStorage with `writeCache`. Failures are silently ignored — a failed prefetch leaves the cache key empty and the page falls back to its own loading state.

**`frontend/src/context/AuthContext.tsx`**  
After `sessionStorage.setItem('auth_token', ...)` and `setIsAuthenticated(true)`, call `prefetchAllCaches(api)` without `await`. Login flow completes immediately; cache warms in background.

### Endpoints and Cache Keys

| API call | Cache key written |
|---|---|
| `GET /api/dashboard/stats` | `blood_bank_dashboard_stats_cache`, `blood_bank_dashboard_stats_updated_at` |
| `GET /api/inventory` | `blood_bank_inventory_cache:` |
| `GET /api/donors` | `blood_bank_donors_cache:` |
| `GET /api/alerts` | `blood_bank_alerts_cache` |
| `GET /api/predictions` | `blood_bank_predictions_cache` |
| `GET /api/replenishment` | `blood_bank_replenishment_cache` |
| `GET /api/allocations` | `blood_bank_allocations_cache` |
| `GET /api/upload/history` | `blood_bank_upload_history_cache` |

Cache keys with a trailing `:` match the pattern used by pages that append query params (default = no filters, empty string suffix).

### Data Flow

1. User submits login credentials
2. `AuthContext.login()` calls `POST /api/auth/login`, stores token, sets `isAuthenticated = true`
3. `prefetchAllCaches(api)` is called — no await, fire-and-forget
4. User is redirected to Dashboard
5. In the background, 8 parallel `api.get()` calls resolve and write to sessionStorage
6. When user navigates to any page, `readCache()` on mount returns populated data — no spinner

### Error Handling

- `Promise.allSettled` guarantees all 8 calls run regardless of individual failures
- A network error or 5xx on any single endpoint does not affect login or other prefetches
- Failed calls produce no cache write; the page shows its own loading spinner as a fallback
- The timestamp keys (`*_updated_at`) are only written on success

## What Does Not Change

- Cache invalidation logic (`invalidateDataCaches`) — unchanged
- Per-page background polling intervals — unchanged
- sessionStorage scope (per-tab, cleared on tab close) — unchanged
- Backend — no changes

## Non-Goals

- localStorage persistence across tabs/refreshes — out of scope
- Backend server-side caching — out of scope
- A "warming" loading indicator on the login screen — out of scope
