from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(120), nullable=True)
    uid = Column(String(80), unique=True, nullable=True, index=True)
    email = Column(String(160), unique=True, nullable=True, index=True)
    password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="client")
    department = Column(String(120), nullable=True)
    block_id = Column(Integer, ForeignKey("blocks.id"), nullable=True)
    reset_otp_hash = Column(String(255), nullable=True)
    reset_otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    reset_otp_sent_at = Column(DateTime(timezone=True), nullable=True)

    block = relationship("Block", back_populates="users")
    bookings = relationship("Booking", back_populates="user")
