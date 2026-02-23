"""Demo control endpoints (state machine, snapshots, reset/resume/skip)."""
from fastapi import APIRouter

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.get("/state")
def get_demo_state():
    return {"checkpoint": "PRISTINE", "act": 0}


@router.post("/reset")
def reset_demo():
    return {"status": "reset"}


@router.post("/step")
def step_demo():
    return {"status": "stepped"}


@router.post("/jump/{act}")
def jump_to_act(act: int):
    return {"status": "jumped", "act": act}


@router.post("/skip-to-end")
def skip_to_end():
    return {"status": "complete"}
