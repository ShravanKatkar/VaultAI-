from langchain_core.runnables import Runnable, RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document

try:
    from langchain_ollama import ChatOllama
except ImportError:
    from langchain_community.chat_models import ChatOllama

from app.rag.retriever import get_retriever
from app.rag.prompt import prompt_template
from app.config import Settings

def format_docs(docs: list[Document]) -> str:
    """Format a list of Documents into a structured string context for the LLM."""
    formatted = []
    for doc in docs:
        source = doc.metadata.get("source", "Unknown")
        page = doc.metadata.get("page", 1)
        formatted.append(f"[Document: {source}, Page: {page}]\nContext Content:\n{doc.page_content}")
    return "\n\n---\n\n".join(formatted)

def build_rag_chain(collection_name: str, settings: Settings) -> Runnable:
    """
    Constructs the RAG pipeline using LangChain Expression Language (LCEL).
    
    Inputs:
        collection_name: Target Chroma collection.
        settings: Application settings.
        
    Returns:
        A runnable LangChain chain that streams LLM response tokens.
    """
    retriever = get_retriever(collection_name, settings)
    
    # Instantiate the ChatOllama model (configured for streaming)
    llm = ChatOllama(
        model=settings.LLM_MODEL,
        base_url=settings.OLLAMA_BASE_URL,
        temperature=0.0
    )
    
    # LCEL pipeline
    chain = (
        {
            "context": retriever | format_docs,
            "question": RunnablePassthrough()
        }
        | prompt_template
        | llm
        | StrOutputParser()
    )
    return chain

def get_source_documents(collection_name: str, query: str, settings: Settings) -> list[dict]:
    """
    Retrieves the top-4 context documents for the query without invoking the full LLM chain.
    
    Returns:
        List of dicts containing 'source', 'page', and a text 'content_preview'.
    """
    try:
        retriever = get_retriever(collection_name, settings)
        
        # Safe method invoke for compatibility with newer/older LangChain
        if hasattr(retriever, "invoke"):
            docs = retriever.invoke(query)
        else:
            docs = retriever.get_relevant_documents(query)
            
        sources = []
        # Return at most the top 4 source chunks
        for doc in docs[:4]:
            content = doc.page_content
            preview = content[:200] + "..." if len(content) > 200 else content
            sources.append({
                "source": doc.metadata.get("source", "Unknown"),
                "page": doc.metadata.get("page", 1),
                "content_preview": preview
            })
        return sources
    except Exception as e:
        print(f"[Chain] Error retrieving source documents: {e}")
        return []
