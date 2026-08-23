import asyncio
import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, Any, AsyncGenerator, List, Set

from sqlalchemy.ext.asyncio import AsyncSession
from app.models.core.event import Event
from app.schemas.platform import EventBusMessage

# In-memory pub/sub queues for SSE stream connections
_subscribers: Set[asyncio.Queue] = set()


def subscribe_event_stream() -> asyncio.Queue:
    """Subscribes an SSE listener queue to the global event bus."""
    queue: asyncio.Queue = asyncio.Queue()
    _subscribers.add(queue)
    return queue


def unsubscribe_event_stream(queue: asyncio.Queue) -> None:
    """Unsubscribes an SSE listener queue."""
    _subscribers.discard(queue)


async def publish_platform_event(
    session: AsyncSession,
    event_type: str,
    source_entity: str,
    source_id: str,
    payload: Dict[str, Any],
) -> EventBusMessage:
    """
    Persists an operational Event record to PostgreSQL and broadcasts to active SSE subscribers.
    """
    event_code = f"EVT-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)

    # Persist in DB Event table
    db_event = Event(
        event_type=event_type,
        severity="INFO",
        confidence=Decimal("1.00"),
        payload={"source_entity": source_entity, "source_id": source_id, **payload},
        occurred_at=now,
        ingested_at=now,
    )
    session.add(db_event)
    await session.flush()

    msg = EventBusMessage(
        event_id=event_code,
        event_type=event_type,
        timestamp=now,
        source_entity=source_entity,
        source_id=source_id,
        payload=payload,
        status="PROCESSED",
    )

    # Broadcast to in-memory SSE subscribers
    json_data = msg.model_dump_json()
    stale_queues = []
    for queue in _subscribers:
        try:
            queue.put_nowait(json_data)
        except Exception:
            stale_queues.append(queue)

    for q in stale_queues:
        _subscribers.discard(q)

    return msg
