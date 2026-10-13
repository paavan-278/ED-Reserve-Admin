from pydantic import BaseModel, ConfigDict


class InchargeItemOut(BaseModel):
    id: int
    name: str
    contact: str | None = None
    resource_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class InchargeGroupOut(BaseModel):
    block_name: str
    incharges: list[InchargeItemOut]
