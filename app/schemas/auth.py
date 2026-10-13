from pydantic import BaseModel

from app.schemas.user import UserOut


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


class ForgotPasswordRequest(BaseModel):
    identifier: str


class VerifyOtpRequest(BaseModel):
    identifier: str
    otp: str


class ResetPasswordRequest(BaseModel):
    identifier: str
    otp: str
    password: str
    confirm_password: str


class MessageResponse(BaseModel):
    message: str
