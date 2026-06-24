from pydantic import BaseModel, Field

class UploadResponse(BaseModel):
    filename: str
    collection_name: str
    chunks_stored: int
    status: str

class QueryRequest(BaseModel):
    question: str
    collection_name: str
    model_name: str = "llama3"

class DocumentInfo(BaseModel):
    collection_name: str
    chunk_count: int
    filename: str
    uploaded_at: str

class SourceChunk(BaseModel):
    source: str
    page: int
    content_preview: str
