import re

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserRegister(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    uid: str = Field(..., min_length=1, max_length=80)
    email: str = Field(..., max_length=160)
    department: str = Field(..., min_length=1, max_length=120)
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)
    role: str = "student"
    block_id: int | None = None

    @field_validator("role")
    @classmethod
    def normalize_role(cls, value: str) -> str:
        value = value.lower().strip()
        if value not in {"teacher", "student"}:
            raise ValueError("Role must be teacher or student")
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value):
            raise ValueError("Enter a valid email address")
        return value

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, value: str, info) -> str:
        if "password" in info.data and value != info.data["password"]:
            raise ValueError("Passwords do not match")
        return value


class UserOut(BaseModel):
    id: int
    username: str
    name: str | None = None
    uid: str | None = None
    email: str | None = None
    role: str
    department: str | None = None
    block_id: int | None = None

    model_config = ConfigDict(from_attributes=True)
