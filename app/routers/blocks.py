from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_user, get_db
from app.models.block import Block
from app.models.resource import Resource
from app.models.user import User
from app.schemas.block import BlockOut
from app.schemas.resource import ResourceOut
from app.services.user_service import normalize_role


router = APIRouter(prefix="/blocks", tags=["Blocks"])


@router.get("", response_model=list[BlockOut])
@router.get("/", response_model=list[BlockOut])
def list_blocks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Block]:
    query = db.query(Block)
    if normalize_role(current_user.role) == "student" and current_user.block_id is not None:
        query = query.filter(Block.id == current_user.block_id)
    return query.order_by(Block.name.asc()).all()


@router.get("/{block_id}/resources", response_model=list[ResourceOut])
@router.get("/{block_id}/resources/", response_model=list[ResourceOut])
def list_block_resources(
    block_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Resource]:
    if normalize_role(current_user.role) == "student" and current_user.block_id != block_id:
        return []
    return (
        db.query(Resource)
        .options(joinedload(Resource.block))
        .filter(Resource.block_id == block_id, Resource.is_extra_center.is_(False))
        .order_by(Resource.name.asc())
        .all()
    )
