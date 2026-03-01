from datetime import date, timedelta
from typing import List

from fastapi import APIRouter, Query

from ..forecasting import naive_forecast
from ..schemas import ForecastPoint

router = APIRouter(prefix="/forecasts", tags=["forecasts"])


@router.get("/", response_model=List[ForecastPoint])
def get_forecast(
    horizon_days: int = Query(7, ge=1, le=90),
) -> List[ForecastPoint]:
    # Placeholder: use dummy history. Replace with real data from DB.
    history = [10, 12, 11, 13, 9, 8, 10]
    start = date.today() + timedelta(days=1)
    return naive_forecast(history, start_date=start, horizon_days=horizon_days)
