import os
from datetime import datetime, timedelta
from secrets import randbelow

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models.block import Block
from app.models.user import User
from app.schemas.user import UserCreate
from app.services.email_service import (
    EmailConfigurationError,
    send_password_reset_email,
)


def normalize_role(role: str) -> str:
    role = (role or "").lower()

    if role == "client":
        return "student"

    return role


def display_role(role: str) -> str:
    normalized = normalize_role(role)

    if normalized == "admin":
        return "HOD / Admin"

    return normalized.title()


def find_user_by_identifier(
    db: Session,
    identifier: str,
) -> User | None:
    identifier = identifier.strip()

    return (
        db.query(User)
        .filter(
            or_(
                User.username == identifier,
                User.email == identifier.lower(),
                User.uid == identifier,
            )
        )
        .first()
    )


def create_user(
    db: Session,
    payload: UserCreate,
    creator: User,
) -> User:

    creator_role = normalize_role(creator.role)

    if creator_role == "teacher" and payload.role != "student":
        raise HTTPException(
            status_code=403,
            detail="Teachers can create students only",
        )

    if creator_role not in {"admin", "teacher"}:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to create users",
        )

    if payload.role == "student" and payload.block_id is None:
        raise HTTPException(
            status_code=422,
            detail="Student block is required",
        )

    if payload.block_id is not None:
        block = (
            db.query(Block)
            .filter(Block.id == payload.block_id)
            .first()
        )

        if not block:
            raise HTTPException(
                status_code=404,
                detail="Block not found",
            )

    existing = (
        db.query(User)
        .filter(
            or_(
                User.username == payload.uid,
                User.uid == payload.uid,
                User.email == payload.email,
            )
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="UID or email already exists",
        )

    user = User(
        username=payload.uid,
        name=payload.name.strip(),
        uid=payload.uid.strip(),
        email=payload.email.strip().lower(),
        department=payload.department.strip(),
        role=payload.role,
        block_id=(
            payload.block_id
            if payload.role == "student"
            else None
        ),
        password=get_password_hash(payload.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def start_password_reset(
    db: Session,
    identifier: str,
) -> None:

    user = find_user_by_identifier(db, identifier)

    if not user or not user.email:
        return

    now = datetime.utcnow()

    # Prevent repeated OTP requests within 60 seconds
    if (
        user.reset_otp_sent_at
        and now - user.reset_otp_sent_at
        < timedelta(seconds=60)
    ):
        raise HTTPException(
            status_code=429,
            detail="Please wait before requesting another OTP",
        )

    otp = f"{randbelow(1000000):06d}"

    expire_minutes = int(
        os.getenv("OTP_EXPIRE_MINUTES", "5")
    )

    # Prepare OTP data
    user.reset_otp_hash = get_password_hash(otp)
    user.reset_otp_expires_at = (
        now + timedelta(minutes=expire_minutes)
    )
    user.reset_otp_sent_at = now

    try:
        # Send email FIRST
        send_password_reset_email(
            user.email,
            otp,
        )

        # Save OTP only after email succeeds
        db.commit()

    except EmailConfigurationError as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Password reset email could not be sent"
            ),
        ) from exc


def verify_reset_otp(
    db: Session,
    identifier: str,
    otp: str,
) -> User:

    user = find_user_by_identifier(
        db,
        identifier,
    )

    if not user or not user.reset_otp_hash:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP",
        )

    if (
        not user.reset_otp_expires_at
        or datetime.utcnow()
        > user.reset_otp_expires_at
    ):
        raise HTTPException(
            status_code=400,
            detail="OTP has expired",
        )

    if not verify_password(
        otp,
        user.reset_otp_hash,
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP",
        )

    return user


def reset_password(
    db: Session,
    identifier: str,
    otp: str,
    password: str,
    confirm_password: str,
) -> None:

    if len(password) < 6:
        raise HTTPException(
            status_code=422,
            detail="Password must be at least 6 characters",
        )

    if password != confirm_password:
        raise HTTPException(
            status_code=422,
            detail="Passwords do not match",
        )

    user = verify_reset_otp(
        db,
        identifier,
        otp,
    )

    user.password = get_password_hash(password)

    user.reset_otp_hash = None
    user.reset_otp_expires_at = None
    user.reset_otp_sent_at = None

    db.commit()