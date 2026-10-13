from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_client, get_db
from app.models.booking import Booking
from app.models.user import User
from app.schemas.booking import (
    AvailabilityQuery,
    BookingCancel,
    BookingCreate,
    BookingCreateResponse,
    BookingDetailOut,
    BookingOut,
)
from app.schemas.user import UserCreate, UserOut
from app.services.booking_service import (
    create_booking as create_booking_service,
    get_booking_conflict,
    validate_booking_request,
)
from app.services.user_service import create_user, normalize_role


router = APIRouter(prefix="/client", tags=["Client"])


# =========================================================
# HELPER: STUDENT SLOT KO ACTUAL END TIME ME CONVERT KARO
# =========================================================

def prepare_booking_times(payload, current_user: User):
    """
    Teacher:
        Start Time + End Time

    Student:
        Start Time + Duration Slot
        Backend automatically End Time calculate karega
    """

    role = normalize_role(current_user.role)

    # -----------------------------------------------------
    # STUDENT
    # -----------------------------------------------------

    if role == "student":

        if payload.start_time is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Start time is required for students",
            )

        if payload.duration_minutes is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Please select a booking duration",
            )

        allowed_durations = {15, 30, 45, 60}

        if payload.duration_minutes not in allowed_durations:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Students can only select "
                    "15, 30, 45, or 60 minutes"
                ),
            )

        start_datetime = datetime.combine(
            payload.booking_date,
            payload.start_time,
        )

        end_datetime = (
            start_datetime
            + timedelta(minutes=payload.duration_minutes)
        )

        payload.end_time = end_datetime.time()

        return payload

    # -----------------------------------------------------
    # TEACHER / ADMIN
    # -----------------------------------------------------

    if payload.start_time is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Start time is required",
        )

    if payload.end_time is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="End time is required",
        )

    return payload


# =========================================================
# CHECK AVAILABILITY
# =========================================================

@router.post("/availability")
def check_availability(
    payload: AvailabilityQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_client),
) -> dict:

    from app.models.resource import Resource

    resource = (
        db.query(Resource)
        .filter(Resource.id == payload.resource_id)
        .first()
    )

    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found",
        )

    # Student ke liye duration se end time generate karo
    payload = prepare_booking_times(payload, current_user)

    # Role/block/date/time validation
    validate_booking_request(
        payload,
        resource,
        current_user,
    )

    conflict = get_booking_conflict(
        db,
        payload.resource_id,
        payload.booking_date,
        payload.start_time,
        payload.end_time,
    )

    if conflict:

        return {
            "available": False,
            "message": (
                "Resource is already booked "
                "for this time slot"
            ),
            "conflict": {
                "id": conflict.id,
                "date": str(conflict.booking_date),
                "start_time": str(conflict.start_time),
                "end_time": str(conflict.end_time),
                "status": conflict.status,
            },
        }

    return {
        "available": True,
        "message": "Resource is available for the selected time slot",
    }


# =========================================================
# CLIENT DASHBOARD
# =========================================================

@router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_client),
) -> dict[str, int]:

    base_query = (
        db.query(Booking)
        .filter(Booking.user_id == current_user.id)
    )

    today = date.today()

    stats = {
        "total": base_query.count(),

        "pending": (
            base_query
            .filter(Booking.status == "pending")
            .count()
        ),

        "approved": (
            base_query
            .filter(Booking.status == "approved")
            .count()
        ),

        "rejected": (
            base_query
            .filter(Booking.status == "rejected")
            .count()
        ),

        "upcoming": (
            base_query
            .filter(
                Booking.booking_date >= today,
                Booking.status.in_([
                    "pending",
                    "approved",
                ]),
            )
            .count()
        ),
    }

    return stats


# =========================================================
# CREATE BOOKING
# =========================================================

@router.post(
    "/bookings",
    response_model=BookingCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_booking(
    payload: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_client),
) -> BookingCreateResponse:

    # Student duration slot se end time automatically set
    payload = prepare_booking_times(
        payload,
        current_user,
    )

    booking = create_booking_service(
        db,
        payload,
        current_user,
    )

    return BookingCreateResponse(
        message="Booking request submitted successfully",
        booking=booking,
    )


# =========================================================
# TEACHER CREATE STUDENT
# =========================================================

@router.post(
    "/students",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
)
def teacher_create_student(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_client),
) -> User:

    if normalize_role(current_user.role) != "teacher":

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teachers can create students only",
        )

    if payload.role != "student":

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teachers can create students only",
        )

    payload.role = "student"

    return create_user(
        db,
        payload,
        current_user,
    )


# =========================================================
# VIEW OWN BOOKINGS
# =========================================================

@router.get(
    "/bookings",
    response_model=list[BookingDetailOut],
)
def view_own_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_client),
) -> list[Booking]:

    return (
        db.query(Booking)
        .options(
            joinedload(Booking.resource),
            joinedload(Booking.user),
        )
        .filter(
            Booking.user_id == current_user.id
        )
        .order_by(
            Booking.booking_date.desc(),
            Booking.start_time.desc(),
        )
        .all()
    )


# =========================================================
# CANCEL BOOKING
# =========================================================

@router.post(
    "/bookings/{booking_id}/cancel",
    response_model=BookingOut,
)
def cancel_booking(
    booking_id: int,
    payload: BookingCancel,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_client),
) -> Booking:

    booking = (
        db.query(Booking)
        .filter(
            and_(
                Booking.id == booking_id,
                Booking.user_id == current_user.id,
            )
        )
        .first()
    )

    if not booking:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    if booking.status == "cancelled":

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking is already cancelled",
        )

    booking.status = "cancelled"

    booking.cancellation_reason = payload.reason

    booking.decision_at = datetime.utcnow()

    db.commit()

    db.refresh(booking)

    return booking