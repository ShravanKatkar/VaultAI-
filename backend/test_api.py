import os
import sys
import json
import sqlite3
from pathlib import Path
from fastapi.testclient import TestClient

# Add current directory to path to ensure imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Override OLLAMA_BASE_URL for local execution before loading app
os.environ["OLLAMA_BASE_URL"] = "http://localhost:11434"

# Mock LangChain dependencies to run integration tests fully offline and reliably
from langchain_core.messages import AIMessage

class MockOllamaEmbeddings:
    def __init__(self, *args, **kwargs):
        pass
    def embed_documents(self, texts):
        return [[0.1] * 768 for _ in texts]
    def embed_query(self, text):
        return [0.1] * 768

from langchain_core.runnables import Runnable

class MockChatOllama(Runnable):
    def __init__(self, *args, **kwargs):
        pass
    def invoke(self, input, config=None, **kwargs):
        return AIMessage(content="John Doe founded VaultCorp in 2024.")
    async def astream(self, input, config=None, **kwargs):
        tokens = ["John ", "Doe ", "founded ", "VaultCorp ", "in ", "2024."]
        for token in tokens:
            yield AIMessage(content=token)

import langchain_community.embeddings
langchain_community.embeddings.OllamaEmbeddings = MockOllamaEmbeddings

try:
    import langchain_ollama
    langchain_ollama.ChatOllama = MockChatOllama
except ImportError:
    pass

import langchain_community.chat_models
langchain_community.chat_models.ChatOllama = MockChatOllama

from app.main import app

def main():
    print("=== STARTING INTEGRATION TESTS ===")
    
    # 1. Create a dummy test file
    test_file_path = Path("test_vaultcorp.txt")
    test_content = (
        "VaultCorp was founded in the year 2024 by a software engineer named John Doe. "
        "The company specializes in developing secure, offline document intelligence systems using artificial intelligence. "
        "VaultCorp's primary product is VaultAI, which allows enterprises to search and analyze private documents "
        "without exposing sensitive information to cloud APIs. The headquarters of VaultCorp is located in San Francisco."
    )
    test_file_path.write_text(test_content, encoding="utf-8")
    print(f"Created temporary test file at: {test_file_path.resolve()}")
    
    # Initialize TestClient within a context manager to trigger FastAPI startup lifespan
    with TestClient(app) as client:
        collection_name = "test_vaultcorp_collection"
        
        try:
            # First, clean up if it already exists
            client.delete(f"/documents/{collection_name}")
        except Exception:
            pass
            
        print("\n--- Testing POST /upload ---")
        with open(test_file_path, "rb") as f:
            response = client.post(
                "/upload",
                files={"file": ("test_vaultcorp.txt", f, "text/plain")},
                data={"collection_name": collection_name}
            )
            
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        assert response.status_code == 200, "Upload failed"
        upload_data = response.json()
        assert upload_data["filename"] == "test_vaultcorp.txt"
        assert upload_data["collection_name"] == collection_name
        assert upload_data["chunks_stored"] > 0
        assert upload_data["status"] == "stored"
        
        print("\n--- Testing GET /documents ---")
        response = client.get("/documents")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        assert response.status_code == 200
        docs = response.json()
        found = False
        for doc in docs:
            if doc["collection_name"] == collection_name:
                found = True
                assert doc["filename"] == "test_vaultcorp.txt"
                assert doc["chunk_count"] > 0
        assert found, f"Collection {collection_name} not found in listing"
        
        print("\n--- Testing POST /query ---")
        # We query tinyllama since it's the only one pulled in our Ollama environment
        query_payload = {
            "question": "Who founded VaultCorp and when?",
            "collection_name": collection_name,
            "model_name": "tinyllama"
        }
        
        # TestClient handles StreamingResponse as a standard response with content
        response = client.post("/query", json=query_payload)
        print(f"Status Code: {response.status_code}")
        print(f"Headers X-Sources: {response.headers.get('X-Sources')}")
        print(f"Answer Text: {response.text}")
        
        assert response.status_code == 200
        sources_header = response.headers.get("X-Sources")
        assert sources_header is not None, "Missing X-Sources header"
        sources = json.loads(sources_header)
        assert len(sources) > 0, "No sources retrieved"
        assert any("test_vaultcorp.txt" in s["source"] for s in sources), "Expected test document in sources"
        
        print("\n--- Testing POST /eval/run ---")
        eval_payload = {
            "collection_name": collection_name,
            "test_cases": [
                {
                    "question": "Who founded VaultCorp?",
                    "expected_source": "test_vaultcorp.txt",
                    "ground_truth": "John Doe"
                },
                {
                    "question": "In what year was VaultCorp founded?",
                    "expected_source": "test_vaultcorp.txt",
                    "ground_truth": "2024"
                }
            ]
        }
        response = client.post("/eval/run", json=eval_payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        assert response.status_code == 200
        eval_data = response.json()
        assert eval_data["collection_name"] == collection_name
        assert eval_data["hit_at_3"] == 1.0  # Should be 1.0 since it's the only document
        assert "id" in eval_data
        run_id = eval_data["id"]
        
        print("\n--- Testing GET /eval/runs ---")
        response = client.get("/eval/runs")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        assert response.status_code == 200
        runs = response.json()
        assert len(runs) > 0
        assert runs[0]["id"] == run_id
        
        print(f"\n--- Testing GET /eval/runs/{run_id} ---")
        response = client.get(f"/eval/runs/{run_id}")
        print(f"Status Code: {response.status_code}")
        print(f"Detailed Results keys: {response.json().keys()}")
        assert response.status_code == 200
        run_details = response.json()
        assert len(run_details["results"]) == 2
        assert run_details["results"][0]["question"] == "Who founded VaultCorp?"
        assert run_details["results"][0]["hit"] == 1.0
        print(f"Calculated ROUGE-L score: {run_details['results'][0]['rouge_l']}")
        
        print("\n--- Testing DELETE /documents/{collection_name} ---")
        response = client.delete(f"/documents/{collection_name}")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        assert response.status_code == 200
        
        # Verify it was deleted
        response = client.get("/documents")
        docs = response.json()
        assert not any(doc["collection_name"] == collection_name for doc in docs), "Collection was not deleted"
        print("Verification: Collection successfully deleted!")
        
    # Clean up test file
    if test_file_path.exists():
        test_file_path.unlink()
        print(f"\nRemoved temporary test file: {test_file_path}")
        
    print("\n=== ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    main()
