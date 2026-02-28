"""Analytics Platform Demo — FastAPI entry point."""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from starlette.responses import FileResponse
from starlette.types import Receive, Scope, Send

from backend.db import lifespan
from backend.api import metadata, query, pipeline, alerts, demo, data, ws, ai, dashboard, trace, data_info, domain_values, match_patterns, score_templates, detection_dry_run, validation, use_cases, submissions, versions, medallion, onboarding, mappings, quality, reference

app = FastAPI(title="Analytics Platform Demo", version="0.1.0", lifespan=lifespan)

# Register API routers
app.include_router(metadata.router)
app.include_router(query.router)
app.include_router(pipeline.router)
app.include_router(alerts.router)
app.include_router(demo.router)
app.include_router(data.router)
app.include_router(ws.router)
app.include_router(ai.router)
app.include_router(dashboard.router)
app.include_router(trace.router)
app.include_router(data_info.router)
app.include_router(domain_values.router)
app.include_router(match_patterns.router)
app.include_router(score_templates.router)
app.include_router(detection_dry_run.router)
app.include_router(validation.router)
app.include_router(use_cases.router)
app.include_router(submissions.router)
app.include_router(versions.router)
app.include_router(medallion.router)
app.include_router(onboarding.router)
app.include_router(mappings.router)
app.include_router(quality.router)
app.include_router(reference.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


# --- Serve React SPA from frontend/dist ---

class SPAStaticFiles:
    """Serve static files with index.html fallback for client-side routing."""

    def __init__(self, directory: Path):
        self._directory = directory
        self._static = StaticFiles(directory=str(directory), html=True)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self._static(scope, receive, send)
            return

        # Try serving the static file first
        try:
            await self._static(scope, receive, send)
        except Exception:
            # Fall back to index.html for SPA client-side routes
            index = self._directory / "index.html"
            if index.exists():
                response = FileResponse(str(index), media_type="text/html")
                await response(scope, receive, send)
            else:
                raise


_frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if _frontend_dist.exists():
    app.mount("/", SPAStaticFiles(directory=_frontend_dist))
