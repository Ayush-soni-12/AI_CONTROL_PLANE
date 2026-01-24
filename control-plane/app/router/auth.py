from fastapi import APIRouter, Depends, Response, status, HTTPException, Request
from sqlalchemy.orm import Session
from .. import models, Schema
from ..database import get_db
from ..utils import get_password_hash, verify_password
from .token import create_access_token, get_current_user 

router = APIRouter(
    prefix="/api/auth",
    tags=['Auth']
)


@router.post("/signup", status_code=status.HTTP_201_CREATED, response_model=Schema.TokenResponse)
async def signup(new_user: Schema.SignupRequest, db: Session = Depends(get_db)):
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
    
    # Create new user (exclude confirmPassword from database)
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
