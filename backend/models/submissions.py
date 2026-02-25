"""Submission models for the review pipeline."""
from datetime import datetime
from pydantic import BaseModel, Field


class ReviewComment(BaseModel):
    """A review comment on a submission."""
    author: str = "system"
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    content: str = ""
    type: str = Field(default="comment", description="comment, approval, rejection, recommendation")


class Submission(BaseModel):
    """A use case submission for review."""
    submission_id: str
    use_case_id: str
    name: str
    description: str = ""
    status: str = Field(default="pending", description="pending, in_review, approved, rejected, implemented")
    author: str = Field(default="demo_user")
    reviewer: str | None = None
    components: list[dict] = Field(default_factory=list)
    validation_results: list[dict] = Field(default_factory=list)
    recommendations: list[dict] = Field(default_factory=list)
    comments: list[ReviewComment] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    expected_results: dict = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    implemented_at: str | None = None
