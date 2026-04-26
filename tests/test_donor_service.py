import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services import donor_service


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows
        self.filters = []
        self.inserted = None

    def select(self, *_args, **_kwargs):
        return self

    def insert(self, donor):
        self.inserted = donor
        return self

    def eq(self, field, value):
        self.filters.append((field, value))
        self.rows = [r for r in self.rows if r.get(field) == value]
        return self

    def order(self, *_args, **_kwargs):
        return self

    def execute(self):
        if self.inserted is not None:
            return SimpleNamespace(data=[self.inserted])
        return SimpleNamespace(data=self.rows)


class FakeClient:
    def __init__(self, rows=None):
        self.query = FakeQuery(rows or [])

    def table(self, _name):
        return self.query


def test_create_donor_starts_with_zero_total_donations(monkeypatch):
    fake = FakeClient()
    monkeypatch.setattr(donor_service, "get_client", lambda: fake)

    donor = donor_service.DonorService().create_donor({
        "name": "Riya Shah",
        "blood_group": "O Pos",
    })

    assert donor["total_donations"] == 0


def test_list_donors_searches_name_phone_and_email(monkeypatch):
    rows = [
        {"name": "Amit Rao", "phone": "111", "email": "amit@example.com", "blood_group": "O Pos", "is_eligible": True},
        {"name": "Meera Sen", "phone": "222333", "email": "meera@example.com", "blood_group": "A Pos", "is_eligible": True},
        {"name": "Kiran Das", "phone": "444", "email": "kiran@hospital.org", "blood_group": "O Pos", "is_eligible": False},
    ]
    monkeypatch.setattr(donor_service, "get_client", lambda: FakeClient(rows))

    by_name = donor_service.DonorService().list_donors(search="amit")
    by_phone = donor_service.DonorService().list_donors(search="222")
    by_email = donor_service.DonorService().list_donors(search="hospital")
    filtered = donor_service.DonorService().list_donors(
        blood_group="O Pos",
        eligible_only=True,
        search="amit",
    )

    assert [d["name"] for d in by_name] == ["Amit Rao"]
    assert [d["name"] for d in by_phone] == ["Meera Sen"]
    assert [d["name"] for d in by_email] == ["Kiran Das"]
    assert [d["name"] for d in filtered] == ["Amit Rao"]
