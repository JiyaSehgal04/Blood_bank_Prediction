from collections import defaultdict, deque
from datetime import date

class BloodUnit:
    def __init__(self, unit_no, blood_group, component, quantity_ml, expiry_date):
        self.unit_no = unit_no
        self.blood_group = blood_group
        self.component = component
        self.quantity_ml = quantity_ml
        self.expiry_date = expiry_date


class MultiListInventory:
    """
    Multi-List Structure:
    1. HashMap → blood_group → FIFO linked list (deque)
    2. Global expiry list
    """

    def __init__(self):
        self.bg_map = defaultdict(deque)     # BG → FIFO list
        self.expiry_list = []                # Global expiry tracking

    def add_unit(self, unit: BloodUnit):
        self.bg_map[unit.blood_group].append(unit)
        self.expiry_list.append(unit)

    def remove_expired(self, today: date):
        for bg in self.bg_map:
            self.bg_map[bg] = deque(
                [u for u in self.bg_map[bg] if u.expiry_date >= today]
            )
        self.expiry_list = [u for u in self.expiry_list if u.expiry_date >= today]

    def get_usable_stock(self, blood_group):
        return sum(u.quantity_ml for u in self.bg_map[blood_group])

    def allocate_fifo(self, blood_group, required_ml):
        """
        FIFO allocation
        """
        allocated = []
        while required_ml > 0 and self.bg_map[blood_group]:
            unit = self.bg_map[blood_group][0]

            if unit.quantity_ml <= required_ml:
                allocated.append(unit)
                required_ml -= unit.quantity_ml
                self.bg_map[blood_group].popleft()
            else:
                unit.quantity_ml -= required_ml
                required_ml = 0

        return allocated