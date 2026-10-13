from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_admin, get_db
from app.core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    verify_password,
)
from app.models.booking import Booking
from app.models.resource import Resource
from app.models.user import User
from app.schemas.auth import LoginRequest, Token
from app.schemas.booking import BookingDecision, BookingDetailOut, BookingOut
from app.schemas.user import UserCreate, UserOut
from app.services.user_service import (
    create_user,
    find_user_by_identifier,
    normalize_role,
)


router = APIRouter(prefix="/admin", tags=["Admin"])


# =========================================================
# LOGIN
# =========================================================

@router.post("/login", response_model=Token)
def admin_login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> Token:

    admin = find_user_by_identifier(
        db,
        payload.username,
    )

    if (
        not admin
        or normalize_role(admin.role) != "admin"
        or not verify_password(
            payload.password,
            admin.password,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
        )

    access_token = create_access_token(
        data={
            "sub": admin.username,
            "role": normalize_role(admin.role),
        },
        expires_delta=timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        ),
    )

    return Token(
        access_token=access_token,
        user=admin,
    )


# =========================================================
# ADMIN BLOCK PERMISSION
# =========================================================

def ensure_admin_block(
    admin: User,
    booking: Booking,
) -> None:
    """
    Only the admin assigned to the booking's block
    can approve or reject that booking.
    """

    # Admin must have a block assigned
    if admin.block_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin is not assigned to any block",
        )

    # Booking must belong to a block
    if booking.block_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This booking is not assigned to a block",
        )

    # Admin can only manage bookings from own block
    if admin.block_id != booking.block_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage bookings from your assigned block",
        )


# =========================================================
# SAFE BOOKING SERIALIZER
# =========================================================

def serialize_booking(booking: Booking) -> dict:

    user = getattr(
        booking,
        "user",
        None,
    )

    resource = getattr(
        booking,
        "resource",
        None,
    )

    block = getattr(
        booking,
        "block",
        None,
    )

    # If block is available through resource
    if block is None and resource is not None:
        block = getattr(
            resource,
            "block",
            None,
        )

    return {
        "id": getattr(
            booking,
            "id",
            None,
        ),

        "name": getattr(
            booking,
            "name",
            None,
        ),

        "department": getattr(
            booking,
            "department",
            None,
        ),

        "booking_date": (
            booking.booking_date.isoformat()
            if getattr(
                booking,
                "booking_date",
                None,
            )
            else None
        ),

        "start_time": (
            booking.start_time.isoformat()
            if getattr(
                booking,
                "start_time",
                None,
            )
            else None
        ),

        "end_time": (
            booking.end_time.isoformat()
            if getattr(
                booking,
                "end_time",
                None,
            )
            else None
        ),

        "purpose": getattr(
            booking,
            "purpose",
            None,
        ),

        "status": getattr(
            booking,
            "status",
            "pending",
        ),

        "created_at": (
            booking.created_at.isoformat()
            if getattr(
                booking,
                "created_at",
                None,
            )
            else None
        ),

        "decision_at": (
            booking.decision_at.isoformat()
            if getattr(
                booking,
                "decision_at",
                None,
            )
            else None
        ),

        "rejection_reason": getattr(
            booking,
            "rejection_reason",
            None,
        ),

        "block_id": getattr(
            booking,
            "block_id",
            None,
        ),

        "resource_id": getattr(
            booking,
            "resource_id",
            None,
        ),

        "user": (
            {
                "id": getattr(
                    user,
                    "id",
                    None,
                ),

                "name": getattr(
                    user,
                    "name",
                    None,
                ),

                "username": getattr(
                    user,
                    "username",
                    None,
                ),

                "uid": getattr(
                    user,
                    "uid",
                    None,
                ),

                "email": getattr(
                    user,
                    "email",
                    None,
                ),

                "department": getattr(
                    user,
                    "department",
                    None,
                ),

                "role": normalize_role(
                    getattr(
                        user,
                        "role",
                        "student",
                    )
                ),
            }
            if user
            else None
        ),

        "resource": (
            {
                "id": getattr(
                    resource,
                    "id",
                    None,
                ),

                "name": getattr(
                    resource,
                    "name",
                    None,
                ),

                "floor": getattr(
                    resource,
                    "floor",
                    None,
                ),

                "is_extra_center": getattr(
                    resource,
                    "is_extra_center",
                    False,
                ),

                "block": (
                    {
                        "id": getattr(
                            block,
                            "id",
                            None,
                        ),

                        "name": getattr(
                            block,
                            "name",
                            None,
                        ),
                    }
                    if block
                    else None
                ),
            }
            if resource
            else None
        ),
    }


# =========================================================
# ADMIN DASHBOARD
# =========================================================

@router.get("/dashboard", response_model=dict)
def admin_dashboard(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> dict:

    try:

        today = date.today()

        # -----------------------------
        # USERS
        # -----------------------------

        users = (
            db.query(User)
            .order_by(User.id.asc())
            .all()
        )

        total_users = len(users)

        total_students = 0
        total_teachers = 0

        for item in users:

            user_role = normalize_role(
                getattr(
                    item,
                    "role",
                    "",
                )
            )

            if user_role == "student":
                total_students += 1

            elif user_role == "teacher":
                total_teachers += 1

        # -----------------------------
        # GLOBAL BOOKING COUNTS
        # -----------------------------

        total_bookings = (
            db.query(Booking)
            .count()
        )

        pending_count = (
            db.query(Booking)
            .filter(
                Booking.status == "pending"
            )
            .count()
        )

        approved_count = (
            db.query(Booking)
            .filter(
                Booking.status == "approved"
            )
            .count()
        )

        rejected_count = (
            db.query(Booking)
            .filter(
                Booking.status == "rejected"
            )
            .count()
        )

        today_count = (
            db.query(Booking)
            .filter(
                Booking.booking_date == today
            )
            .count()
        )

        upcoming_count = (
            db.query(Booking)
            .filter(
                Booking.booking_date >= today
            )
            .filter(
                Booking.status.in_(
                    ["pending", "approved"]
                )
            )
            .count()
        )

        # -----------------------------
        # RECENT BOOKINGS
        # GLOBAL
        # -----------------------------

        recent_bookings = (
            db.query(Booking)
            .options(
                joinedload(
                    Booking.resource
                ).joinedload(
                    Resource.block
                ),
                joinedload(
                    Booking.user
                ),
            )
            .order_by(
                Booking.created_at.desc()
            )
            .limit(8)
            .all()
        )

        recent_data = [
            serialize_booking(booking)
            for booking in recent_bookings
        ]

        return {
            "stats": {
                "total_users": total_users,
                "total_students": total_students,
                "total_teachers": total_teachers,
                "total_bookings": total_bookings,
                "pending": pending_count,
                "approved": approved_count,
                "rejected": rejected_count,
                "today": today_count,
                "upcoming": upcoming_count,
            },

            "recent": recent_data,
        }

    except Exception as error:

        print(
            "ADMIN DASHBOARD ERROR:",
            repr(error),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Dashboard could not be loaded: "
                f"{str(error)}"
            ),
        )


# =========================================================
# USERS
# =========================================================

@router.get(
    "/users",
    response_model=list[UserOut],
)
def list_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> list[User]:

    return (
        db.query(User)
        .order_by(
            User.role.asc(),
            User.username.asc(),
        )
        .all()
    )


# =========================================================
# CREATE USER
# =========================================================

@router.post(
    "/users",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
)
def admin_create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> User:

    return create_user(
        db,
        payload,
        current_admin,
    )


# =========================================================
# DELETE USER
# =========================================================

@router.delete(
    "/users/{user_id}",
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):

    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    # Admin cannot delete himself
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own admin account",
        )

    try:

        db.delete(user)

        db.commit()

        return {
            "message": "User deleted successfully",
        }

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "Could not delete user. "
                "This user may have existing bookings. "
                f"Error: {str(error)}"
            ),
        )


# =========================================================
# PENDING BOOKINGS
# =========================================================

@router.get(
    "/bookings/pending",
    response_model=list[BookingDetailOut],
)
def view_pending_bookings(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> list[Booking]:

    # Only bookings from current admin's block
    if current_admin.block_id is None:
        return []

    return (
        db.query(Booking)
        .options(
            joinedload(
                Booking.resource
            ).joinedload(
                Resource.block
            ),
            joinedload(
                Booking.user
            ),
        )
        .filter(
            Booking.status == "pending",
            Booking.block_id == current_admin.block_id,
        )
        .order_by(
            Booking.booking_date.asc(),
            Booking.start_time.asc(),
        )
        .all()
    )


# =========================================================
# APPROVE BOOKING
# =========================================================

@router.post(
    "/bookings/{booking_id}/approve",
    response_model=BookingOut,
)
def approve_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> Booking:

    booking = (
        db.query(Booking)
        .filter(
            Booking.id == booking_id
        )
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found",
        )

    # Block permission check
    ensure_admin_block(
        current_admin,
        booking,
    )

    if booking.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Only pending bookings can be approved",
        )

    booking.status = "approved"
    booking.rejection_reason = None
    booking.decision_at = datetime.utcnow()

    db.commit()
    db.refresh(booking)

    return booking


# =========================================================
# REJECT BOOKING
# =========================================================

@router.post(
    "/bookings/{booking_id}/reject",
    response_model=BookingOut,
)
def reject_booking(
    booking_id: int,
    payload: BookingDecision,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> Booking:

    booking = (
        db.query(Booking)
        .filter(
            Booking.id == booking_id
        )
        .first()
    )

    if not booking:
        raise HTTPException(
            status_code=404,
            detail="Booking not found",
        )

    # Block permission check
    ensure_admin_block(
        current_admin,
        booking,
    )

    if booking.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Only pending bookings can be rejected",
        )

    if (
        not payload.reason
        or not payload.reason.strip()
    ):
        raise HTTPException(
            status_code=400,
            detail="Rejection reason is required",
        )

    booking.status = "rejected"

    booking.rejection_reason = (
        payload.reason.strip()
    )

    booking.decision_at = (
        datetime.utcnow()
    )

    db.commit()
    db.refresh(booking)

    return booking


# =========================================================
# SCHEDULE
# =========================================================

@router.get(
    "/schedule",
    response_model=list[BookingDetailOut],
)
def view_schedule(
    booking_date: Optional[date] = Query(
        default=None
    ),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> list[Booking]:

    query = (
        db.query(Booking)
        .options(
            joinedload(
                Booking.resource
            ).joinedload(
                Resource.block
            ),
            joinedload(
                Booking.user
            ),
        )
    )

    # Schedule should only show
    # current admin's block
    if current_admin.block_id is not None:
        query = query.filter(
            Booking.block_id == current_admin.block_id
        )
    else:
        return []

    if booking_date:
        query = query.filter(
            Booking.booking_date == booking_date
        )

    return (
        query
        .order_by(
            Booking.booking_date.asc(),
            Booking.start_time.asc(),
        )
        .all()
    )


# =========================================================
# BOOKING HISTORY
# IMPORTANT:
# HISTORY IS GLOBAL FOR EVERY ADMIN
# =========================================================

@router.get(
    "/history",
    response_model=list[BookingDetailOut],
)
def booking_history(

    role: Optional[str] = Query(
        default=None
    ),

    status_filter: Optional[str] = Query(
        default=None,
        alias="status",
    ),

    block_id: Optional[int] = Query(
        default=None
    ),

    resource_id: Optional[int] = Query(
        default=None
    ),

    department: Optional[str] = Query(
        default=None
    ),

    date_from: Optional[date] = Query(
        default=None
    ),

    date_to: Optional[date] = Query(
        default=None
    ),

    search: Optional[str] = Query(
        default=None
    ),

    sort: str = Query(
        default="newest"
    ),

    db: Session = Depends(get_db),

    current_admin: User = Depends(
        get_current_admin
    ),

) -> list[Booking]:

    # IMPORTANT:
    # No current_admin.block_id filter here.
    # Every admin gets complete history.

    query = (
        db.query(Booking)
        .options(
            joinedload(
                Booking.resource
            ).joinedload(
                Resource.block
            ),
            joinedload(
                Booking.user
            ),
        )
    )

    # -----------------------------
    # ROLE FILTER
    # -----------------------------

    if role and role != "all":

        query = (
            query
            .join(
                User,
                Booking.user_id == User.id,
            )
            .filter(
                User.role == role
            )
        )

    # -----------------------------
    # STATUS FILTER
    # -----------------------------

    if (
        status_filter
        and status_filter != "all"
    ):

        query = query.filter(
            Booking.status == status_filter
        )

    # -----------------------------
    # BLOCK FILTER
    # -----------------------------

    if block_id:

        query = query.filter(
            Booking.block_id == block_id
        )

    # -----------------------------
    # RESOURCE FILTER
    # -----------------------------

    if resource_id:

        query = query.filter(
            Booking.resource_id == resource_id
        )

    # -----------------------------
    # DEPARTMENT FILTER
    # -----------------------------

    if department:

        query = query.filter(
            Booking.department.ilike(
                f"%{department}%"
            )
        )

    # -----------------------------
    # DATE FROM
    # -----------------------------

    if date_from:

        query = query.filter(
            Booking.booking_date >= date_from
        )

    # -----------------------------
    # DATE TO
    # -----------------------------

    if date_to:

        query = query.filter(
            Booking.booking_date <= date_to
        )

    # -----------------------------
    # SEARCH
    # -----------------------------

    if search:

        term = f"%{search}%"

        query = (
            query
            .join(
                User,
                Booking.user_id == User.id,
            )
            .outerjoin(
                Resource,
                Booking.resource_id == Resource.id,
            )
            .filter(
                (Booking.name.ilike(term))
                | (User.uid.ilike(term))
                | (User.username.ilike(term))
                | (Resource.name.ilike(term))
            )
        )

    # -----------------------------
    # SORTING
    # -----------------------------

    if sort == "oldest":

        query = query.order_by(
            Booking.created_at.asc()
        )

    elif sort == "upcoming":

        query = query.order_by(
            Booking.booking_date.asc(),
            Booking.start_time.asc(),
        )

    else:

        query = query.order_by(
            Booking.created_at.desc()
        )

    return query.all()