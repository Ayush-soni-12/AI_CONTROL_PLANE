from fastapi import Header, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from typing import Optional
from . import models
from .database import get_async_db


async def verify_api_key(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_async_db)
) -> models.User:
    """
    Verify API key from Authorization header and return the associated user.
    
    Expected format: Authorization: Bearer <api_key>
    
    Raises:
        HTTPException: If API key is missing, invalid, or inactive
    
    Returns:
        User: The user associated with the API key
    """
    
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required. Please initialize the SDK with a valid API key."
        )
    
    # Check if it's a Bearer token
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Expected: Bearer <api_key>"
        )
    
    # Extract the API key
    api_key = authorization.replace("Bearer ", "").strip()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key is empty. Please provide a valid API key."
        )
    
    # Query the database for the API key (async pattern)
    # Use selectinload to eagerly load the user relationship (prevents lazy-load issues)
    stmt = select(models.ApiKey).options(
        selectinload(models.ApiKey.user)
    ).filter(
        models.ApiKey.key == api_key,
        models.ApiKey.is_active == True
    )
    result = await db.execute(stmt)
    db_api_key = result.scalar_one_or_none()
    
    # Check if API key exists
    if not db_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or inactive API key. Please check your API key or generate a new one."
        )
    
    # Update last_used timestamp
    db_api_key.last_used = func.now()
    await db.commit()
    
    # Return the user associated with this API key
    return db_api_key.user
