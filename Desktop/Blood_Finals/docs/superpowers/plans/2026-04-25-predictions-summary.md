# Predictions Summary Box Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-generated plain-English summary card to the top of the Predictions page, powered by the Groq API (llama-3.3-70b-versatile), that fires automatically on page load.

**Architecture:** A new Flask route `GET /api/predictions/summary` fetches live predictions, replenishment, and active alerts from Supabase, builds a structured prompt, calls Groq, and returns `{ "summary": "<text>" }`. The Predictions page calls this on mount and renders the result in a styled card above all existing content.

**Tech Stack:** Python `groq` SDK (backend), React + axios (frontend), existing Flask/Supabase patterns.

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `requirements.txt` | Edit | Add `groq>=0.9.0` |
| `api/routes/predictions.py` | Edit | Add `GET /api/predictions/summary` route at bottom |
| `frontend/src/pages/Predictions.tsx` | Edit | Add summary state + card above editorial header |

---

## Task 1: Install Groq dependency

**Files:**
- Modify: `requirements.txt`

- [ ] **Step 1: Add groq to requirements.txt**

Open `requirements.txt` and add this line at the end:
```
groq>=0.9.0
```

Final file should look like:
```
supabase>=2.0.0
python-dotenv>=1.0.0
flask>=3.0.0
flask-cors>=4.0.0
numbers-parser>=4.0.0
pandas>=2.0.0
openpyxl>=3.1.0
scikit-learn>=1.3.0
joblib>=1.3.0
xgboost>=2.0.0
groq>=0.9.0
```

- [ ] **Step 2: Install it**

```bash
pip3 install groq>=0.9.0
```

Expected output: `Successfully installed groq-x.x.x`

- [ ] **Step 3: Verify import works**

```bash
python3 -c "from groq import Groq; print('groq ok')"
```

Expected output: `groq ok`

- [ ] **Step 4: Commit**

```bash
git add requirements.txt
git commit -m "chore: add groq dependency for predictions summary"
```

---

## Task 2: Add backend route

**Files:**
- Modify: `api/routes/predictions.py` (add after line 108, after `_get_summary_count`)

- [ ] **Step 1: Write the failing test**

Create file `tests/test_predictions_summary.py`:

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from unittest.mock import patch, MagicMock
from api.app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def test_summary_returns_503_when_no_api_key(client):
    with patch.dict("os.environ", {"GROQ_API_KEY": ""}):
        res = client.get("/api/predictions/summary")
    assert res.status_code == 503
    assert b"error" in res.data


def test_summary_returns_200_with_mocked_groq(client):
    mock_choice = MagicMock()
    mock_choice.message.content = "O Pos demand is elevated this week."
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value \
        .order.return_value.limit.return_value.execute.return_value \
        = MagicMock(data=[{
            "blood_group": "O Pos", "component": "WB/PRC",
            "predicted_demand": 12.5, "confidence_low": 10.0,
            "confidence_high": 15.0, "model_used": "xgb"
        }])
    mock_supabase.table.return_value.select.return_value \
        .eq.return_value.in_.return_value.limit.return_value.execute.return_value \
        = MagicMock(data=[])

    with patch.dict("os.environ", {"GROQ_API_KEY": "test-key"}), \
         patch("api.routes.predictions.get_client", return_value=mock_supabase), \
         patch("api.routes.predictions.Groq") as mock_groq_cls:
        mock_groq_cls.return_value.chat.completions.create.return_value = mock_response
        res = client.get("/api/predictions/summary")

    assert res.status_code == 200
    data = res.get_json()
    assert "summary" in data
    assert len(data["summary"]) > 0


def test_summary_returns_503_on_groq_error(client):
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value \
        .order.return_value.limit.return_value.execute.return_value \
        = MagicMock(data=[])
    mock_supabase.table.return_value.select.return_value \
        .eq.return_value.in_.return_value.limit.return_value.execute.return_value \
        = MagicMock(data=[])

    with patch.dict("os.environ", {"GROQ_API_KEY": "test-key"}), \
         patch("api.routes.predictions.get_client", return_value=mock_supabase), \
         patch("api.routes.predictions.Groq", side_effect=Exception("network error")):
        res = client.get("/api/predictions/summary")

    assert res.status_code == 503
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/jiyasehgal/Desktop/Blood_Finals
python3 -m pytest tests/test_predictions_summary.py -v
```

Expected: `FAILED` — `ImportError` or `404` because the route doesn't exist yet.

- [ ] **Step 3: Add the route to predictions.py**

Open `api/routes/predictions.py`. Add these imports at the top of the file, after the existing imports:

```python
import os
from groq import Groq
```

Then add this route after the `_get_summary_count` function at the bottom of the file (after line 108):

```python
@predictions_bp.route("/predictions/summary", methods=["GET"])
def predictions_summary():
    """AI-generated plain-English summary of current forecast data."""
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        return jsonify({"error": "Summary unavailable"}), 503

    client_db = get_client()

    preds_result = (
        client_db.table("predictions")
        .select("blood_group,component,predicted_demand,confidence_low,confidence_high,model_used")
        .order("prediction_date", desc=True)
        .limit(100)
        .execute()
    )
    preds = preds_result.data or []

    replenishment = []
    try:
        from ml.scripts.predict import MLPredictor
        replenishment = MLPredictor().replenishment_plan()
    except Exception:
        pass

    alerts_result = (
        client_db.table("alerts")
        .select("severity,message,blood_group,component")
        .eq("is_resolved", False)
        .in_("severity", ["HIGH", "CRITICAL"])
        .limit(20)
        .execute()
    )
    alerts = alerts_result.data or []

    if not preds:
        prompt_data = "No forecast data is available yet. The system has not been trained."
    else:
        lines = ["DEMAND FORECAST (latest predictions):"]
        for p in preds[:24]:
            lines.append(
                f"  {p['component']} - {p['blood_group']}: "
                f"{p['predicted_demand']:.1f} units predicted "
                f"(confidence {p.get('confidence_low', 0):.1f}–{p.get('confidence_high', 0):.1f}, "
                f"model: {p.get('model_used', 'unknown')})"
            )
        if replenishment:
            lines.append("\nREPLENISHMENT RECOMMENDATIONS:")
            for r in replenishment[:10]:
                if r.get("recommended_order", 0) > 0:
                    lines.append(
                        f"  {r['blood_group']} {r['component']}: order {r['recommended_order']} units "
                        f"(stock: {r.get('current_stock', 0)}, "
                        f"expiring in 7d: {r.get('expiring_in_7d', 0)}, "
                        f"urgency: {r.get('urgency', 'UNKNOWN')})"
                    )
        if alerts:
            lines.append("\nACTIVE HIGH/CRITICAL ALERTS:")
            for a in alerts[:5]:
                lines.append(
                    f"  [{a['severity']}] "
                    f"{a.get('blood_group', '')} {a.get('component', '')}: "
                    f"{a.get('message', '')}"
                )
        prompt_data = "\n".join(lines)

    try:
        groq_client = Groq(api_key=api_key)
        response = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a concise blood bank analyst assistant. "
                        "Summarize the data for clinical staff. "
                        "Be specific with numbers. Use plain English. "
                        "No bullet points. 3-4 sentences maximum."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Here is today's blood bank forecast data:\n\n{prompt_data}\n\n"
                        "Summarize the key findings and any urgent actions needed."
                    ),
                },
            ],
            model="llama-3.3-70b-versatile",
            max_tokens=300,
        )
        summary = response.choices[0].message.content
        return jsonify({"summary": summary}), 200
    except Exception:
        return jsonify({"error": "Summary unavailable"}), 503
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python3 -m pytest tests/test_predictions_summary.py -v
```

Expected output:
```
PASSED tests/test_predictions_summary.py::test_summary_returns_503_when_no_api_key
PASSED tests/test_predictions_summary.py::test_summary_returns_200_with_mocked_groq
PASSED tests/test_predictions_summary.py::test_summary_returns_503_on_groq_error
3 passed
```

- [ ] **Step 5: Smoke-test the live endpoint**

Make sure Flask is running (`python3 api/app.py`), then:

```bash
curl -s http://localhost:5001/api/predictions/summary | python3 -m json.tool
```

Expected: JSON with a `"summary"` key containing a paragraph of text, or `"error": "Summary unavailable"` if Supabase is still paused.

- [ ] **Step 6: Commit**

```bash
git add api/routes/predictions.py tests/test_predictions_summary.py
git commit -m "feat: add GET /api/predictions/summary route using Groq"
```

---

## Task 3: Add summary card to Predictions page

**Files:**
- Modify: `frontend/src/pages/Predictions.tsx`

- [ ] **Step 1: Add summary state and fetch**

In `Predictions.tsx`, find this block (lines 44–51):

```tsx
export default function Predictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [replenishment, setReplenishment] = useState<ReplenishItem[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState('')
  const [activeComponent, setActiveComponent] = useState('WB/PRC')
```

Replace with:

```tsx
export default function Predictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [replenishment, setReplenishment] = useState<ReplenishItem[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState('')
  const [activeComponent, setActiveComponent] = useState('WB/PRC')
  const [summary, setSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState('')
```

- [ ] **Step 2: Add fetchSummary call inside useEffect**

Find this block (lines 52–63):

```tsx
  const loadData = () => {
    setLoading(true)
    Promise.all([
      api.get('/predictions'),
      api.get('/replenishment'),
    ]).then(([p, r]) => {
      setPredictions(p.data.predictions ?? [])
      setReplenishment(r.data.replenishment ?? [])
    }).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(loadData, [])
```

Replace with:

```tsx
  const loadData = () => {
    setLoading(true)
    Promise.all([
      api.get('/predictions'),
      api.get('/replenishment'),
    ]).then(([p, r]) => {
      setPredictions(p.data.predictions ?? [])
      setReplenishment(r.data.replenishment ?? [])
    }).catch(console.error).finally(() => setLoading(false))
  }

  const fetchSummary = () => {
    setSummaryLoading(true)
    setSummaryError('')
    api.get('/predictions/summary')
      .then((r) => setSummary(r.data.summary ?? ''))
      .catch(() => setSummaryError('AI summary unavailable'))
      .finally(() => setSummaryLoading(false))
  }

  useEffect(() => {
    loadData()
    fetchSummary()
  }, [])
```

- [ ] **Step 3: Add the summary card to the JSX**

Find this line in the return statement (line 110):

```tsx
  return (
    <div className="space-y-10">

      {/* ── Editorial header ── */}
```

Replace with:

```tsx
  return (
    <div className="space-y-10">

      {/* ── AI Summary ── */}
      <section className="bg-[#1b1c15] rounded p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#79db8d]">
            AI Summary · Groq / llama-3.3-70b
          </span>
          <span className="material-symbols-outlined text-[#79db8d] text-[18px]">auto_awesome</span>
        </div>
        {summaryLoading ? (
          <p className="text-white/40 text-sm animate-pulse font-mono">Generating summary…</p>
        ) : summaryError ? (
          <p className="text-[#ffdad6] text-xs font-mono">{summaryError}</p>
        ) : (
          <p className="text-white/80 text-sm leading-relaxed">{summary}</p>
        )}
      </section>

      {/* ── Editorial header ── */}
```

- [ ] **Step 4: Verify in browser**

Open `http://localhost:5174/predictions` (after logging in). You should see:
- A dark card at the very top of the page with a green "AI Summary · Groq / llama-3.3-70b" label
- A pulsing "Generating summary…" text that resolves to a paragraph once the Groq call completes
- If Supabase is paused: "AI summary unavailable" in red — the rest of the page still loads normally

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Predictions.tsx
git commit -m "feat: add AI predictions summary card to Predictions page"
```

---

## Self-Review Checklist

- [x] Spec coverage: all 4 files from spec covered (requirements.txt, predictions.py, Predictions.tsx, .env already done)
- [x] No TBDs or placeholders
- [x] Error paths: missing API key → 503, Groq exception → 503, frontend shows dismissible error without blocking page
- [x] Empty predictions table: handled — prompt notes "no forecast data", Groq returns graceful message
- [x] Type consistency: `summary` (string), `summaryLoading` (boolean), `summaryError` (string) — consistent across steps
- [x] No floating widget, no RAG, no streaming — scope matches spec
