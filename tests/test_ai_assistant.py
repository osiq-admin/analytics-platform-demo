"""Tests for the AI assistant service (mock mode)."""
import json
import shutil
from pathlib import Path

import pytest

from backend.db import DuckDBManager
from backend.services.ai_assistant import AIAssistant


@pytest.fixture
def ai_workspace(tmp_path):
    """Create a workspace with AI metadata files."""
    ws = tmp_path / "workspace"
    ws.mkdir()

    # Copy AI-specific metadata
    real_ws = Path("workspace")
    meta = ws / "metadata"
    meta.mkdir(parents=True)

    for fname in ["ai_instructions.md", "ai_mock_sequences.json"]:
        src = real_ws / "metadata" / fname
        if src.exists():
            shutil.copy2(src, meta / fname)

    return ws


@pytest.fixture
def db():
    mgr = DuckDBManager()
    mgr.connect(":memory:")
    yield mgr
    mgr.close()


@pytest.fixture
def assistant(ai_workspace, db):
    return AIAssistant(ai_workspace, db)


class TestMockMode:
    def test_mode_is_mock_without_api_key(self, assistant):
        assert assistant.mode == "mock"

    def test_list_mock_sequences(self, assistant):
        seqs = assistant.get_mock_sequences()
        assert len(seqs) >= 3
        assert all("id" in s and "title" in s for s in seqs)

    def test_get_mock_messages(self, assistant):
        seqs = assistant.get_mock_sequences()
        first_id = seqs[0]["id"]
        messages = assistant.get_mock_messages(first_id)
        assert messages is not None
        assert len(messages) >= 2
        assert messages[0]["role"] == "user"
        assert messages[1]["role"] == "assistant"

    def test_get_mock_messages_nonexistent(self, assistant):
        assert assistant.get_mock_messages("nonexistent") is None

    def test_mock_reply_matches_sequence(self, assistant):
        import asyncio

        # Get a known user message from mock sequences
        seqs_data = json.loads(
            (assistant._workspace / "metadata" / "ai_mock_sequences.json").read_text()
        )
        user_msg = seqs_data[0]["messages"][0]["content"]
        expected_reply = seqs_data[0]["messages"][1]["content"]

        result = asyncio.get_event_loop().run_until_complete(
            assistant.chat([{"role": "user", "content": user_msg}])
        )

        assert result["role"] == "assistant"
        assert result["mode"] == "mock"
        assert result["content"] == expected_reply

    def test_mock_reply_fallback_for_unknown(self, assistant):
        import asyncio

        result = asyncio.get_event_loop().run_until_complete(
            assistant.chat([{"role": "user", "content": "completely unknown question xyz123"}])
        )

        assert result["role"] == "assistant"
        assert result["mode"] == "mock"
        assert "mock mode" in result["content"].lower()

    def test_mock_reply_empty_messages(self, assistant):
        import asyncio

        result = asyncio.get_event_loop().run_until_complete(
            assistant.chat([])
        )

        assert result["role"] == "assistant"
        assert result["mode"] == "mock"


class TestSystemContext:
    def test_build_context_includes_instructions(self, assistant):
        context = assistant._build_system_context()
        assert "trade surveillance" in context.lower()

    def test_build_context_without_tables(self, assistant):
        # With empty DB, should still include instructions
        context = assistant._build_system_context()
        assert len(context) > 100


class TestInstructionsLoading:
    def test_loads_instructions_from_file(self, assistant):
        assert "wash trading" in assistant._instructions.lower()

    def test_fallback_without_file(self, tmp_path, db):
        ws = tmp_path / "empty_ws"
        ws.mkdir()
        (ws / "metadata").mkdir()
        ai = AIAssistant(ws, db)
        assert "assistant" in ai._instructions.lower()
