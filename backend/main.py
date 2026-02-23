"""Analytics Platform Demo — FastAPI entry point."""
from fastapi import FastAPI

app = FastAPI(title="Analytics Platform Demo", version="0.1.0")


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
