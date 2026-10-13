from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False)
    block_id = Column(Integer, ForeignKey("blocks.id"), nullable=True, index=True)
    booking_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    name = Column(String(120), nullable=True)
    department = Column(String(120), nullable=True)
    purpose = Column(String(255), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    decision_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="bookings")
    resource = relationship("Resource", back_populates="bookings")
    block = relationship("Block", back_populates="bookings")
