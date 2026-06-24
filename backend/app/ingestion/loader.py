from pathlib import Path
from datetime import datetime, timezone
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader, TextLoader

def load_document(file_path: Path, filename: str) -> list[Document]:
    """
    Loads a document from the local file system.
    Supports .pdf, .txt, and .md files. Adds metadata matching the system requirements.
    
    Args:
        file_path: The Path object pointing to the file to load.
        filename: The user-facing filename of the document.
        
    Returns:
        A list of LangChain Document objects.
        
    Raises:
        ValueError: If the file type is unsupported.
        FileNotFoundError: If the file does not exist.
        RuntimeError: If document loading fails.
    """
    if not file_path.exists():
        raise FileNotFoundError(f"Document file not found at: {file_path}")
        
    suffix = file_path.suffix.lower()
    raw_docs: list[Document] = []
    
    try:
        if suffix == ".pdf":
            loader = PyPDFLoader(str(file_path))
            raw_docs = loader.load()
        elif suffix in (".txt", ".md"):
            loader = TextLoader(str(file_path), encoding="utf-8")
            raw_docs = loader.load()
        else:
            raise ValueError(f"Unsupported file type: {suffix}")
    except ValueError as ve:
        raise ve
    except Exception as e:
        raise RuntimeError(f"Failed to load document '{filename}': {e}") from e

    upload_time = datetime.now(timezone.utc).isoformat()
    processed_docs: list[Document] = []
    
    for i, doc in enumerate(raw_docs):
        # Determine page number (0-based from PyPDFLoader is converted to 1-based, text/md default to 1)
        raw_page = doc.metadata.get("page", None)
        if raw_page is not None:
            try:
                page = int(raw_page) + 1
            except (ValueError, TypeError):
                page = i + 1
        else:
            page = 1
            
        # Standardize metadata schema
        doc.metadata = {
            "source": filename,
            "page": page,
            "upload_time": upload_time
        }
        processed_docs.append(doc)
        
    return processed_docs
