"""Demo control endpoints (state machine, snapshots, reset/resume/skip)."""
import logging

from fastapi import APIRouter, Request

from backend.config import settings
from backend.engine.data_loader import DataLoader
from backend.services.demo_controller import DemoController

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/demo", tags=["demo"])


def _controller(request: Request) -> DemoController:
    if not hasattr(request.app.state, "demo"):
        request.app.state.demo = DemoController(settings.workspace_dir)
    return request.app.state.demo


def _reload_data(request: Request) -> list[str]:
    """Re-load CSV data and register result parquet files in DuckDB after snapshot restore."""
    db = request.app.state.db
    loader = DataLoader(settings.workspace_dir, db)
    loaded = loader.load_all()

    # Also register any result parquet files as DuckDB views (in layer subdirs)
    results_dir = settings.workspace_dir / "results"
    if results_dir.exists():
        cursor = db.cursor()
        for pq_file in sorted(results_dir.glob("**/*.parquet")):
            view_name = pq_file.stem  # e.g. calc_value, calc_wash_detection
            try:
                try:
                    cursor.execute(f'DROP VIEW IF EXISTS "{view_name}"')
                except Exception:
                    pass
                try:
                    cursor.execute(f'DROP TABLE IF EXISTS "{view_name}"')
                except Exception:
                    pass
                cursor.execute(
                    f"CREATE VIEW \"{view_name}\" AS SELECT * FROM read_parquet('{pq_file}')"
                )
                loaded.append(view_name)
            except Exception as e:
                log.warning("Failed to register result %s: %s", pq_file.name, e)
        cursor.close()

    # Register alerts summary if present (file may be named summary.parquet or alerts_summary.parquet)
    alerts_pq = settings.workspace_dir / "alerts" / "summary.parquet"
    if not alerts_pq.exists():
        alerts_pq = settings.workspace_dir / "alerts" / "alerts_summary.parquet"
    if alerts_pq.exists():
        cursor = db.cursor()
        try:
            try:
                cursor.execute('DROP VIEW IF EXISTS "alerts_summary"')
            except Exception:
                pass
            try:
                cursor.execute('DROP TABLE IF EXISTS "alerts_summary"')
            except Exception:
                pass
            cursor.execute(
                f"CREATE VIEW \"alerts_summary\" AS SELECT * FROM read_parquet('{alerts_pq}')"
            )
            loaded.append("alerts_summary")
        except Exception as e:
            log.warning("Failed to register alerts_summary: %s", e)
        cursor.close()

    log.info("Data reload after demo state change: %s", loaded)
    return loaded


@router.get("/state")
def get_demo_state(request: Request):
    return _controller(request).get_state()


@router.post("/reset")
def reset_demo(request: Request):
    result = _controller(request).reset()
    _reload_data(request)
    return result


@router.post("/step")
def step_demo(request: Request):
    result = _controller(request).step()
    _reload_data(request)
    return result


@router.post("/jump/{checkpoint}")
def jump_to_checkpoint(checkpoint: str, request: Request):
    result = _controller(request).jump_to(checkpoint)
    _reload_data(request)
    return result


@router.post("/skip-to-end")
def skip_to_end(request: Request):
    result = _controller(request).skip_to_end()
    _reload_data(request)
    return result


@router.post("/snapshot")
def save_snapshot(request: Request, name: str | None = None):
    ctrl = _controller(request)
    saved = ctrl.save_snapshot(name)
    return {"snapshot": saved}
