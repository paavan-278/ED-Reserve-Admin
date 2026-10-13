from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Incharge(Base):
    __tablename__ = "incharges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    contact = Column(String(50), nullable=True)
    block_name = Column(String(100), nullable=False, index=True)
    resource_name = Column(String(120), nullable=True)
    block_id = Column(Integer, ForeignKey("blocks.id"), nullable=True)

    block = relationship("Block", back_populates="incharges")
