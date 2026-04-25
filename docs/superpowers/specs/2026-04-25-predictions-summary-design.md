# Predictions Summary Box — Design Spec
**Date:** 2026-04-25  
**Project:** Blood Bank Inventory & Distribution System  
**Feature:** AI-generated plain-English summary of ML prediction outputs  

---

## Overview

Add a summary card to the top of the Predictions page that automatically generates a plain-English narrative of the current ML forecast data using the Groq API. No user input required — fires on page load, renders the result above the existing charts.

---

## Architecture

```
Predictions page loads
       │
       ▼
GET /api/predictions/summary   (new Flask route)
       │
       ├── fetch predictions table (all blood groups + components)
       ├── fetch replenishment recommendations
       └── fetch active ML alerts
       │
       ▼
Build prompt → Groq API (llama-3.3-70b-versatile)
       │
       ▼
Return { "summary": "<text>" }
       │
       ▼
Render in summary card (Predictions.tsx)
```

---

## Backend

### New route: `GET /api/predictions/summary`
**File:** `api/routes/predictions.py`

**Logic:**
1. Fetch latest rows from `predictions` table — all components (WB/PRC, FFP, PLT), all 8 blood groups
2. Fetch replenishment plan from existing `replenishment_plan()` logic
3. Fetch active alerts where `is_resolved = false` and `severity IN ('HIGH', 'CRITICAL')`
4. Build a structured prompt (see Prompt Design below)
5. Call `groq.chat.completions.create()` — model `llama-3.3-70b-versatile`, max_tokens 300
6. Return `{ "summary": "<text>" }` with HTTP 200
7. On Groq error: return `{ "error": "Summary unavailable" }` with HTTP 503 — never 500

**Environment:**
- `GROQ_API_KEY` read from `.env` via `python-dotenv` (already loaded by `db/supabase_client.py` pattern)

### Prompt Design

```
System: You are a concise blood bank analyst assistant. Summarize data for clinical staff. 
        Be specific with numbers. Use plain English. No bullet points. 3-4 sentences max.

User: Here is today's blood bank forecast data:

DEMAND FORECAST (next 7 days):
{component} - {blood_group}: predicted {units} units/day, trend: {up/down/stable}
...

REPLENISHMENT ALERTS:
{blood_group} {component}: order {units} units (current stock: {n}, expiring: {n})
...

ACTIVE HIGH/CRITICAL ALERTS:
{alert_type} - {blood_group}: {message}
...

Summarize the key findings and any urgent actions needed.
```

---

## Frontend

### Summary Card — `Predictions.tsx`
**Position:** Top of page, above all existing charts and KPI cards.

**States:**
| State | UI |
|-------|----|
| Loading | Subtle pulse animation, "Generating summary..." label |
| Success | Card with dark header ("AI SUMMARY"), body text rendered |
| Error | Small inline error notice — does NOT block the rest of the page |

**Styling:** Matches existing design system — dark header bar (`bg-[#1b1c15]`), monospace label (`GROQ / llama-3.3-70b`), body text in `text-[#3f493f]` on `bg-white` card.

**API call:** Uses existing `api` axios instance from `src/lib/api.ts` — `api.get('/predictions/summary')`.

---

## Files Changed

| File | Type | Change |
|------|------|--------|
| `api/routes/predictions.py` | Edit | Add `GET /api/predictions/summary` route |
| `frontend/src/pages/Predictions.tsx` | Edit | Add summary card at top of page |
| `.env` | Done | `GROQ_API_KEY` already added |
| `requirements.txt` | Edit | Add `groq>=0.9.0` |

No new files. No schema changes. No new tables.

---

## Error Handling

- Groq API timeout or error → return 503 with `{ "error": "Summary unavailable" }` — frontend shows dismissible notice, rest of Predictions page still loads normally
- Empty predictions table (no data yet) → prompt still runs but notes "no forecast data available yet", Groq returns graceful message
- Missing `GROQ_API_KEY` → Flask logs warning, route returns 503 immediately without calling Groq

---

## Out of Scope

- No user input / chat capability
- No RAG / document retrieval
- No floating widget
- No streaming / typewriter effect
- No caching of summaries between sessions
