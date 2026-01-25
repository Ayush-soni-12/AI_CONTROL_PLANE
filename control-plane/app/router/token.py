import jwt
from jwt.exceptions import InvalidTokenError
from datetime import datetime, timedelta, timezone
from fastapi import status, HTTPException, Depends, Request
from fastapi.security import OAuth2PasswordBearer
from ..config import settings

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

def get_current_user(
    request: Request,
    db,  # Database session
    token: str = Depends(oauth2_scheme)
):
    from .. import models
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authe nticate": "Bearer"},
    )

    # 🍪 First try cookie
    cookie_token = request.cookies.get("access_token")

    # 🔑 Fallback to Authorization header
    final_token = cookie_token or token

    if not final_token:
        raise credentials_exception

    user_id = verify_token(final_token, credentials_exception)
    
    # Fetch user from database
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    
    if not user:
        raise credentials_exception
    
    return user
