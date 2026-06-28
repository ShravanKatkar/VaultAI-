print("[Startup] Initializing backend main.py...")

try:
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
    from fastapi.staticfiles import StaticFiles
    import chromadb

    from app.config import settings
    from app.api.routes import router as api_router
    from eval.routes import router as eval_router

    DB_PATH = os.path.join(os.getcwd(), "eval_results.db")
except Exception as err:
    print(f"[FATAL STARTUP ERROR] Exception raised during backend import: {err}")
    import traceback
    traceback.print_exc()
    raise err

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
    try:
        init_db()
        print(f"[Startup] SQLite database initialized at: {DB_PATH}")
    except Exception as e:
        print(f"[Startup] Warning: SQLite database initialization failed: {e}")
    
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

# Enable CORS for configured origins
allowed_origins = [origin.strip() for origin in settings.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Timing & Private Network Access (PNA) middleware
@app.middleware("http")
async def add_timing_and_pna_middleware(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_time) * 1000
    response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
    
    # Allow Chrome's Private Network Access preflight checks
    if "access-control-request-private-network" in request.headers:
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        
    return response

# Include endpoint routers
app.include_router(api_router)
app.include_router(eval_router, prefix="/eval")

# Mount frontend build directory to serve static assets
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
frontend_dist = os.path.join(base_dir, "frontend", "dist")

if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
    print(f"[Startup] Mounted frontend static files from: {frontend_dist}")
else:
    print(f"[Startup] Warning: Frontend build folder not found at {frontend_dist}. FastAPI will not serve static files.")
