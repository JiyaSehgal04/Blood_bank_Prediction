from fastapi import APIRouter

from ..alerts import Alert, generate_low_stock_alerts

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("/", response_model=list[dict])
def list_alerts():
    # Placeholder inventory snapshot; replace with real DB-backed values.
    inventory = {"A+": 5, "O-": 3, "B+": 15}
    alerts = generate_low_stock_alerts(inventory)
    return [alert.__dict__ for alert in alerts]
