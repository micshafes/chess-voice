from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import engine, master_games, health_check
import logging
import os

# Initialize FastAPI app
app = FastAPI(title="Chess Voice API")

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(asctime)s - %(name)s - %(message)s",
)

logger = logging.getLogger(__name__)

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(engine.router, prefix="/api", tags=["Engine"])
app.include_router(master_games.router, prefix="/api", tags=["Master Games"])
app.include_router(health_check.router, prefix="/api", tags=["Health"])

@app.get("/")
async def root():
    return {"message": "Chess Voice API", "status": "running"}


