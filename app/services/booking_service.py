from datetime import date, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.resource import Resource
from app.models.user import User
from app.services.user_service import normalize_role


STUDENT_ALLOWED_DURATIONS = {15, 30, 45, 60}


def get_booking_conflict(
    db: Session,
    resource_id: int,
    booking_date,
    start_time,
    end_time,
) -> Booking | None:
    return (
        db.query(Booking)
        .filter(
            Booking.resource_id == resource_id,
            Booking.booking_date == booking_date,
            Booking.status.in_(["pending", "approved"]),
            Booking.start_time < end_time,
            Booking.end_time > start_time,
        )
        .first()
    )


def has_booking_conflict(
    db: Session,
    resource_id: int,
    booking_date,
    start_time,
    end_time,
) -> bool:
    return (
        get_booking_conflict(
            db,
            resource_id,
            booking_date,
            start_time,
            end_time,
        )
        is not None
    )


def get_student_booking_times(
    booking_date,
    duration_minutes: int,
):
    """
    Student selects only duration.

    Backend automatically starts the booking
    from the current time for today's booking.

    For future dates, booking starts at 09:00 AM.
    """

    if duration_minutes not in STUDENT_ALLOWED_DURATIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Students can only select 15, 30, "
                "45 minutes, or 1 hour."
            ),
        )

    now = datetime.now()

    if booking_date == date.today():
        start_datetime = now.replace(
            second=0,
            microsecond=0,
        )

        # Round to next 15-minute slot
        minute = start_datetime.minute
        rounded_minute = ((minute // 15) + 1) * 15

        if rounded_minute >= 60:
            start_datetime = start_datetime.replace(
                minute=0
            ) + timedelta(hours=1)
        else:
            start_datetime = start_datetime.replace(
                minute=rounded_minute
            )

    else:
        # Future date default start time
        start_datetime = datetime.combine(
            booking_date,
            datetime.strptime("09:00", "%H:%M").time(),
        )

    end_datetime = (
        start_datetime +
        timedelta(minutes=duration_minutes)
    )

    return (
        start_datetime.time(),
        end_datetime.time(),
    )


def validate_booking_request(
    payload,
    resource: Resource,
    current_user: User,
) -> None:

    role = normalize_role(current_user.role)

    if role not in {"admin", "teacher", "student"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid booking role",
        )

    # Resource/block validation
    if (
        payload.block_id is not None
        and resource.block_id != payload.block_id
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Selected resource does not belong "
                "to the selected block"
            ),
        )

    # -------------------------
    # STUDENT VALIDATION
    # -------------------------

    if role == "student":

        if current_user.block_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Students must be assigned to a block "
                    "before booking"
                ),
            )

        if resource.is_extra_center:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Students cannot book extra centers",
            )

        if resource.block_id != current_user.block_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Students can only book resources "
                    "from their assigned block"
                ),
            )

        if (
            payload.duration_minutes
            not in STUDENT_ALLOWED_DURATIONS
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Students must select 15, 30, "
                    "45 minutes, or 1 hour."
                ),
            )

    # -------------------------
    # DATE VALIDATION
    # -------------------------

    if payload.booking_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Past dates cannot be booked",
        )

    # -------------------------
    # TEACHER / ADMIN TIME
    # -------------------------

    if role in {"teacher", "admin"}:

        if (
            payload.start_time is None
            or payload.end_time is None
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Start time and end time "
                    "are required."
                ),
            )

        if payload.start_time >= payload.end_time:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="End time must be after start time",
            )

        if (
            payload.booking_date == date.today()
            and payload.start_time <= datetime.now().time()
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Start time must be in the future "
                    "for today's bookings"
                ),
            )


def create_booking(
    db: Session,
    payload,
    current_user: User,
) -> Booking:

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

    role = normalize_role(current_user.role)

    validate_booking_request(
        payload,
        resource,
        current_user,
    )

    # =====================================
    # STUDENT: BACKEND GENERATES TIME
    # =====================================

    if role == "student":

        start_time, end_time = (
            get_student_booking_times(
                payload.booking_date,
                payload.duration_minutes,
            )
        )

    # =====================================
    # TEACHER / ADMIN: USE SELECTED TIME
    # =====================================

    else:

        start_time = payload.start_time
        end_time = payload.end_time

    # Check booking conflict
    conflict = get_booking_conflict(
        db,
        payload.resource_id,
        payload.booking_date,
        start_time,
        end_time,
    )

    if conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": (
                    "Resource is not available "
                    "for the selected time slot"
                ),
                "conflict": {
                    "id": conflict.id,
                    "date": str(
                        conflict.booking_date
                    ),
                    "start_time": str(
                        conflict.start_time
                    ),
                    "end_time": str(
                        conflict.end_time
                    ),
                    "status": conflict.status,
                },
            },
        )

    try:

        booking = Booking(
            user_id=current_user.id,
            resource_id=resource.id,
            block_id=resource.block_id,

            name=(
                current_user.name
                or (
                    payload.name.strip()
                    if payload.name
                    else current_user.username
                )
            ),

            department=(
                current_user.department
                or (
                    payload.department.strip()
                    if payload.department
                    else None
                )
            ),

            booking_date=payload.booking_date,
            start_time=start_time,
            end_time=end_time,

            purpose=payload.purpose.strip(),
            status="pending",
        )

        db.add(booking)
        db.commit()
        db.refresh(booking)

        return booking

    except HTTPException:
        raise

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Booking request could not be saved",
        ) from exc