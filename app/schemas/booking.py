from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.resource import ResourceOut
from app.schemas.user import UserOut


STUDENT_ALLOWED_DURATIONS = {15, 30, 45, 60}


class BookingCreate(BaseModel):
    block_id: int | None = None
    resource_id: int

    name: str | None = None
    department: str | None = None

    booking_date: date

    # Teacher/Admin booking
    start_time: time | None = None
    end_time: time | None = None

    # Student booking
    duration_minutes: int | None = None

    purpose: str = Field(..., min_length=1, max_length=255)

    @field_validator("purpose")
    @classmethod
    def purpose_required(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Purpose is required")

        return value

    @field_validator("duration_minutes")
    @classmethod
    def validate_duration(cls, value: int | None) -> int | None:
        if value is None:
            return value

        if value not in STUDENT_ALLOWED_DURATIONS:
            raise ValueError(
                "Duration must be 15, 30, 45, or 60 minutes"
            )

        return value


class BookingCancel(BaseModel):
    reason: str


class BookingDecision(BaseModel):
    reason: str


class AvailabilityQuery(BaseModel):
    block_id: int | None = None
    resource_id: int
    booking_date: date

    # Teacher/Admin
    start_time: time | None = None
    end_time: time | None = None

    # Student
    duration_minutes: int | None = None

    @field_validator("duration_minutes")
    @classmethod
    def validate_duration(cls, value: int | None) -> int | None:
        if value is None:
            return value

        if value not in STUDENT_ALLOWED_DURATIONS:
            raise ValueError(
                "Duration must be 15, 30, 45, or 60 minutes"
            )

        return value


class BookingOut(BaseModel):
    id: int
    user_id: int
    resource_id: int
    block_id: int | None = None

    booking_date: date
    start_time: time
    end_time: time

    status: str

    name: str | None = None
    department: str | None = None
    purpose: str | None = None

    rejection_reason: str | None = None
    cancellation_reason: str | None = None

    created_at: datetime | None = None
    updated_at: datetime | None = None
    decision_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class BookingCreateResponse(BaseModel):
    message: str
    booking: BookingOut


class BookingDetailOut(BookingOut):
    user: UserOut
    resource: ResourceOut