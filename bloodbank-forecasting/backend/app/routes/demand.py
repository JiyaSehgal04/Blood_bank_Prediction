from fastapi import APIRouter

router = APIRouter(prefix="/demand", tags=["demand"])


@router.get("/")
def get_demand_summary():
    # Placeholder response; wire to real demand data later.
    return {"message": "Demand summary endpoint"}
