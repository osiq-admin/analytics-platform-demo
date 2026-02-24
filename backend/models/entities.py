"""Canonical entity definitions."""
from pydantic import BaseModel, Field


class FieldDefinition(BaseModel):
    name: str
    type: str = Field(description="decimal, integer, string, boolean, date, datetime, etc.")
    description: str = ""
    is_key: bool = False
    nullable: bool = True
    domain_values: list[str] | None = None


class RelationshipDefinition(BaseModel):
    target_entity: str
    join_fields: dict[str, str] = Field(description="local_field -> target_field")
    relationship_type: str = Field(default="many_to_one", description="many_to_one, one_to_many, many_to_many")


class EntityDefinition(BaseModel):
    entity_id: str
    name: str
    description: str = ""
    fields: list[FieldDefinition] = Field(default_factory=list)
    relationships: list[RelationshipDefinition] = Field(default_factory=list)
    subtypes: list[str] = Field(default_factory=list)
    metadata_layer: str = Field(default="oob", exclude=True)
