from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.incharge import Incharge
from app.models.user import User
from app.schemas.incharge import InchargeItemOut
from app.services.user_service import normalize_role


router = APIRouter(prefix="/incharges", tags=["Incharges"])


@router.get("", response_model=dict[str, list[InchargeItemOut]])
@router.get("/", response_model=dict[str, list[InchargeItemOut]])
def get_incharges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, list[InchargeItemOut]]:
    query = db.query(Incharge)
    if normalize_role(current_user.role) == "student" and current_user.block_id is not None:
        query = query.filter(Incharge.block_id == current_user.block_id)
    rows = query.order_by(Incharge.block_name.asc(), Incharge.resource_name.asc(), Incharge.name.asc()).all()
    grouped: dict[str, list[InchargeItemOut]] = {}

    for row in rows:
        block_key = row.block_name.replace(" Block", "")
        grouped.setdefault(block_key, []).append(
            InchargeItemOut(
                id=row.id,
                name=row.name,
                contact=row.contact,
                resource_name=row.resource_name,
            )
        )

    return grouped
