"""Data info API — date ranges, cardinality, etc."""
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/data", tags=["data-info"])


@router.get("/date-range/{entity_id}")
def get_date_range(entity_id: str, request: Request):
    """Return min/max dates for date fields in an entity."""
    db = request.app.state.db
    ms = request.app.state.metadata

    entity = ms.load_entity(entity_id)
    if not entity:
        return {"error": f"Entity {entity_id} not found"}

    # Find date/datetime fields
    date_fields = [
        f.name for f in (entity.fields or [])
        if f.type in ("date", "datetime")
    ]

    if not date_fields:
        return {"entity_id": entity_id, "date_ranges": {}}

    table_name = entity_id
    ranges = {}
    cursor = db.cursor()

    for field in date_fields:
        try:
            result = cursor.execute(
                f'SELECT MIN("{field}") as min_date, MAX("{field}") as max_date '  # nosec B608
                f'FROM "{table_name}" WHERE "{field}" IS NOT NULL'
            )
            row = result.fetchone()
            if row and row[0]:
                ranges[field] = {
                    "min_date": str(row[0]),
                    "max_date": str(row[1]),
                }
        except Exception:  # nosec B110 — field may not exist in table; skip gracefully
            pass

    cursor.close()
    return {"entity_id": entity_id, "date_ranges": ranges}
