"""AI assistant API endpoints."""
from fastapi import APIRouter, Request
from pydantic import BaseModel

from backend.services.ai_assistant import AIAssistant

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _assistant(request: Request) -> AIAssistant:
    from backend.config import settings
    return AIAssistant(settings.workspace_dir, request.app.state.db)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


@router.get("/mode")
def get_mode(request: Request):
    return {"mode": _assistant(request).mode}


@router.get("/mock-sequences")
def list_mock_sequences(request: Request):
    return _assistant(request).get_mock_sequences()


@router.get("/mock-sequences/{sequence_id}")
def get_mock_sequence(sequence_id: str, request: Request):
    messages = _assistant(request).get_mock_messages(sequence_id)
    if messages is None:
        return {"error": "Sequence not found"}
    return {"id": sequence_id, "messages": messages}


@router.post("/chat")
async def chat(req: ChatRequest, request: Request):
    assistant = _assistant(request)
    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    return await assistant.chat(messages)
