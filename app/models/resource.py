from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    floor = Column(String(120), nullable=True)
    description = Column(String(255), nullable=True)
    block_id = Column(Integer, ForeignKey("blocks.id"), nullable=True, index=True)
    is_extra_center = Column(Boolean, nullable=False, default=False, server_default="0")

    block = relationship("Block", back_populates="resources")
    bookings = relationship("Booking", back_populates="resource")
