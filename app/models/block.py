from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Block(Base):
    __tablename__ = "blocks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(1), unique=True, nullable=False, index=True)

    users = relationship("User", back_populates="block")
    resources = relationship("Resource", back_populates="block")
    bookings = relationship("Booking", back_populates="block")
    incharges = relationship("Incharge", back_populates="block")
