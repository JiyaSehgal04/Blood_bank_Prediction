from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("/", response_model=list[schemas.InventoryRead])
def list_inventory(db: Session = Depends(get_db)):
    return db.query(models.InventoryRecord).all()
