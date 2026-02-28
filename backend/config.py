"""Application configuration via environment variables."""
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    workspace_dir: Path = Path("workspace")
    host: str = "0.0.0.0"  # nosec B104 — dev server, intentional bind to all interfaces
    port: int = 8000
    reload: bool = True
    llm_api_key: str = ""
    llm_model: str = "claude-sonnet-4-6"


settings = Settings()
