# Phase 11: OOB vs User-Defined Separation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Context

All metadata (entities, calculations, settings, detection models) currently lives in a single `workspace/metadata/` pool with no distinction between vendor-provided defaults and user customizations. Phase 11 adds a clean separation so OOB (out-of-box) items are identified, user edits create overrides without touching originals, and version tracking enables upgrade simulation.

**Goal:** Separate OOB from user-customized metadata with layer resolution, reset-to-OOB, and version tracking — all visually distinguishable in the UI.

**Architecture:** Field-based layering (not directory reorganization). An OOB manifest registers all shipped items with checksums. User edits of OOB items are saved to `workspace/metadata/user_overrides/`. MetadataService resolves items by checking user_overrides first, falling back to OOB. A `metadata_layer` field on all Pydantic models indicates provenance.

**Tech Stack:** Python FastAPI, Pydantic v2, React 19, TypeScript, Zustand, Tailwind CSS 4

**Important:** Do NOT modify any existing plan files in `docs/plans/`. Only create new files and append rows to `docs/progress.md`.

---

## Key Design Decisions

1. **No directory reorganization** — existing files stay in place. A `user_overrides/` subdirectory under `workspace/metadata/` holds user edits of OOB items. This preserves all existing paths, snapshots, and tests.

2. **Full item replacement** — when a user edits an OOB item, the entire JSON is saved as the override. No field-level merging (simpler, matches how the editor already works).

3. **OOB manifest** — `workspace/metadata/oob_manifest.json` registers every shipped item with SHA256 checksum and version. This enables upgrade diffing.

4. **`metadata_layer` field** — added to all 4 Pydantic models as `metadata_layer: str = Field(default="oob", exclude=True)`. Set at load time, not stored in JSON files. API responses include it via explicit serialization.

5. **Snapshot compatibility** — `demo_controller.py` copies entire `metadata/` dir including `user_overrides/` and `oob_manifest.json` automatically.

6. **Existing path methods** — `_calc_path()` and `_setting_path()` use `rglob` which could find files in `user_overrides/`. Fix by filtering out paths containing `user_overrides`.

---

## Milestones Overview

| # | Milestone | Description | Dependencies |
|---|---|---|---|
| M84 | OOB Manifest + Backend Layer Resolution | Create manifest, add metadata_layer to models, update MetadataService | None |
| M85 | Layer-Aware API Endpoints | Expose layer info in responses, reset-to-OOB, diff endpoints | M84 |
| M86 | Frontend Layer UI | LayerBadge, ResetToOobButton, MetadataEditor integration, existing view badges | M84, M85 |
| M87 | Version Tracking + Upgrade Simulation | OobVersionService, upgrade comparison, demo manifest, frontend panel | M84 |
| M88 | E2E Tests, Onboarding, Tours & Docs | 10 E2E tests, 7-step tour, onboarding update, demo guide, progress | M84-M87 |

---

## M84: OOB Manifest + Backend Layer Resolution

### Task 84.1: Create OOB Manifest

**Files:**
- Create: `scripts/generate_oob_manifest.py`
- Create: `workspace/metadata/oob_manifest.json`

**Step 1:** Create `scripts/generate_oob_manifest.py` — scans all current metadata JSON files, computes SHA256 checksums, writes the manifest:

```python
"""Generate OOB manifest from current metadata files."""
import hashlib, json
from pathlib import Path

def compute_checksum(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:16]

def generate_manifest(workspace_dir: Path) -> dict:
    meta = workspace_dir / "metadata"
    manifest = {
        "oob_version": "1.0.0",
        "description": "Out-of-box metadata for Analytics Platform Demo v1.0",
        "items": {}
    }
    type_dirs = {
        "entities": meta / "entities",
        "calculations": meta / "calculations",
        "settings": meta / "settings",
        "detection_models": meta / "detection_models",
    }
    for type_name, type_dir in type_dirs.items():
        manifest["items"][type_name] = {}
        if type_dir.exists():
            for f in sorted(type_dir.rglob("*.json")):
                item_id = f.stem
                manifest["items"][type_name][item_id] = {
                    "checksum": compute_checksum(f),
                    "version": "1.0.0",
                    "path": str(f.relative_to(meta)),
                }
    return manifest

if __name__ == "__main__":
    ws = Path("workspace")
    manifest = generate_manifest(ws)
    out = ws / "metadata" / "oob_manifest.json"
    out.write_text(json.dumps(manifest, indent=2))
    total = sum(len(v) for v in manifest["items"].values())
    print(f"Generated OOB manifest: {total} items, version {manifest['oob_version']}")
```

**Step 2:** Run `uv run python -m scripts.generate_oob_manifest`.

**Step 3:** Verify manifest has entries for all 8 entities, 10 calculations, ~10 settings, 5 detection models.

**Step 4:** Commit: `feat(phase11): add OOB manifest generation script and initial manifest (M84)`

### Task 84.2: Add `metadata_layer` to Pydantic Models

**Files:**
- Modify: `backend/models/entities.py` — add to `EntityDefinition`
- Modify: `backend/models/calculations.py` — add to `CalculationDefinition`
- Modify: `backend/models/settings.py` — add to `SettingDefinition`
- Modify: `backend/models/detection.py` — add to `DetectionModelDefinition`

**Step 1:** Add to each model class:

```python
metadata_layer: str = Field(default="oob", exclude=True)
```

The `exclude=True` prevents `model_dump_json()` from writing this field to disk. It's set at load time by MetadataService.

**Step 2:** Run `uv run pytest tests/ -v --ignore=tests/e2e` — all 279 tests pass (field has a default, existing JSON parses fine).

**Step 3:** Commit: `feat(phase11): add metadata_layer field to all Pydantic models (M84)`

### Task 84.3: Create user_overrides Directory Structure

**Files:**
- Create: `workspace/metadata/user_overrides/` with subdirs mirroring existing structure

**Step 1:** Create directories with `.gitkeep` files. **IMPORTANT:** Check actual directory names first:
- `calculations/aggregations/` (plural)
- `calculations/time_windows/` (plural)
- `calculations/transaction/` (singular)
- `calculations/derived/` (singular)
- `settings/thresholds/`
- `settings/score_steps/`
- `settings/score_thresholds/`

Mirror exact names under `user_overrides/`.

**Step 2:** Commit: `chore(phase11): create user_overrides directory structure (M84)`

### Task 84.4: Update MetadataService with Layer Resolution

**Files:**
- Modify: `backend/services/metadata_service.py`

**Step 1:** Add manifest and user_overrides path helpers:

```python
def _oob_manifest_path(self) -> Path:
    return self._base / "oob_manifest.json"

def _user_overrides_base(self) -> Path:
    return self._base / "user_overrides"

def load_oob_manifest(self) -> dict:
    path = self._oob_manifest_path()
    if path.exists():
        return json.loads(path.read_text())
    return {"oob_version": "0.0.0", "items": {}}

def is_oob_item(self, item_type: str, item_id: str) -> bool:
    manifest = self.load_oob_manifest()
    return item_id in manifest.get("items", {}).get(item_type, {})
```

**Step 2:** Add user_override path helpers per type:

```python
def _user_entity_path(self, entity_id: str) -> Path:
    return self._user_overrides_base() / "entities" / f"{entity_id}.json"

def _user_calc_path(self, calc_id: str) -> Path | None:
    base = self._user_overrides_base() / "calculations"
    if not base.exists():
        return None
    for f in base.rglob(f"{calc_id}.json"):
        return f
    return None

def _user_setting_path(self, setting_id: str) -> Path | None:
    base = self._user_overrides_base() / "settings"
    if not base.exists():
        return None
    for f in base.rglob(f"{setting_id}.json"):
        return f
    return None

def _user_detection_model_path(self, model_id: str) -> Path:
    return self._user_overrides_base() / "detection_models" / f"{model_id}.json"
```

**Step 3:** Fix existing `_calc_path()` and `_setting_path()` to exclude user_overrides:

```python
def _calc_path(self, calc_id: str) -> Path | None:
    for f in self._calc_dir().rglob(f"{calc_id}.json"):
        if "user_overrides" not in str(f):
            return f
    return None
```

Same for `_setting_path()`.

**Step 4:** Update `load_entity()` to check user_overrides first:

```python
def load_entity(self, entity_id: str) -> EntityDefinition | None:
    user_path = self._user_entity_path(entity_id)
    if user_path.exists():
        entity = EntityDefinition.model_validate_json(user_path.read_text())
        entity.metadata_layer = "user"
        return entity
    path = self._entity_path(entity_id)
    if not path.exists():
        return None
    entity = EntityDefinition.model_validate_json(path.read_text())
    entity.metadata_layer = "oob"
    return entity
```

Apply same pattern to `load_calculation()`, `load_setting()`, `load_detection_model()`.

**Step 5:** Update `list_entities()` to merge both layers:

```python
def list_entities(self) -> list[EntityDefinition]:
    items: dict[str, EntityDefinition] = {}
    folder = self._base / "entities"
    if folder.exists():
        for f in sorted(folder.glob("*.json")):
            ent = EntityDefinition.model_validate_json(f.read_text())
            ent.metadata_layer = "oob"
            items[ent.entity_id] = ent
    user_folder = self._user_overrides_base() / "entities"
    if user_folder.exists():
        for f in sorted(user_folder.glob("*.json")):
            ent = EntityDefinition.model_validate_json(f.read_text())
            ent.metadata_layer = "user"
            items[ent.entity_id] = ent
    return sorted(items.values(), key=lambda e: e.entity_id)
```

Apply same merge pattern to `list_calculations()`, `list_settings()`, `list_detection_models()`.

**Step 6:** Update `save_entity()` to route OOB items to user_overrides:

```python
def save_entity(self, entity: EntityDefinition) -> None:
    if self.is_oob_item("entities", entity.entity_id):
        path = self._user_entity_path(entity.entity_id)
    else:
        path = self._entity_path(entity.entity_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(entity.model_dump_json(indent=2))
```

Apply same pattern to other save methods. For calculations, user override path includes layer: `self._user_overrides_base() / "calculations" / calc.layer.value / f"{calc.calc_id}.json"`.

**Step 7:** Update delete methods to handle layers:

```python
def delete_entity(self, entity_id: str) -> bool:
    user_path = self._user_entity_path(entity_id)
    if user_path.exists():
        user_path.unlink()
        return True
    if not self.is_oob_item("entities", entity_id):
        path = self._entity_path(entity_id)
        if path.exists():
            path.unlink()
            return True
    return False  # Can't delete OOB originals
```

**Step 8:** Add helper methods:

```python
def _has_user_override(self, item_type: str, item_id: str) -> bool:
    if item_type == "entities":
        return self._user_entity_path(item_id).exists()
    elif item_type == "calculations":
        return self._user_calc_path(item_id) is not None
    elif item_type == "settings":
        return self._user_setting_path(item_id) is not None
    elif item_type == "detection_models":
        return self._user_detection_model_path(item_id).exists()
    return False

def get_item_layer_info(self, item_type: str, item_id: str) -> dict:
    is_oob = self.is_oob_item(item_type, item_id)
    has_override = self._has_user_override(item_type, item_id)
    manifest = self.load_oob_manifest()
    oob_info = manifest.get("items", {}).get(item_type, {}).get(item_id)
    return {
        "layer": "user" if has_override else ("oob" if is_oob else "user"),
        "is_oob": is_oob,
        "has_override": has_override,
        "oob_version": oob_info.get("version") if oob_info else None,
    }

def delete_user_override(self, item_type: str, item_id: str) -> bool:
    if not self.is_oob_item(item_type, item_id):
        return False
    path = None
    if item_type == "entities":
        path = self._user_entity_path(item_id)
    elif item_type == "calculations":
        path = self._user_calc_path(item_id)
    elif item_type == "settings":
        path = self._user_setting_path(item_id)
    elif item_type == "detection_models":
        path = self._user_detection_model_path(item_id)
    if path and path.exists():
        path.unlink()
        return True
    return False

def load_oob_version(self, item_type: str, item_id: str) -> dict | None:
    if not self.is_oob_item(item_type, item_id):
        return None
    path = None
    if item_type == "entities":
        path = self._entity_path(item_id)
    elif item_type == "calculations":
        path = self._calc_path(item_id)
    elif item_type == "settings":
        path = self._setting_path(item_id)
    elif item_type == "detection_models":
        path = self._base / "detection_models" / f"{item_id}.json"
    if path and path.exists():
        return json.loads(path.read_text())
    return None
```

**Step 9:** Run `uv run pytest tests/ -v --ignore=tests/e2e` — all tests pass.

**Step 10:** Commit: `feat(phase11): add layer resolution to MetadataService (M84)`

### Task 84.5: Backend Layer Resolution Tests

**Files:**
- Create: `tests/test_metadata_layers.py`

**Step 1:** Write fixture with OOB + user_overrides structure and manifest.

**Step 2:** Write 12 tests:
1. `test_load_entity_oob_default` — loads product, `metadata_layer == "oob"`
2. `test_load_entity_with_user_override` — user override wins, `metadata_layer == "user"`
3. `test_list_entities_merges_layers` — OOB + user override + user-new all present
4. `test_save_oob_entity_creates_override` — save product writes to user_overrides/
5. `test_save_new_entity_in_standard_dir` — new entity writes to standard entities/ dir
6. `test_delete_user_override_reverts` — delete override, load returns OOB version
7. `test_delete_oob_item_blocked` — cannot delete OOB item directly
8. `test_is_oob_item_true` — product is in manifest
9. `test_is_oob_item_false` — random_entity not in manifest
10. `test_load_oob_version` — returns original even when override exists
11. `test_get_item_layer_info_oob` — unmodified OOB item
12. `test_get_item_layer_info_overridden` — OOB item with user override

**Step 3:** Run `uv run pytest tests/test_metadata_layers.py -v` — all 12 pass.

**Step 4:** Run `uv run pytest tests/ -v --ignore=tests/e2e` — all pass (~291).

**Step 5:** Commit: `test(phase11): add layer resolution tests — 12 new tests (M84)`

---

## M85: Layer-Aware API Endpoints

### Task 85.1: Expose Layer Info in API Responses

**Files:**
- Modify: `backend/api/metadata.py`

**Step 1:** Update all GET single-item endpoints to include layer info. Since `metadata_layer` is `exclude=True`, add it explicitly:

```python
@router.get("/entities/{entity_id}")
def get_entity(entity_id: str, request: Request):
    svc = request.app.state.metadata
    entity = svc.load_entity(entity_id)
    if not entity:
        raise HTTPException(404)
    data = entity.model_dump()
    data["metadata_layer"] = entity.metadata_layer
    data["_layer"] = svc.get_item_layer_info("entities", entity_id)
    return data
```

**Step 2:** Update GET list endpoints — each item gets `metadata_layer`:

```python
@router.get("/entities")
def list_entities(request: Request):
    svc = request.app.state.metadata
    result = []
    for e in svc.list_entities():
        d = e.model_dump()
        d["metadata_layer"] = e.metadata_layer
        result.append(d)
    return result
```

Apply to all 4 type list/get endpoints.

**Step 3:** Run tests — verify existing tests pass with extra fields.

**Step 4:** Commit: `feat(phase11): expose metadata_layer in all API responses (M85)`

### Task 85.2: Add Layer-Specific Endpoints

**Files:**
- Modify: `backend/api/metadata.py`

**Step 1:** Add endpoints with `/layers/` prefix to avoid route conflicts:

```python
@router.get("/oob-manifest")
def get_oob_manifest(request: Request):
    return request.app.state.metadata.load_oob_manifest()

@router.get("/layers/{item_type}/{item_id}/info")
def get_layer_info(item_type: str, item_id: str, request: Request):
    valid = ["entities", "calculations", "settings", "detection_models"]
    if item_type not in valid:
        raise HTTPException(400, f"Invalid type. Must be one of: {valid}")
    return request.app.state.metadata.get_item_layer_info(item_type, item_id)

@router.post("/layers/{item_type}/{item_id}/reset")
def reset_to_oob(item_type: str, item_id: str, request: Request):
    svc = request.app.state.metadata
    if not svc.is_oob_item(item_type, item_id):
        raise HTTPException(400, "Item is not an OOB item")
    if not svc.delete_user_override(item_type, item_id):
        raise HTTPException(404, "No user override found")
    return {"reset": True, "item_type": item_type, "item_id": item_id}

@router.get("/layers/{item_type}/{item_id}/oob")
def get_oob_version_endpoint(item_type: str, item_id: str, request: Request):
    oob = request.app.state.metadata.load_oob_version(item_type, item_id)
    if oob is None:
        raise HTTPException(404, "No OOB version found")
    return oob

@router.get("/layers/{item_type}/{item_id}/diff")
def get_item_diff(item_type: str, item_id: str, request: Request):
    svc = request.app.state.metadata
    oob = svc.load_oob_version(item_type, item_id)
    if oob is None:
        return {"has_diff": False, "changes": []}
    # Load current as dict
    current = _load_current_as_dict(svc, item_type, item_id)
    if current is None:
        return {"has_diff": False, "changes": []}
    changes = []
    all_keys = set(oob.keys()) | set(current.keys())
    for key in sorted(all_keys - {"metadata_layer", "_layer"}):
        if oob.get(key) != current.get(key):
            changes.append({"field": key, "oob_value": oob.get(key), "current_value": current.get(key)})
    return {"has_diff": len(changes) > 0, "changes": changes}
```

Add `_load_current_as_dict()` helper that loads item and returns `model_dump()`.

**Step 2:** Commit: `feat(phase11): add layer-info, reset-to-oob, and diff endpoints (M85)`

### Task 85.3: Layer API Tests

**Files:**
- Create: `tests/test_metadata_layer_api.py`

**Step 1:** Write fixture with TestClient + monkeypatch (same pattern as `tests/test_regulatory_api.py`).

**Step 2:** Write 10 tests:
1. `test_get_entity_has_layer_field`
2. `test_list_entities_has_layer`
3. `test_get_oob_manifest`
4. `test_get_layer_info_oob`
5. `test_save_then_layer_info_user` — PUT entity, layer-info shows "user"
6. `test_reset_to_oob` — POST reset, layer-info shows "oob"
7. `test_get_oob_version` — returns original content
8. `test_get_diff_no_changes` — unmodified returns empty
9. `test_get_diff_with_override` — modified shows changes
10. `test_delete_oob_protected` — DELETE OOB item without override fails

**Step 3:** Run `uv run pytest tests/test_metadata_layer_api.py -v` — all 10 pass.

**Step 4:** Run `uv run pytest tests/ -v --ignore=tests/e2e` — all pass (~301).

**Step 5:** Commit: `test(phase11): add layer API integration tests — 10 new tests (M85)`

---

## M86: Frontend Layer UI

### Task 86.1: Expand TS Types and Store Actions

**Files:**
- Modify: `frontend/src/stores/metadataStore.ts`

**Step 1:** Add `metadata_layer` and `_layer` to all 4 interfaces:

```typescript
export interface EntityDef {
  // ... existing fields
  metadata_layer?: string;
  _layer?: { is_oob: boolean; has_override: boolean; oob_version: string | null };
}
```

**Step 2:** Add store actions:

```typescript
fetchOobManifest: () => Promise<Record<string, unknown>>;
getLayerInfo: (type: string, id: string) => Promise<Record<string, unknown>>;
resetToOob: (type: string, id: string) => Promise<void>;
getDiff: (type: string, id: string) => Promise<{ has_diff: boolean; changes: Array<Record<string, unknown>> }>;
```

**Step 3:** Run `cd frontend && npm run build` — verify clean.

**Step 4:** Commit: `feat(phase11): add layer types and store actions to metadataStore (M86)`

### Task 86.2: Create LayerBadge Component

**Files:**
- Create: `frontend/src/components/LayerBadge.tsx`

**Step 1:** Create pill component showing "OOB" (cyan), "Modified" (amber), or "Custom" (purple) based on layer info. Include a `data-tour="layer-badge"` attribute on the outermost element. Add a `HelpButton` next to the badge text with tooltip explaining the three layer states:
- OOB = "Out-of-box: shipped with the platform, unmodified"
- Modified = "OOB item with user customizations (can be reset)"
- Custom = "User-created item, not part of the OOB package"

**Step 2:** Commit: `feat(phase11): add LayerBadge component with tooltip (M86)`

### Task 86.3: Create ResetToOobButton Component

**Files:**
- Create: `frontend/src/components/ResetToOobButton.tsx`

**Step 1:** Create button with confirmation dialog. Only visible when item is OOB with user override. On confirm, calls `resetToOob()` then refreshes. Add `data-tour="reset-to-oob"` attribute. Include `HelpButton` tooltip: "Discard your customizations and restore the original out-of-box definition."

**Step 2:** Commit: `feat(phase11): add ResetToOobButton component with tooltip (M86)`

### Task 86.4: Update MetadataEditor with Layer Indicators

**Files:**
- Modify: `frontend/src/views/MetadataEditor/index.tsx`

**Step 1:** Add LayerBadge next to item selector showing current item's layer. Add `data-tour="editor-layer-badge"` on the badge container.

**Step 2:** Add info banner when editing OOB item: "Out-of-box item. Editing will create a user override." with amber background and info icon. Add `data-tour="editor-oob-banner"` attribute.

**Step 3:** Add ResetToOobButton in bottom bar next to Save. Add `data-tour="editor-reset-oob"` attribute.

**Step 4:** Run `cd frontend && npm run build` — verify clean.

**Step 5:** Commit: `feat(phase11): integrate layer indicators into MetadataEditor (M86)`

### Task 86.5: Add LayerBadge to Existing Views

**Files:**
- Modify: `frontend/src/views/EntityDesigner/index.tsx`
- Modify: `frontend/src/views/MetadataExplorer/index.tsx`
- Modify: `frontend/src/views/SettingsManager/index.tsx`
- Modify: `frontend/src/views/ModelComposer/index.tsx`

**Step 1:** Add LayerBadge next to item names in each view's list. Use `item.metadata_layer` from API response. Add `data-tour="entity-layer-badge"`, `data-tour="calc-layer-badge"`, `data-tour="setting-layer-badge"`, `data-tour="model-layer-badge"` respectively.

**Step 2:** Run `cd frontend && npm run build` — verify clean.

**Step 3:** Commit: `feat(phase11): add LayerBadge to EntityDesigner, MetadataExplorer, SettingsManager, ModelComposer (M86)`

---

## M87: Version Tracking + Upgrade Simulation

### Task 87.1: Create OobVersionService

**Files:**
- Create: `backend/services/oob_version_service.py`

**Step 1:** Create service with:
- `get_version()` — reads OOB version from manifest
- `get_summary()` — returns version, OOB item count, user override count
- `compare_manifests(old, new) -> UpgradeReport` — compares two manifests, returns added/removed/modified/conflicts
- `simulate_upgrade(new_manifest) -> UpgradeReport` — dry-run comparison

`UpgradeReport` Pydantic model: `from_version`, `to_version`, `added`, `removed`, `modified`, `user_overrides_intact`, `conflicts`.

**Step 2:** Commit: `feat(phase11): add OobVersionService for version tracking (M87)`

### Task 87.2: Add Upgrade API Endpoints

**Files:**
- Modify: `backend/api/metadata.py`

**Step 1:** Add:
- `GET /api/metadata/oob-version` — returns version summary
- `POST /api/metadata/oob-upgrade/simulate` — accepts manifest body, returns UpgradeReport

**Step 2:** Commit: `feat(phase11): add OOB version and upgrade simulation endpoints (M87)`

### Task 87.3: Create Demo Upgrade Manifest

**Files:**
- Create: `workspace/metadata/demo_upgrade_manifest.json`

**Step 1:** Create v1.1.0 manifest with simulated changes: 1 new calc added, 1 existing calc modified checksum, 1 setting modified. Used purely for demo.

**Step 2:** Commit: `feat(phase11): add demo upgrade manifest v1.1.0 (M87)`

### Task 87.4: Frontend OOB Version Panel

**Files:**
- Create: `frontend/src/views/MetadataEditor/OobVersionPanel.tsx`
- Modify: `frontend/src/views/MetadataEditor/index.tsx`

**Step 1:** Create collapsible panel showing OOB version, item counts, "Simulate Upgrade" button with report display. Add `data-tour="oob-version-panel"` on the outer container. Add `data-tour="oob-upgrade-btn"` on the Simulate Upgrade button. Include `HelpButton` with tooltip: "Shows the current out-of-box metadata version and lets you preview what would change during an upgrade."

**Step 2:** When upgrade report is displayed, show a summary table with color-coded rows: green=added, amber=modified, red=conflicts. Add `data-tour="oob-upgrade-report"` on the report container.

**Step 3:** Add panel to MetadataEditor below the type selector.

**Step 4:** Run `cd frontend && npm run build`.

**Step 5:** Commit: `feat(phase11): add OOB version panel with upgrade simulation (M87)`

### Task 87.5: Version Service Tests

**Files:**
- Create: `tests/test_oob_version_service.py`

**Step 1:** Write 8 tests:
1. `test_get_version`
2. `test_get_summary`
3. `test_compare_no_changes`
4. `test_compare_added_items`
5. `test_compare_removed_items`
6. `test_compare_modified_items`
7. `test_compare_conflicts`
8. `test_simulate_upgrade`

**Step 2:** Run `uv run pytest tests/test_oob_version_service.py -v` — all 8 pass.

**Step 3:** Run `uv run pytest tests/ -v --ignore=tests/e2e` — all pass (~309).

**Step 4:** Commit: `test(phase11): add OOB version service tests — 8 new tests (M87)`

---

## M88: E2E Tests, Onboarding, Tours & Documentation

### Task 88.1: Regenerate Snapshots

**Step 1:** Run `uv run python -m scripts.generate_snapshots` — regenerates all 8 snapshots. `demo_controller.py` auto-includes `user_overrides/` and `oob_manifest.json`.

**Step 2:** Verify `workspace/snapshots/pristine/metadata/oob_manifest.json` exists.

**Step 3:** Commit: `chore(phase11): regenerate snapshots with OOB manifest (M88)`

### Task 88.2: Comprehensive E2E Tests

**Files:**
- Modify: `tests/e2e/test_e2e_views.py`

**Step 1:** Add `TestOobLayers` class with 10 tests covering the full OOB workflow:

**UI Layer Badge Tests:**
1. `test_editor_shows_layer_badge` — navigate to `/editor`, verify "OOB" badge text visible next to item selector
2. `test_entity_designer_layer_badges` — navigate to `/entities`, verify at least one "OOB" badge visible in entity list
3. `test_metadata_explorer_layer_badges` — navigate to `/metadata`, verify badges on calculation list
4. `test_settings_manager_layer_badges` — navigate to `/settings`, verify badges
5. `test_model_composer_layer_badges` — navigate to `/models`, verify badges

**Editor OOB Integration Tests:**
6. `test_oob_info_banner_visible` — navigate to `/editor`, select an entity, verify the amber info banner "Out-of-box item" is shown
7. `test_oob_version_panel_visible` — navigate to `/editor`, verify OOB version panel is present with version number text
8. `test_reset_button_hidden_for_unmodified` — navigate to `/editor`, select OOB entity, verify "Reset to OOB" button is NOT visible (no override yet)

**Layer API Tests:**
9. `test_layer_api_oob_manifest` — fetch `/api/metadata/oob-manifest` via `page.evaluate`, verify response has `oob_version` and `items` with `entities` key
10. `test_layer_api_entity_has_layer` — fetch `/api/metadata/entities` via `page.evaluate`, verify first entity has `metadata_layer` field set to `"oob"`

**Step 2:** Commit: `test(phase11): add E2E tests for OOB layer features — 10 new tests (M88)`

### Task 88.3: Comprehensive Guided Tour

**Files:**
- Modify: `frontend/src/data/tourDefinitions.ts`

**Step 1:** Add `oob` tour with 7 steps providing a complete walkthrough:

```typescript
oob: {
  id: "oob",
  name: "OOB vs Custom Metadata Tour",
  description: "Learn how out-of-box metadata is separated from user customizations.",
  steps: [
    {
      target: "[data-tour='editor-type-selector']",
      title: "Metadata Types",
      content: "All metadata types (Entities, Calculations, Settings, Models) support OOB/User layer separation.",
      placement: "bottom",
      route: "/editor",
    },
    {
      target: "[data-tour='editor-layer-badge']",
      title: "Layer Badge",
      content: "The layer badge shows the item's provenance: OOB (shipped with the platform), Modified (OOB with your edits), or Custom (user-created).",
      placement: "bottom",
    },
    {
      target: "[data-tour='editor-oob-banner']",
      title: "OOB Info Banner",
      content: "When you select an out-of-box item, this banner reminds you that editing will create a user override — the original is preserved.",
      placement: "bottom",
    },
    {
      target: "[data-tour='editor-json']",
      title: "Edit an OOB Item",
      content: "Try editing a field in the JSON editor. When you save, your changes are stored as a user override. The original OOB definition stays untouched.",
      placement: "right",
    },
    {
      target: "[data-tour='editor-reset-oob']",
      title: "Reset to OOB",
      content: "After modifying an OOB item, the Reset button appears. Click it to discard your override and restore the original out-of-box definition.",
      placement: "top",
    },
    {
      target: "[data-tour='oob-version-panel']",
      title: "OOB Version & Upgrade",
      content: "The version panel shows which OOB package is installed, how many items are included, and how many you've customized.",
      placement: "right",
    },
    {
      target: "[data-tour='oob-upgrade-btn']",
      title: "Simulate Upgrade",
      content: "Click 'Simulate Upgrade' to preview what would happen if a new OOB version were installed — added items, modified items, and potential conflicts with your overrides.",
      placement: "bottom",
    },
  ],
},
```

**Step 2:** Also add OOB-related steps to the existing `act2_guide` tour (append after Model Composition steps):

```typescript
{
  target: "[data-tour='editor-layer-badge']",
  title: "OOB Layer Separation",
  content: "Notice the layer badges — OOB items ship with the platform. When you customize one, it becomes 'Modified' and can be reset to the original.",
  placement: "bottom",
  route: "/editor",
},
```

**Step 3:** Commit: `feat(phase11): add comprehensive OOB guided tour — 7 steps + act2 integration (M88)`

### Task 88.4: Onboarding Modal Update

**Files:**
- Modify: `frontend/src/components/OnboardingModal.tsx`

**Step 1:** Update the "Configure" card in the onboarding modal grid to reflect OOB layer features. Change:
```typescript
{ label: "Configure", desc: "Settings & mappings" }
```
to:
```typescript
{ label: "Configure", desc: "Settings, mappings & OOB layers" }
```

**Step 2:** Run `cd frontend && npm run build` — verify clean.

**Step 3:** Commit: `feat(phase11): update onboarding modal with OOB layer mention (M88)`

### Task 88.5: Documentation Updates

**Files:**
- Modify: `docs/demo-guide.md`
- Modify: `docs/progress.md`

**Step 1:** Add to demo guide a new section: **"OOB vs User Metadata (Configure → Editor) — Phase 11"** with interactive walkthroughs:
- **Walkthrough A: Viewing Layers** — navigate to Editor, observe OOB badges on all items, check Entity Designer for badges
- **Walkthrough B: Creating a User Override** — select product entity, edit description, save → badge changes to "Modified", info banner confirms override
- **Walkthrough C: Resetting to OOB** — click "Reset to OOB" button, confirm → badge reverts to "OOB", original definition restored
- **Walkthrough D: Upgrade Simulation** — open OOB Version Panel, click "Simulate Upgrade", review report showing added/modified/conflict items
- **Walkthrough E: Cross-View Badges** — visit Entity Designer, Settings Manager, Model Composer — all show layer badges consistently

**Step 2:** Add to progress tracker: Phase 11 Overall Status row, M84-M88 milestones with descriptions.

**Step 3:** Save plan as `docs/plans/2026-02-24-phase11-oob-separation-plan.md`.

**Step 4:** Commit: `docs(phase11): update progress tracker and demo guide (M88)`

---

## File Inventory

### New Files (~11)
| File | Milestone |
|------|-----------|
| `scripts/generate_oob_manifest.py` | M84 |
| `workspace/metadata/oob_manifest.json` | M84 |
| `workspace/metadata/user_overrides/**/.gitkeep` | M84 |
| `tests/test_metadata_layers.py` | M84 |
| `tests/test_metadata_layer_api.py` | M85 |
| `frontend/src/components/LayerBadge.tsx` | M86 |
| `frontend/src/components/ResetToOobButton.tsx` | M86 |
| `backend/services/oob_version_service.py` | M87 |
| `frontend/src/views/MetadataEditor/OobVersionPanel.tsx` | M87 |
| `workspace/metadata/demo_upgrade_manifest.json` | M87 |
| `tests/test_oob_version_service.py` | M87 |

### Modified Files (~17)
| File | Milestone |
|------|-----------|
| `backend/models/entities.py` | M84 |
| `backend/models/calculations.py` | M84 |
| `backend/models/settings.py` | M84 |
| `backend/models/detection.py` | M84 |
| `backend/services/metadata_service.py` | M84 |
| `backend/api/metadata.py` | M85, M87 |
| `frontend/src/stores/metadataStore.ts` | M86 |
| `frontend/src/views/MetadataEditor/index.tsx` | M86, M87 |
| `frontend/src/views/EntityDesigner/index.tsx` | M86 |
| `frontend/src/views/MetadataExplorer/index.tsx` | M86 |
| `frontend/src/views/SettingsManager/index.tsx` | M86 |
| `frontend/src/views/ModelComposer/index.tsx` | M86 |
| `frontend/src/components/OnboardingModal.tsx` | M88 |
| `frontend/src/data/tourDefinitions.ts` | M88 |
| `docs/demo-guide.md` | M88 |
| `docs/progress.md` | M88 |
| `tests/e2e/test_e2e_views.py` | M88 |

### NOT Modified
- All existing plan files in `docs/plans/`
- `backend/config.py`, `backend/db.py`

---

## Verification

After all milestones:

**Automated:**
1. `uv run pytest tests/ -v --ignore=tests/e2e` — all backend tests pass (~309)
2. `cd frontend && npm run build` — clean build, no TS errors
3. `uv run pytest tests/e2e/test_e2e_views.py -v` — all E2E tests pass (~71+)

**Manual — Layer UI:**
4. MetadataEditor → select entity → "OOB" badge visible with `?` tooltip
5. Edit OOB entity name → Save → badge changes to "Modified"
6. Click "Reset to OOB" → confirm → badge reverts to "OOB"
7. EntityDesigner list → LayerBadge next to each entity name
8. SettingsManager list → LayerBadge visible
9. ModelComposer list → LayerBadge visible
10. MetadataExplorer list → LayerBadge visible

**Manual — Version & Upgrade:**
11. OOB Version panel in Editor → version "1.0.0" and item counts displayed
12. "Simulate Upgrade" button → upgrade report with color-coded rows (added/modified/conflicts)

**Manual — Onboarding & Tours:**
13. Clear localStorage → reload → onboarding modal shows "Settings, mappings & OOB layers" under Configure
14. Start "OOB vs Custom Metadata" tour from tour menu → 7 steps guide through layer features
15. Act 2 guide includes OOB layer step at the end

**Manual — Demo Controls:**
16. Demo Reset → all user_overrides cleared, badges revert to OOB
17. Demo Skip to End → all features work correctly with OOB data

**Manual — Explainability:**
18. Hover `?` next to LayerBadge → tooltip explains OOB/Modified/Custom
19. Hover `?` next to OOB Version Panel → tooltip explains version tracking
20. Info banner "Out-of-box item..." appears when editing OOB item, disappears for Custom items
