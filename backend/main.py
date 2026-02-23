"""Analytics Platform Demo — FastAPI entry point."""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from backend.db import lifespan
from backend.api import metadata, query, pipeline, alerts, demo, data, ws

app = FastAPI(title="Analytics Platform Demo", version="0.1.0", lifespan=lifespan)

# Register API routers
app.include_router(metadata.router)
app.include_router(query.router)
app.include_router(pipeline.router)
app.include_router(alerts.router)
app.include_router(demo.router)
app.include_router(data.router)
app.include_router(ws.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
