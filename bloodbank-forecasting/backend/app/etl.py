import pandas as pd
from datetime import date
from sqlalchemy.orm import Session
from .models import InventoryUnit, DemandDaily
from .config import TODAY_OVERRIDE
from .inventory_engine import MultiListInventory, BloodUnit


def normalize_bg(bg: str) -> str:
    if pd.isna(bg):
        return None
    s = str(bg).strip()
    s = s.replace(" Pos", "+").replace(" Neg", "-").replace(" ", "")
    return s


def normalize_component(c: str) -> str:
    if pd.isna(c):
        return None
    s = str(c).strip().upper()
    if s in ["WB/PRC", "WBPRC", "WB-PRC"]:
        return "WB/PRC"
    if s in ["FFP"]:
        return "FFP"
    if s in ["PLT", "PLATELET"]:
        return "PLT"
    return s


def is_neg(x):
    if pd.isna(x):
        return False
    return str(x).strip().lower() in ["neg", "negative", "nr"]


def load_inventory_excel(db: Session, excel_path: str):
    df = pd.read_excel(excel_path)

    df["collection_date"] = pd.to_datetime(
        df["Collection Date"], dayfirst=True, errors="coerce"
    ).dt.date

    df["expiry_date"] = pd.to_datetime(
        df["Expiry Date"], dayfirst=True, errors="coerce"
    ).dt.date

    df["blood_group"] = df["Blood Group"].apply(normalize_bg)
    df["component"] = df["Component"].apply(normalize_component)

    today = date.fromisoformat(TODAY_OVERRIDE) if TODAY_OVERRIDE else date.today()

    df["usable"] = (
        df[["HIV 1&2", "HBsAg", "HCV", "Malaria", "VDRL"]]
        .apply(lambda r: all(is_neg(v) for v in r), axis=1)
        & df["expiry_date"].apply(lambda d: d is not None and d >= today)
    )

    # Clear previous data
    db.query(InventoryUnit).delete()
    db.query(DemandDaily).delete()
    db.commit()

    # Build MultiList engine
    engine = MultiListInventory()

    for _, r in df.iterrows():
        unit = InventoryUnit(
            unit_no=str(r["Unit No"]),
            segment_no=str(r.get("Segment No", "")),
            collection_date=r["collection_date"],
            collection_time=str(r.get("Collection Time", "")),
            component=r["component"],
            expiry_date=r["expiry_date"],
            quantity_ml=float(r["Quantity (ml)"] or 0),
            blood_group=r["blood_group"],
            hiv_1_2=str(r.get("HIV 1&2", "")),
            hbsag=str(r.get("HBsAg", "")),
            hcv=str(r.get("HCV", "")),
            malaria=str(r.get("Malaria", "")),
            vdrl=str(r.get("VDRL", "")),
            notes=str(r["Notes"]) if pd.notna(r.get("Notes")) else None,
            usable=bool(r["usable"]),
        )
        db.add(unit)

        if r["usable"]:
            engine.add_unit(
                BloodUnit(
                    unit_no=str(r["Unit No"]),
                    blood_group=r["blood_group"],
                    component=r["component"],
                    quantity_ml=float(r["Quantity (ml)"] or 0),
                    expiry_date=r["expiry_date"],
                )
            )

    db.commit()

    # Build proxy demand from collection
    proxy = (
        df.groupby(["collection_date", "blood_group", "component"])["Quantity (ml)"]
        .sum()
        .reset_index()
    )

    for _, r in proxy.iterrows():
        db.add(
            DemandDaily(
                day=r["collection_date"],
                blood_group=r["blood_group"],
                component=r["component"],
                demand_ml=float(r["Quantity (ml)"]),
                source="proxy_collection",
            )
        )

    db.commit()
