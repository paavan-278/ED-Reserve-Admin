from pydantic import BaseModel, ConfigDict

from app.schemas.block import BlockOut


class ResourceOut(BaseModel):
    id: int
    name: str
    type: str
    floor: str | None = None
    description: str | None = None
    block_id: int | None = None
    is_extra_center: bool
    block: BlockOut | None = None

    model_config = ConfigDict(from_attributes=True)
