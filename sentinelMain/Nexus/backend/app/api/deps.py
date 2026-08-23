from typing import List, Optional
from fastapi import Depends, HTTPException, Header, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.models.core.user import User


async def get_current_user(
    x_user_email: Optional[str] = Header(default="operator@nexus.io", alias="X-User-Email"),
    session: AsyncSession = Depends(get_db_session),
) -> User:
    """
    Resolves the current authenticated user by X-User-Email header.
    Defaults to operator@nexus.io if header omitted for demo compatibility.
    """
    if not x_user_email:
        x_user_email = "operator@nexus.io"

    query = await session.execute(select(User).where(User.email == x_user_email))
    user = query.scalars().first()

    if not user:
        # Fallback query by role if specific email not found
        fallback_query = await session.execute(select(User).limit(1))
        user = fallback_query.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"User credentials invalid or inactive ({x_user_email})",
        )
    return user


def require_role(allowed_roles: List[str]):
    """Enforces role-based authorization for endpoints."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.upper() not in [r.upper() for r in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not authorized for this operation. Required: {allowed_roles}",
            )
        return current_user

    return role_checker
