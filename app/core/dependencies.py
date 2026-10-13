from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.security import ALGORITHM, SECRET_KEY
from app.database import SessionLocal
from app.models.user import User
from app.services.user_service import normalize_role


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError as exc:
        raise credentials_exception from exc

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_client(current_user: User = Depends(get_current_user)) -> User:
    if normalize_role(current_user.role) not in {"teacher", "student"}:
        raise HTTPException(status_code=403, detail="Teacher or student access only")
    return current_user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if normalize_role(current_user.role) != "admin":
        raise HTTPException(status_code=403, detail="Admin access only")
    return current_user


def get_current_teacher(current_user: User = Depends(get_current_user)) -> User:
    if normalize_role(current_user.role) != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access only")
    return current_user
