"""AI query assistant — live Claude API or mock mode for pre-scripted conversations."""
import json
import logging
from pathlib import Path

from backend.config import settings
from backend.db import DuckDBManager
from backend.services.metadata_service import MetadataService
from backend.services.query_service import QueryService

log = logging.getLogger(__name__)


class AIAssistant:
    def __init__(self, workspace_dir: Path, db: DuckDBManager):
        self._workspace = workspace_dir
        self._db = db
        self._metadata = MetadataService(workspace_dir)
        self._query_service = QueryService(db)
        self._mock_sequences = self._load_mock_sequences()
        self._instructions = self._load_instructions()

    @property
    def mode(self) -> str:
        return "live" if settings.llm_api_key else "mock"

    def _load_instructions(self) -> str:
        path = self._workspace / "metadata" / "ai_instructions.md"
        if path.exists():
            return path.read_text()
        return "You are a trade surveillance analytics assistant."

    def _load_mock_sequences(self) -> list[dict]:
        path = self._workspace / "metadata" / "ai_mock_sequences.json"
        if path.exists():
            return json.loads(path.read_text())
        return []

    def get_mock_sequences(self) -> list[dict]:
        """Return available mock conversation sequences (id + title only)."""
        return [{"id": s["id"], "title": s["title"]} for s in self._mock_sequences]

    def get_mock_messages(self, sequence_id: str) -> list[dict] | None:
        """Return messages for a specific mock sequence."""
        for seq in self._mock_sequences:
            if seq["id"] == sequence_id:
                return seq["messages"]
        return None

    def _build_system_context(self) -> str:
        """Build system prompt with live schema and metadata context."""
        parts = [self._instructions]

        # Add live table schema
        try:
            tables = self._query_service.list_tables()
            if tables:
                parts.append("\n## Current Database Tables\n")
                for t in tables:
                    schema = self._query_service.get_table_schema(t["name"])
                    cols = ", ".join(
                        f"{c['name']} ({c['type']})" for c in schema.get("columns", [])
                    )
                    parts.append(f"- **{t['name']}** ({t['type']}): {cols}")
        except Exception as e:
            log.warning("Could not fetch schema for AI context: %s", e)

        # Add sample data counts
        try:
            for table_name in ["execution", "alerts_summary"]:
                result = self._query_service.execute(
                    f'SELECT COUNT(*) AS cnt FROM "{table_name}"', limit=1  # nosec B608
                )
                if result.get("rows"):
                    count = result["rows"][0].get("cnt", "?")
                    parts.append(f"\n`{table_name}` has {count} rows.")
        except Exception:  # nosec B110 — table may not exist yet; non-critical context
            pass

        return "\n".join(parts)

    async def chat(self, messages: list[dict]) -> dict:
        """Send messages to Claude API and return the response.

        Args:
            messages: List of {"role": "user"|"assistant", "content": str}

        Returns:
            {"role": "assistant", "content": str, "mode": "live"|"mock"}
        """
        if self.mode == "mock":
            return self._mock_reply(messages)

        return await self._live_reply(messages)

    def _mock_reply(self, messages: list[dict]) -> dict:
        """Return a mock reply based on matching sequences."""
        if not messages:
            return {
                "role": "assistant",
                "content": "I'm running in mock mode. Select a pre-scripted scenario to explore.",
                "mode": "mock",
            }

        last_user = None
        for msg in reversed(messages):
            if msg.get("role") == "user":
                last_user = msg["content"].strip().lower()
                break

        if not last_user:
            return {
                "role": "assistant",
                "content": "Please ask a question about the trade surveillance data.",
                "mode": "mock",
            }

        # Try to find a matching mock response
        for seq in self._mock_sequences:
            for i, msg in enumerate(seq["messages"]):
                if msg["role"] == "user" and msg["content"].strip().lower() == last_user:
                    # Return the next assistant message
                    if i + 1 < len(seq["messages"]) and seq["messages"][i + 1]["role"] == "assistant":
                        return {
                            "role": "assistant",
                            "content": seq["messages"][i + 1]["content"],
                            "mode": "mock",
                        }

        # Fallback: suggest available sequences
        titles = [s["title"] for s in self._mock_sequences]
        return {
            "role": "assistant",
            "content": (
                "I'm in mock mode and don't have a pre-scripted response for that question. "
                "Try one of these scenarios:\n\n"
                + "\n".join(f"- {t}" for t in titles)
            ),
            "mode": "mock",
        }

    async def _live_reply(self, messages: list[dict]) -> dict:
        """Call Claude API for a live response."""
        try:
            import anthropic

            client = anthropic.Anthropic(api_key=settings.llm_api_key)
            system_context = self._build_system_context()

            api_messages = [
                {"role": m["role"], "content": m["content"]}
                for m in messages
                if m.get("role") in ("user", "assistant")
            ]

            response = client.messages.create(
                model=settings.llm_model,
                max_tokens=2048,
                system=system_context,
                messages=api_messages,
            )

            content = response.content[0].text if response.content else "No response."
            return {"role": "assistant", "content": content, "mode": "live"}

        except ImportError:
            return {
                "role": "assistant",
                "content": "The anthropic package is not installed. Install it with: `pip install anthropic`",
                "mode": "error",
            }
        except Exception as e:
            log.error("AI API call failed: %s", e)
            return {
                "role": "assistant",
                "content": f"API call failed: {e}",
                "mode": "error",
            }
