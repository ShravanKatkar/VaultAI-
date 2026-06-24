import os
import re
import json
import shutil
import tempfile
from pathlib import Path
from typing import List

from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import StreamingResponse
import chromadb

from app.config import settings, Settings
from app.api.schemas import UploadResponse, QueryRequest, DocumentInfo, SourceChunk
from app.ingestion.loader import load_document
from app.ingestion.chunker import chunk_documents
from app.ingestion.embedder import embed_and_store
from app.rag.chain import build_rag_chain, get_source_documents

router = APIRouter()

def sanitize_collection_name(filename: str) -> str:
    """
    Sanitizes a filename to create a valid Chroma collection name.
    Chroma requirements:
    - 3-63 characters
    - Starts and ends with an alphanumeric character
    - Contains only alphanumeric, underscores, or hyphens (no periods)
    - No double periods (or double underscores/hyphens for cleanliness)
    """
    name = Path(filename).stem
    # Replace any non-alphanumeric, non-underscore, non-hyphen character with underscore
    sanitized = re.sub(r'[^a-zA-Z0-9_-]', '_', name)
    # Collapse multiple consecutive underscores or hyphens
    sanitized = re.sub(r'[-_]{2,}', '_', sanitized)
    # Strip leading/trailing underscores/hyphens
    sanitized = sanitized.strip('_-')
    
    # Ensure min length of 3
    if len(sanitized) < 3:
        sanitized = f"col_{sanitized}"
        
    # Ensure max length of 63
    sanitized = sanitized[:63]
    # Strip again in case truncation left a trailing hyphen/underscore
    sanitized = sanitized.strip('_-')
    
    return sanitized.lower()

@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    collection_name: str = Form(None)
):
    """
    Uploads a document (PDF, TXT, MD), parses, chunks, embeds, and stores it in ChromaDB.
    """
    filename = file.filename
    suffix = Path(filename).suffix.lower()
    
    if suffix not in (".pdf", ".txt", ".md"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format: {suffix}. Only .pdf, .txt, and .md are supported."
        )
        
    # Determine collection name
    if collection_name:
        # Validate custom collection name
        if not re.match(r'^[a-zA-Z0-9][a-zA-Z0-9_-]{1,61}[a-zA-Z0-9]$', collection_name):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid collection_name format. Must be 3-63 characters, "
                    "start/end with alphanumeric, and contain only alphanumeric, underscores, or hyphens."
                )
            )
        target_collection_name = collection_name
    else:
        target_collection_name = sanitize_collection_name(filename)
        
    # Save the file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
        try:
            shutil.copyfileobj(file.file, tmp_file)
            tmp_path = Path(tmp_file.name)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to write temporary upload file: {e}")
            
    try:
        # Run ingestion pipeline
        docs = load_document(tmp_path, filename)
        chunks = chunk_documents(docs)
        chunks_stored = embed_and_store(chunks, target_collection_name, settings)
        
        status = "stored" if chunks_stored > 0 else "duplicate_skipped"
        
        return UploadResponse(
            filename=filename,
            collection_name=target_collection_name,
            chunks_stored=chunks_stored,
            status=status
        )
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=404, detail=str(fnf))
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion pipeline failed: {e}")
    finally:
        # Ensure temporary file cleanup
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@router.get("/documents", response_model=List[DocumentInfo])
async def list_documents():
    """
    Lists all collections stored in ChromaDB, including metadata and chunk counts.
    """
    try:
        chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
        collections = chroma_client.list_collections()
        
        docs_info = []
        for col in collections:
            count = col.count()
            if count == 0:
                docs_info.append(DocumentInfo(
                    collection_name=col.name,
                    chunk_count=0,
                    filename="Unknown",
                    uploaded_at="N/A"
                ))
                continue
                
            # Fetch the first document in the collection to extract metadata
            results = col.get(limit=1)
            if results and results.get("metadatas") and len(results["metadatas"]) > 0:
                metadata = results["metadatas"][0]
                filename = metadata.get("source", "Unknown")
                uploaded_at = metadata.get("upload_time", "Unknown")
            else:
                filename = "Unknown"
                uploaded_at = "Unknown"
                
            docs_info.append(DocumentInfo(
                collection_name=col.name,
                chunk_count=count,
                filename=filename,
                uploaded_at=uploaded_at
            ))
            
        return docs_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query collections: {e}")

@router.post("/query")
async def query_document(request: QueryRequest):
    """
    Queries a document collection, returning a stream of answer tokens.
    Exposes retrieved source documents in the custom 'X-Sources' response header.
    """
    # Verify collection exists
    try:
        chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
        collections = [c.name for c in chroma_client.list_collections()]
        if request.collection_name not in collections:
            raise HTTPException(
                status_code=404,
                detail=f"Collection '{request.collection_name}' not found."
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
        
    # Copy settings with overridden model name
    try:
        local_settings = Settings(**{**settings.model_dump(), "LLM_MODEL": request.model_name})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to configure settings: {e}")
        
    # Get source documents for header
    sources = get_source_documents(request.collection_name, request.question, local_settings)
    
    # Build RAG chain
    try:
        chain = build_rag_chain(request.collection_name, local_settings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize RAG chain: {e}")
        
    async def response_generator():
        try:
            # chain is constructed using LangChain LCEL (ChatOllama | StrOutputParser)
            # which supports async streaming via astream
            async for chunk in chain.astream(request.question):
                yield chunk
        except Exception as e:
            # Yield error details if streaming fails halfway
            yield f"\n[Streaming Error: {e}]"
            
    # Serialize source documents to headers
    headers = {
        "X-Sources": json.dumps(sources),
        "Access-Control-Expose-Headers": "X-Sources"
    }
    
    return StreamingResponse(response_generator(), media_type="text/plain", headers=headers)

@router.delete("/documents/{collection_name}")
async def delete_document(collection_name: str):
    """
    Deletes the collection and all its vector database records from ChromaDB.
    """
    try:
        chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
        collections = [c.name for c in chroma_client.list_collections()]
        
        if collection_name not in collections:
            raise HTTPException(
                status_code=404,
                detail=f"Collection '{collection_name}' not found."
            )
            
        chroma_client.delete_collection(collection_name)
        return {"status": "deleted", "collection_name": collection_name}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete collection '{collection_name}': {e}")

@router.get("/models")
async def list_models():
    """
    Fetches the list of models available (either from Groq or from the local Ollama instance).
    """
    if settings.USE_GROQ:
        return [
            {"name": "llama3-8b-8192", "size": "8.0B", "speed": 3},
            {"name": "llama3-70b-8192", "size": "70B", "speed": 2},
            {"name": "mixtral-8x7b-32768", "size": "46.7B", "speed": 2},
            {"name": "gemma2-9b-it", "size": "9.0B", "speed": 3}
        ]

    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=5.0)
            
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to fetch models from Ollama.")
            
        data = response.json()
        models_list = data.get("models", [])
        
        result = []
        for m in models_list:
            name = m.get("name")
            details = m.get("details", {})
            param_size = details.get("parameter_size", "Auto")
            capabilities = m.get("capabilities", [])
            
            # Filter out embedding models
            if capabilities:
                is_embedding = "embedding" in capabilities and "completion" not in capabilities
            else:
                is_embedding = "embed" in name.lower() or "bert" in details.get("family", "").lower()
                
            if is_embedding:
                continue
                
            # Estimate speed based on parameter size
            speed = 3
            try:
                if param_size and "B" in param_size.upper():
                    size_val = float(param_size.upper().replace("B", "").strip())
                    if size_val < 4.0:
                        speed = 3
                    elif size_val <= 9.0:
                        speed = 2
                    else:
                        speed = 1
            except Exception:
                pass
                
            result.append({
                "name": name,
                "size": param_size,
                "speed": speed
            })
            
        # Sort so that the default LLM_MODEL from config is at the front of the list
        default_model = settings.LLM_MODEL
        result.sort(key=lambda x: 0 if x["name"] == default_model or x["name"].split(':')[0] == default_model else 1)
        
        return result
    except Exception as e:
        print(f"[API] Error listing Ollama models: {e}")
        raise HTTPException(status_code=500, detail=f"Ollama connection error: {e}")
