from langchain_core.documents import Document
try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    from langchain.text_splitter import RecursiveCharacterTextSplitter

def chunk_documents(docs: list[Document]) -> list[Document]:
    """
    Splits a list of Documents into smaller chunks.
    Uses RecursiveCharacterTextSplitter and preserves all metadata.
    
    Args:
        docs: List of parent Documents.
        
    Returns:
        List of chunked Documents.
        
    Raises:
        RuntimeError: If document splitting fails.
    """
    if not docs:
        return []
        
    try:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=100,
            separators=["\n\n", "\n", ".", " "]
        )
        chunks = splitter.split_documents(docs)
        return chunks
    except Exception as e:
        raise RuntimeError(f"Failed to chunk documents: {e}") from e
