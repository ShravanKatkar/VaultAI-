import chromadb
from langchain_core.vectorstores import VectorStoreRetriever
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
from app.config import Settings

def get_retriever(collection_name: str, settings: Settings) -> VectorStoreRetriever:
    """
    Initializes a LangChain VectorStoreRetriever for a given ChromaDB collection.
    Uses Maximal Marginal Relevance (MMR) for diverse content retrieval.
    
    Args:
        collection_name: Name of the ChromaDB collection.
        settings: Application configuration settings.
        
    Returns:
        A VectorStoreRetriever.
        
    Raises:
        FileNotFoundError: If the requested collection does not exist.
    """
    # Initialize chroma client and verify if collection exists
    chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
    collections = [c.name for c in chroma_client.list_collections()]
    
    if collection_name not in collections:
        raise FileNotFoundError(f"The collection '{collection_name}' was not found in ChromaDB.")
        
    # Instantiate Ollama Embeddings
    embeddings = OllamaEmbeddings(
        model=settings.EMBED_MODEL,
        base_url=settings.OLLAMA_BASE_URL
    )
    
    # Load collection
    vector_store = Chroma(
        collection_name=collection_name,
        embedding_function=embeddings,
        persist_directory=settings.CHROMA_PATH
    )
    
    # Configure retriever using MMR
    retriever = vector_store.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": 4,
            "fetch_k": 10,
            "lambda_mult": 0.7
        }
    )
    
    return retriever
