from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_user, get_db
from app.models.resource import Resource
from app.models.user import User
from app.schemas.resource import ResourceOut
from app.services.user_service import normalize_role


router = APIRouter(tags=["Catalog"])


@router.get("/extra-centers", response_model=list[ResourceOut])
def list_extra_centers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Resource]:
    if normalize_role(current_user.role) == "student":
        return []
    return (
        db.query(Resource)
        .options(joinedload(Resource.block))
        .filter(Resource.is_extra_center.is_(True))
        .order_by(Resource.name.asc())
        .all()
    )


@router.get("/all-resources", response_model=list[ResourceOut])
def list_all_resources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Resource]:
    query = db.query(Resource).options(joinedload(Resource.block))
    if normalize_role(current_user.role) == "student" and current_user.block_id is not None:
        query = query.filter(Resource.block_id == current_user.block_id, Resource.is_extra_center.is_(False))
    return query.order_by(Resource.block_id.asc(), Resource.name.asc()).all()
