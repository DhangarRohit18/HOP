import uuid
from typing import Optional, Dict, Any, List
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core.audit_log import AuditLog
from app.schemas.platform import AuditLogRead


async def create_audit_log(
    session: AsyncSession,
    actor_id: str,
    actor_name: str,
    role: str,
    event_type: str,
    entity_type: str,
    entity_id: str,
    action: str,
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    result: str = "SUCCESS",
) -> AuditLog:
    """Persists an immutable audit log entry to the database."""
    log_entry = AuditLog(
        actor_id=actor_id,
        actor_name=actor_name,
        role=role,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=str(entity_id),
        action=action,
        old_value=old_value,
        new_value=new_value,
        result=result,
    )
    session.add(log_entry)
    await session.flush()
    return log_entry


async def fetch_audit_logs(
    session: AsyncSession,
    limit: int = 100,
    role: Optional[str] = None,
    event_type: Optional[str] = None,
) -> List[AuditLog]:
    """Fetches recent audit log entries ordered by timestamp descending."""
    query = select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit)
    if role:
        query = query.where(AuditLog.role == role.upper())
    if event_type:
        query = query.where(AuditLog.event_type == event_type.upper())

    result = await session.execute(query)
    return list(result.scalars().all())
