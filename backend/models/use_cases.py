"""Use case models."""
from datetime import datetime
from pydantic import BaseModel, Field


class UseCaseComponent(BaseModel):
    """A metadata component included in a use case."""
    type: str = Field(description="entity, calculation, setting, or detection_model")
    id: str = Field(description="The component's ID")
    action: str = Field(default="reference", description="reference (use existing) or create (new)")
    config: dict | None = Field(default=None, description="Full config if action=create")


class UseCase(BaseModel):
    """A detection use case — bundles components for testing a hypothesis."""
    use_case_id: str
    name: str
    description: str = ""
    status: str = Field(default="draft", description="draft, ready, submitted, approved, rejected")
    author: str = Field(default="demo_user")
    components: list[UseCaseComponent] = Field(default_factory=list)
    sample_data: dict = Field(default_factory=dict, description="Entity ID -> list of sample rows")
    expected_results: dict = Field(default_factory=dict, description="Expected alert outcomes")
    tags: list[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    layer: str = Field(default="user")
