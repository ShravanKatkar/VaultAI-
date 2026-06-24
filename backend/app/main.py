import time
import sqlite3
import os
import sys
# Force tensorflow and keras to be unavailable to avoid import conflicts and speed up startup
sys.modules['tensorflow'] = None
sys.modules['keras'] = None
sys.modules['tf_keras'] = None

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import chromadb

from app.config import settings
from app.api.routes import router as api_router
from eval.routes import router as eval_router

DB_PATH = os.path.join(os.getcwd(), "eval_results.db")

def init_db() -> None:
    """Initialize SQLite database for evaluation run tracking."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS eval_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            collection_name TEXT,
            hit_at_3 REAL,
            avg_rouge_l REAL,
            avg_latency_ms REAL,
            results_json TEXT
        )
    """)
    conn.commit()
    conn.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database
    init_db()
    
    # Warm up ChromaDB persistent client on startup
    try:
        # Ensure the directory exists
        os.makedirs(settings.CHROMA_PATH, exist_ok=True)
        # Instantiate Chroma client to warm it up
        client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
        collections = client.list_collections()
        print(f"[Startup] ChromaDB warmed up at: {settings.CHROMA_PATH}")
        print(f"[Startup] Existing collections: {[c.name for c in collections]}")
    except Exception as e:
        print(f"[Startup] Warning: ChromaDB warm-up failed: {e}")
        
    yield
    # Shutdown logic (none needed)

app = FastAPI(
    title="VaultAI API",
    description="Private document intelligence RAG system, fully offline.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Timing middleware to record and add X-Response-Time header
@app.middleware("http")
async def add_timing_middleware(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_time) * 1000
    response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
    return response

# Include endpoint routers
app.include_router(api_router)
app.include_router(eval_router, prefix="/eval")
