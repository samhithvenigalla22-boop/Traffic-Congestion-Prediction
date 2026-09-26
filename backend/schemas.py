import re
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator, model_validator

class SignupRequest(BaseModel):
    name: str
    email: str
    phone: str
    password: str
    confirm_password: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        name = v.strip()
        if len(name) < 2:
            raise ValueError("Name must be at least 2 characters long")
        return name

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        email = v.strip().lower()
        email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        if not re.match(email_regex, email):
            raise ValueError("Invalid email format")
        return email

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        # Normalize Indian phone numbers: +919876543210, 09876543210, 9876543210
        raw = re.sub(r"[\s\-\(\)]", "", v.strip())
        if raw.startswith("+91"):
            raw = raw[3:]
        elif raw.startswith("91") and len(raw) == 12:
            raw = raw[2:]
        elif raw.startswith("0") and len(raw) == 11:
            raw = raw[1:]
        
        if not raw.isdigit():
            raise ValueError("Phone number must contain only numeric digits")
        if len(raw) != 10:
            raise ValueError("Phone number must contain exactly 10 digits")
        return raw

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one numeric digit")
        return v

    @model_validator(mode="after")
    def verify_password_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self

class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PredictionInput(BaseModel):
    date: str
    time: str
    temperature: float
    rain: float = 0.0
    snow: float = 0.0
    clouds: float = 0.0
    weather: str = "Clear"
    holiday: str = "None"
    corridor: str = "Main Arterial Corridor"
    direction: str = "Inbound"
    prediction_point: str = "Point A (North Gateway)"

    @field_validator("rain")
    @classmethod
    def validate_rain(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Rainfall cannot be negative")
        return v

    @field_validator("snow")
    @classmethod
    def validate_snow(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Snowfall cannot be negative")
        return v

    @field_validator("clouds")
    @classmethod
    def validate_clouds(cls, v: float) -> float:
        if v < 0 or v > 100:
            raise ValueError("Cloud cover must be between 0% and 100%")
        return v

class PredictionResponse(BaseModel):
    id: Optional[int] = None
    predicted_traffic: float
    congestion_level: str
    model: str = "XGBoost Regressor"
    r2: float = 0.95
    mae: float = 282.44
    rmse: float = 458.60
    corridor: str
    direction: str
    prediction_point: str
    date: str
    time: str
    temperature: float
    rain: float
    snow: float
    clouds: float
    weather: str
    holiday: str
    created_at: str

class HistoryItem(BaseModel):
    id: int
    date: str
    time: str
    temperature: float
    rain: float
    snow: float
    clouds: float
    weather: str
    holiday: str
    corridor: str
    direction: str
    prediction_point: str
    predicted_traffic: float
    congestion_level: str
    created_at: datetime

    class Config:
        from_attributes = True
