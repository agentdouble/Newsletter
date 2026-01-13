from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import (
    auth,
    bootstrap,
    contributions,
    editions,
    groups,
    health,
    newsletters,
    users,
)
from .logger import configure_logging
from .settings import get_settings

settings = get_settings()
configure_logging(settings.log_level)

app = FastAPI(title="Anjanews API")

frontend_origin = f"http://localhost:{settings.frontend_port}"
frontend_alt_origin = f"http://127.0.0.1:{settings.frontend_port}"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, frontend_alt_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(editions.router)
app.include_router(bootstrap.router)
app.include_router(contributions.router)
app.include_router(newsletters.router)
app.include_router(users.router)
app.include_router(groups.router)
