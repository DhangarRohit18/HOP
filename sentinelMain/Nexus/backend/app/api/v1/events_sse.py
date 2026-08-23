import asyncio
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.services.platform.event_bus import subscribe_event_stream, unsubscribe_event_stream

router = APIRouter(prefix="/events", tags=["events"])


@router.get(
    "/stream",
    summary="Subscribes to real-time Server-Sent Events stream for platform disruptions, approvals, and recoveries",
)
async def stream_events():
    async def event_generator():
        queue = subscribe_event_stream()
        try:
            # Yield initial heartbeat
            yield "data: {\"event_type\": \"HEARTBEAT\", \"status\": \"CONNECTED\"}\n\n"
            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {data}\n\n"
                except asyncio.TimeoutError:
                    yield "data: {\"event_type\": \"PING\"}\n\n"
        finally:
            unsubscribe_event_stream(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
