"""Pydantic models for navigation metadata."""
from pydantic import BaseModel, Field


class NavItem(BaseModel):
    view_id: str
    label: str
    path: str
    icon: str = ""
    order: int = 0


class NavGroup(BaseModel):
    title: str
    order: int = 0
    items: list[NavItem] = Field(default_factory=list)


class NavigationConfig(BaseModel):
    navigation_id: str = "main"
    groups: list[NavGroup] = Field(default_factory=list)
