import chromadb
from langchain_core.documents import Document
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
from app.config import Settings

def embed_and_store(chunks: list[Document], collection_name: str, settings: Settings) -> int:
    """
    Embeds document chunks using OllamaEmbeddings and stores them in ChromaDB.
    Implements a deduplication check that skips embedding if the collection exists
    and has the exact same count of items.
    
    Args:
        chunks: List of document chunks (Documents).
        collection_name: The name of the target ChromaDB collection.
        settings: The App Settings configuration.
        
    Returns:
        The number of newly stored chunks (0 if skipped due to deduplication).
        
    Raises:
        RuntimeError: If embedding or database storage fails.
    """
    if not chunks:
        return 0
        
    try:
        # Check if collection exists and has the same chunk count
        chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
        try:
            existing_collections = [c.name for c in chroma_client.list_collections()]
            if collection_name in existing_collections:
                col = chroma_client.get_collection(collection_name)
                if col.count() == len(chunks):
                    # Duplicate detected, skip storing
                    return 0
        except Exception as e:
            # Logging warning and proceeding with insertion
            print(f"[Embedder] Warning during deduplication check: {e}")
            
        # Instantiate OllamaEmbeddings
        embeddings = OllamaEmbeddings(
            model=settings.EMBED_MODEL,
            base_url=settings.OLLAMA_BASE_URL
        )
        
        # Load and index into Chroma vector database
        vector_store = Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
            collection_name=collection_name,
            persist_directory=settings.CHROMA_PATH
        )
        
        # Call persist if required by the langchain version
        if hasattr(vector_store, "persist"):
            vector_store.persist()
            
        return len(chunks)
    except Exception as e:
        raise RuntimeError(f"Error in embed_and_store pipeline: {e}") from e
