import jwt
from jwt.exceptions import InvalidTokenError
from datetime import datetime, timedelta, timezone
from fastapi import status, HTTPException, Depends, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from ..config import settings
from app.database import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    return encoded_jwt



def verify_token(token: str, credentials_exception):
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("user_id")
        if user_id is None:
            raise credentials_exception

        token_data = user_id
        print(f"token data {token_data}")

    except InvalidTokenError:
        raise credentials_exception

    return token_data

async def get_current_user(
    request: Request,
    db: AsyncSession,  # Async database session
    token: str = Depends(oauth2_scheme)
):
  
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # If called manually bypassing Depends(), extract token from header
    # Depends is an object in FastAPI, so we safely check if token is our expected string or a Depends instance
    if token is None or not isinstance(token, str):
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        else:
            token = None

    # 🍪 First try cookie
    cookie_token = request.cookies.get("access_token")

    # 🔑 Fallback to Authorization header
    final_token = cookie_token or token

    if not final_token:
        raise credentials_exception

    # Try to verify as JWT first
    try:
        user_id = verify_token(final_token, credentials_exception)
        
        # Fetch user from database
        stmt = select(models.User).options(
            selectinload(models.User.api_keys)
        ).filter(models.User.id == int(user_id))
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
    except HTTPException:
        # If JWT validation fails, check if it's a valid API key
        stmt = select(models.ApiKey).options(
            selectinload(models.ApiKey.user)
        ).filter(
            models.ApiKey.key == final_token,
            models.ApiKey.is_active == True
        )
        result = await db.execute(stmt)
        db_api_key = result.scalar_one_or_none()
        
        if not db_api_key:
            raise credentials_exception
            
        # FIX: Explicitly fetch the user with api_keys eagerly loaded to prevent MissingGreenlet errors
        stmt = select(models.User).options(
            selectinload(models.User.api_keys)
        ).filter(models.User.id == db_api_key.user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
    
    if not user:
        raise credentials_exception
    
    return user
