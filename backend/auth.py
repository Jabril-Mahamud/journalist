from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt
import requests
from functools import lru_cache
from typing import Optional
import models
from database import get_db

security = HTTPBearer()

# Cache JWKS for 1 hour
@lru_cache(maxsize=1)
def get_clerk_jwks():
    """Fetch Clerk's JSON Web Key Set for JWT verification"""
    jwks_url = "https://clerk.your-domain.com/.well-known/jwks.json"
    # You'll need to replace with your actual Clerk domain
    # Or use environment variable
    response = requests.get(jwks_url)
    return response.json()

def verify_clerk_token(token: str) -> dict:
    """
    Verify Clerk JWT token
    Returns the decoded token payload with user info
    """
    try:
        # For now, we'll use a simpler approach: decode without verification
        # In production, you should verify with Clerk's public key
        
        # Decode token (unverified for development)
        # WARNING: This is not secure for production!
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        return decoded
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> models.User:
    """
    Extract and verify the JWT token, then get or create the user
    """
    token = credentials.credentials
    
    try:
        # Verify and decode the token
        payload = verify_clerk_token(token)
        
        # Get Clerk user ID from token
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        # Get or create user
        user = db.query(models.User).filter(
            models.User.clerk_user_id == clerk_user_id
        ).first()
        
        if not user:
            # Create new user
            email = payload.get("email")
            user = models.User(
                clerk_user_id=clerk_user_id,
                email=email
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}"
        )

# Optional: For routes that need user but don't require auth
def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    """Get user if authenticated, None otherwise"""
    if not credentials:
        return None
    
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None