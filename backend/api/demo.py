"""Demo control endpoints (state machine, snapshots, reset/resume/skip)."""
from fastapi import APIRouter, Request

from backend.config import settings
from backend.services.demo_controller import DemoController

router = APIRouter(prefix="/api/demo", tags=["demo"])


def _controller(request: Request) -> DemoController:
    if not hasattr(request.app.state, "demo"):
        request.app.state.demo = DemoController(settings.workspace_dir)
    return request.app.state.demo


@router.get("/state")
def get_demo_state(request: Request):
    return _controller(request).get_state()


@router.post("/reset")
def reset_demo(request: Request):
    return _controller(request).reset()


@router.post("/step")
def step_demo(request: Request):
    return _controller(request).step()


@router.post("/jump/{checkpoint}")
def jump_to_checkpoint(checkpoint: str, request: Request):
    return _controller(request).jump_to(checkpoint)


@router.post("/skip-to-end")
def skip_to_end(request: Request):
    return _controller(request).skip_to_end()


@router.post("/snapshot")
def save_snapshot(request: Request, name: str | None = None):
    ctrl = _controller(request)
    saved = ctrl.save_snapshot(name)
    return {"snapshot": saved}
