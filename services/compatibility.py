"""Donor selection rules per blood component.

Red cells, plasma and platelets do NOT share one compatibility table:

* WB/PRC (red cells) - recipient's antibodies matter: group O is the universal red-cell
  donor, AB the universal recipient, and Rh matters.
* FFP (plasma) - reversed: the donor's plasma antibodies matter, so AB plasma is the
  universal donor and O plasma can only go to O recipients. Rh is irrelevant.
* PLT (platelets) - ABO-identical preferred (same ABO, any Rh); otherwise only donors whose
  plasma is compatible with the recipient. Rh is flexible.

The lists are ordered by preference (identical group first) so that the scarce universal
donor groups are used last. These rules are a standard transfusion-medicine summary and
should be reviewed by the blood bank's medical officer before clinical use.
"""

from typing import Dict, List

RED_CELL_DONORS: Dict[str, List[str]] = {
    "O Neg":  ["O Neg"],
    "O Pos":  ["O Pos", "O Neg"],
    "A Neg":  ["A Neg", "O Neg"],
    "A Pos":  ["A Pos", "A Neg", "O Pos", "O Neg"],
    "B Neg":  ["B Neg", "O Neg"],
    "B Pos":  ["B Pos", "B Neg", "O Pos", "O Neg"],
    "AB Neg": ["AB Neg", "A Neg", "B Neg", "O Neg"],
    "AB Pos": ["AB Pos", "AB Neg", "A Pos", "A Neg", "B Pos", "B Neg", "O Pos", "O Neg"],
}

# Plasma-safe donor ABO types per recipient ABO type (identical first, universal AB last).
_PLASMA_ABO: Dict[str, List[str]] = {
    "O":  ["O", "A", "B", "AB"],
    "A":  ["A", "AB"],
    "B":  ["B", "AB"],
    "AB": ["AB"],
}


def _abo(group: str) -> str:
    return group.split()[0]


def _rh(group: str) -> str:
    return group.split()[1]


def _expand(abo_types: List[str], recipient: str) -> List[str]:
    """ABO types -> concrete groups, same Rh as the recipient first within each ABO type."""
    same_rh = _rh(recipient)
    other_rh = "Neg" if same_rh == "Pos" else "Pos"
    groups: List[str] = []
    for abo in abo_types:
        groups.append(f"{abo} {same_rh}")
        groups.append(f"{abo} {other_rh}")
    return groups


def donor_groups(recipient: str, component: str) -> List[str]:
    """Donor blood groups that may be issued to `recipient` for `component`, best first."""
    if recipient not in RED_CELL_DONORS:
        return [recipient]
    if component == "FFP":
        return _expand(_PLASMA_ABO[_abo(recipient)], recipient)
    if component == "PLT":
        return _expand(_PLASMA_ABO[_abo(recipient)], recipient)
    return list(RED_CELL_DONORS[recipient])
