from datetime import date
from typing import Optional

from pydantic import BaseModel


class InventoryBase(BaseModel):
    blood_type: str
    date: date
    units_available: int


class InventoryCreate(InventoryBase):
    pass


class InventoryRead(InventoryBase):
    id: int

    class Config:
        from_attributes = True


class ForecastPoint(BaseModel):
    date: date
    forecast_units: int
    lower_ci: Optional[int] = None
    upper_ci: Optional[int] = None
