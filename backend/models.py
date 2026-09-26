from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    date = Column(String(20), nullable=False)
    time = Column(String(20), nullable=False)
    temperature = Column(Float, nullable=False)
    rain = Column(Float, default=0.0)
    snow = Column(Float, default=0.0)
    clouds = Column(Float, default=0.0)
    weather = Column(String(50), default="Clear")
    holiday = Column(String(50), default="None")
    corridor = Column(String(100), default="Main Corridor")
    direction = Column(String(20), default="Inbound")
    prediction_point = Column(String(100), default="Point A")
    predicted_traffic = Column(Float, nullable=False)
    congestion_level = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="predictions")
