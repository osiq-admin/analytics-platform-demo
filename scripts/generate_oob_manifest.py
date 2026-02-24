"""Generate OOB manifest from current metadata files."""
import hashlib
import json
from pathlib import Path


def compute_checksum(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:16]


def generate_manifest(workspace_dir: Path) -> dict:
    meta = workspace_dir / "metadata"
    manifest = {
        "oob_version": "1.0.0",
        "description": "Out-of-box metadata for Analytics Platform Demo v1.0",
        "items": {},
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
