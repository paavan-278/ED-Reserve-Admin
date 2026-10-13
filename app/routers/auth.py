from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    Token,
    VerifyOtpRequest,
)
from app.schemas.user import UserOut, UserRegister
from app.services.user_service import find_user_by_identifier, reset_password, start_password_reset, verify_reset_otp


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> User:
    raise HTTPException(status_code=403, detail="Public registration is disabled. Ask an admin or teacher to create your account.")
    existing_user = db.query(User).filter(User.username == payload.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    user = User(
        username=payload.username,
        password=get_password_hash(payload.password),
        role="client",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> Token:
    user = find_user_by_identifier(db, payload.username)
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=None,
    )
    return Token(access_token=access_token, user=user)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> MessageResponse:
    start_password_reset(db, payload.identifier)
    return MessageResponse(message="If the account exists, an OTP has been sent.")


@router.post("/verify-otp", response_model=MessageResponse)
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)) -> MessageResponse:
    verify_reset_otp(db, payload.identifier, payload.otp)
    return MessageResponse(message="OTP verified.")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password_route(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> MessageResponse:
    reset_password(db, payload.identifier, payload.otp, payload.password, payload.confirm_password)
    return MessageResponse(message="Password reset successful.")
