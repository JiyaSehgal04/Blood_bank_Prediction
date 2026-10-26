"""Replenishment recommendations: what to order so the next 7 days are covered without waste.

order = demand_7d + safety_stock - usable_stock          (only when a forecast exists)

* demand_7d      forecast demand over the next 7 days
* safety_stock   half a week of demand, never below 2 units
* usable_stock   in-date stock minus the units that will expire within 7 days *and* will not
                 be consumed first (oldest units are issued first, so expiring units are only
                 lost to the extent expected demand cannot absorb them). The old formula
                 *added* the expiring units on top of stock that already counted them.

Without a forecast the plan falls back to a clearly labelled minimum-stock rule.
"""

import math
from typing import Dict, Iterable, List, Optional, Tuple

MIN_SAFETY_STOCK = 2
DEFAULT_MINIMUM_STOCK = 5

Key = Tuple[str, str]


def _urgency(stock: int, order: int) -> str:
    if stock == 0:
        return "HIGH"
    return "MEDIUM" if order > 3 else "LOW"


def plan_replenishment(
    forecasts: Dict[Key, Dict],
    stock: Dict[Key, int],
    expiring: Dict[Key, int],
    groups: Iterable[str],
    components: Iterable[str],
    minimum_stock: int = DEFAULT_MINIMUM_STOCK,
) -> List[Dict]:
    plan: List[Dict] = []
    for component in components:
        for group in groups:
            key = (group, component)
            on_hand = int(stock.get(key, 0))
            expiring_7d = int(expiring.get(key, 0))
            forecast: Optional[Dict] = forecasts.get(key)

            if forecast is None:
                order = max(0, minimum_stock - on_hand)
                if order == 0:
                    continue
                plan.append({
                    "blood_group": group, "component": component,
                    "current_stock": on_hand, "forecast_daily": None, "est_demand_7d": None,
                    "expiring_in_7d": expiring_7d, "safety_stock": minimum_stock,
                    "usable_stock": on_hand, "recommended_order": order,
                    "model_used": "minimum_stock", "basis": "minimum_stock",
                    "urgency": _urgency(on_hand, order),
                })
                continue

            demand_7d = int(round(forecast["est_7d"]))
            safety = max(MIN_SAFETY_STOCK, math.ceil(0.5 * demand_7d))
            lost_to_expiry = max(0, expiring_7d - demand_7d)
            usable = max(0, on_hand - lost_to_expiry)
            order = max(0, demand_7d + safety - usable)
            if order == 0 and on_hand >= safety:
                continue
            plan.append({
                "blood_group": group, "component": component,
                "current_stock": on_hand, "forecast_daily": forecast["daily"], "est_demand_7d": demand_7d,
                "expiring_in_7d": expiring_7d, "safety_stock": safety,
                "usable_stock": usable, "recommended_order": order,
                "model_used": forecast["model"], "basis": "forecast",
                "urgency": _urgency(on_hand, order),
            })

    rank = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    plan.sort(key=lambda r: rank[r["urgency"]])
    return plan
