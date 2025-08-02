from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import database as db
from app.models import User
from typing import Optional
import jwt
import os
from datetime import datetime, timedelta

security = HTTPBearer(auto_error=False)

JWT_SECRET = os.getenv("JWT_SECRET", "mirroverse-demo-secret-key-2025")
JWT_ALGORITHM = "HS256"

def create_jwt_token(user_id: str) -> str:
    """Create a JWT token for the user"""
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=7),  # Token expires in 7 days
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> Optional[str]:
    """Verify JWT token and return user_id if valid"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("user_id")
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    token = credentials.credentials
    
    user_id = verify_jwt_token(token)
    if user_id:
        user = db.get_user_by_id(user_id)
        if user:
            return user
    
    user = db.get_user_by_session(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session token")
    
    return user

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[User]:
    if not credentials:
        return None
    
    token = credentials.credentials
    
    user_id = verify_jwt_token(token)
    if user_id:
        return db.get_user_by_id(user_id)
    
    return db.get_user_by_session(token)
