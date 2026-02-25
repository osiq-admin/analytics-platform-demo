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


class SuggestCalcRequest(BaseModel):
    description: str
    context: str = ""  # optional additional context


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


@router.post("/suggest-calculation")
def suggest_calculation(req: SuggestCalcRequest, request: Request):
    """Suggest a calculation based on natural language description."""
    from backend.services.ai_context_builder import AIContextBuilder
    from backend.config import settings as app_settings

    builder = AIContextBuilder(
        app_settings.workspace_dir,
        request.app.state.metadata,
        request.app.state.db,
    )
    suggestion = builder.suggest_calculation(req.description)

    # Include context summary
    suggestion["metadata_context"] = {
        "entities": len(request.app.state.metadata.list_entities()),
        "calculations": len(request.app.state.metadata.list_calculations()),
        "settings": len(request.app.state.metadata.list_settings()),
    }

    return suggestion


@router.get("/context")
def get_ai_context(request: Request):
    """Get the full AI metadata context."""
    from backend.services.ai_context_builder import AIContextBuilder
    from backend.config import settings as app_settings

    builder = AIContextBuilder(
        app_settings.workspace_dir,
        request.app.state.metadata,
        request.app.state.db,
    )
    return {
        "context": builder.build_full_context(),
        "summary": {
            "entities": len(request.app.state.metadata.list_entities()),
            "calculations": len(request.app.state.metadata.list_calculations()),
            "settings": len(request.app.state.metadata.list_settings()),
        },
    }
