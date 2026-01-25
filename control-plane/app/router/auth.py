from fastapi import APIRouter, Depends, Response, status, HTTPException, Request
from sqlalchemy.orm import Session
from .. import models, Schema
from ..database import get_db
from ..utils import get_password_hash, verify_password
from .token import create_access_token, get_current_user
import secrets
import hashlib 

router = APIRouter(
    prefix="/api/auth",
    tags=['Auth']
)


@router.post("/signup", status_code=status.HTTP_201_CREATED, response_model=Schema.TokenResponse)
async def signup(response: Response, new_user: Schema.SignupRequest, db: Session = Depends(get_db)):
    """
    Create a new user account
    
    - **email**: User's email address (must be unique)
    - **name**: User's full name
    - **password**: User's password (will be hashed)
    """

    # Validate passwords match
    if new_user.password != new_user.confirmPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == new_user.email.lower()).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists"
        )
    
    # Hash password
    hashed_password = get_password_hash(new_user.password)
    
    # Create new user (exclud, ine confirmPassword from database)
    user = models.User(
        email=new_user.email.lower(),
        name=new_user.name,
        password=hashed_password
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create access token (use user.id, not new_user.id)
    access_token = create_access_token(data={"user_id": str(user.id)})


    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,      # HTTPS only
        samesite="lax",   # or "strict"
        max_age=60 * 60   # 1 hour
    )



    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/login", response_model=Schema.TokenResponse)
async def login(response: Response, credentials: Schema.LoginRequest, db: Session = Depends(get_db)):
    """
    Login with email and password
    
    - **email**: User's email address
    - **password**: User's password
    """
    
    # Find user by email
    user = db.query(models.User).filter(models.User.email == credentials.email.lower()).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not verify_password(credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token = create_access_token(data={"user_id": str(user.id)})

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,      # HTTPS only
        samesite="lax",   # or "strict"
        max_age=60 * 60   # 1 hour
    )


    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=Schema.UserResponse)
async def get_me(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get current authenticated user's information
    
    Requires valid JWT token in Authorization header or cookie
    """
    current_user = get_current_user(request, db)
    return current_user


@router.post("/logout")
async def logout(response: Response):
    """
    Logout user by clearing the access token cookie
    """
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=False,
        samesite="lax"
    )
    
    return {"message": "Successfully logged out"}


def generate_secure_api_key() -> str:
    """
    Generate a secure API key using secrets module
    Format: acp_<40 character hex string>
    """
    random_bytes = secrets.token_bytes(32)
    api_key = hashlib.sha256(random_bytes).hexdigest()[:40]
    return f"acp_{api_key}"


@router.get("/api_keys", response_model=list[Schema.ApiKeyResponse])
async def get_api_keys(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get all API keys for the current authenticated user
    """
    current_user = get_current_user(request, db)
    return current_user.api_keys


@router.post("/generate_api_key", response_model=Schema.ApiKeyGenerateResponse)
async def generate_api_key(
    request: Request,
    key_data: Schema.ApiKeyCreate,
    db: Session = Depends(get_db)
):
    """
    Generate a new API key for the current authenticated user
    """
    current_user = get_current_user(request, db)
    
    # Generate new API key
    new_key = generate_secure_api_key()
    
    # Create new API key record
    api_key = models.ApiKey(
        user_id=current_user.id,
        key=new_key,
        name=key_data.name or f"API Key {len(current_user.api_keys) + 1}"
    )
    
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    
    return {
        "api_key": api_key,
        "message": "API key generated successfully"
    }


@router.delete("/api_keys/{key_id}")
async def delete_api_key(
    key_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Delete a specific API key
    """
    current_user = get_current_user(request, db)
    
    # Find the API key
    api_key = db.query(models.ApiKey).filter(
        models.ApiKey.id == key_id,
        models.ApiKey.user_id == current_user.id
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    db.delete(api_key)
    db.commit()
    
    return {"message": "API key deleted successfully"}