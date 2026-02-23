"""WebSocket endpoint for real-time pipeline progress."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["websocket"])

_connections: list[WebSocket] = []


@router.websocket("/ws/pipeline")
async def pipeline_ws(websocket: WebSocket):
    await websocket.accept()
    _connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        _connections.remove(websocket)


async def broadcast(message: dict) -> None:
    for ws in _connections[:]:
        try:
            await ws.send_json(message)
        except Exception:
            _connections.remove(ws)
