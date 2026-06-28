import datetime
import random

DEFAULT_TEST_CASES = [
    {
        "question": "What are the key technical requirements outlined in this document?",
        "expected_source": "quarterly_report.pdf",
        "ground_truth": "The key technical requirements include migration to a distributed offline database, integration with Ollama for secure local processing, and maintaining low-latency response times under 500ms."
    },
    {
        "question": "Who is the primary contact person for this integration project?",
        "expected_source": "quarterly_report.pdf",
        "ground_truth": "The primary contact for the project integration is Sarah Connor, lead architect in the private AI infrastructure division."
    },
    {
        "question": "What is the system architecture of VaultAI?",
        "expected_source": "architecture_specs.pdf",
        "ground_truth": "VaultAI uses a completely offline RAG architecture combining ChromaDB for local vector storage, Ollama for local LLM inference, and an encrypted client vault for document ingestion."
    },
    {
        "question": "How does the offline vector storage handle duplicate documents?",
        "expected_source": "architecture_specs.pdf",
        "ground_truth": "Duplicate documents are skipped during embedding storage by computing SHA-256 hashes of the file chunks and matching them against existing vector metadata."
    },
    {
        "question": "What database is used for storing evaluation runs?",
        "expected_source": "evaluation_guide.md",
        "ground_truth": "Evaluation runs are stored locally using a lightweight SQLite database (eval_results.db) with a table schema containing run details and raw results serialized to JSON."
    },
    {
        "question": "What metadata is extracted from uploaded PDF files?",
        "expected_source": "quarterly_report.pdf",
        "ground_truth": "ChromaDB stores the document source filename, total chunk count, chunk index, SHA-256 hash, and the ISO timestamp of upload time."
    },
    {
        "question": "What is the default chunk size for document ingestion?",
        "expected_source": "architecture_specs.pdf",
        "ground_truth": "The default ingestion setting is a chunk size of 512 tokens with a chunk overlap of 64 tokens for optimal retrieval coverage."
    },
    {
        "question": "Which LLM models are supported by the VaultAI offline system?",
        "expected_source": "ollama_config.json",
        "ground_truth": "VaultAI officially supports Llama3 (8B), Mistral (7B), and Phi-3 (3.8B) running locally via the Ollama server."
    },
    {
        "question": "How is document security maintained during processing?",
        "expected_source": "quarterly_report.pdf",
        "ground_truth": "Security is maintained by ensuring 0% external network calls. All tokenization, embedding generation, and model inference run inside the local container environment."
    },
    {
        "question": "What are the latency targets for retrieval queries?",
        "expected_source": "architecture_specs.pdf",
        "ground_truth": "Retrieval search queries are targeted to return results in under 50ms, while end-to-end local generation responses are targeted under 2.5 seconds."
    },
    {
        "question": "Who is the lead architect for the private AI infrastructure?",
        "expected_source": "quarterly_report.pdf",
        "ground_truth": "Sarah Connor serves as the Lead Architect in the private AI infrastructure division."
    },
    {
        "question": "What embedding model is used for generating vectors?",
        "expected_source": "architecture_specs.pdf",
        "ground_truth": "VaultAI uses the 'nallg-embed-text-v1.5' local model, generating 768-dimensional dense vectors stored directly in ChromaDB."
    },
    {
        "question": "What is the structure of the eval_runs database table?",
        "expected_source": "evaluation_guide.md",
        "ground_truth": "The eval_runs table contains columns: id (INTEGER PRIMARY KEY), run_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP), collection_name (TEXT), hit_at_3 (REAL), avg_rouge_l (REAL), avg_latency_ms (REAL), and results_json (TEXT)."
    },
    {
        "question": "What libraries are used for calculating the generation quality metrics?",
        "expected_source": "evaluation_guide.md",
        "ground_truth": "The backend uses NLTK and custom tokenization functions in Python to compute the LCS (Longest Common Subsequence) representing the ROUGE-L F1 score."
    },
    {
        "question": "How do you clear or delete a document vault collection?",
        "expected_source": "evaluation_guide.md",
        "ground_truth": "Collections are deleted via a DELETE request to /documents/{collection_name}, which triggers ChromaDB's delete_collection API and releases local disk space."
    }
]

def generate_mock_runs():
    random.seed(42)  # For deterministic evaluations
    now = datetime.datetime.now(datetime.timezone.utc)
    
    mock_runs = []
    configs = [
        # (id, hours_ago, hit_at_3, avg_rouge, avg_lat)
        (10, 0.03, 0.867, 0.742, 2120, "architecture_specs"),
        (9, 1.0, 0.800, 0.718, 2280, "architecture_specs"),
        (8, 24.0, 0.889, 0.755, 2010, "quarterly_report"),
        (7, 48.0, 0.833, 0.710, 2450, "quarterly_report"),
        (6, 72.0, 0.800, 0.702, 2520, "evaluation_guide"),
        (5, 120.0, 0.867, 0.738, 2180, "evaluation_guide"),
        (4, 168.0, 0.840, 0.715, 2310, "architecture_specs"),
        (3, 336.0, 0.820, 0.709, 2420, "architecture_specs"),
        (2, 504.0, 0.853, 0.729, 2210, "quarterly_report"),
        (1, 720.0, 0.812, 0.692, 2610, "quarterly_report")
    ]
    
    for r_id, hr_ago, hit_val, rouge_val, latency_val, col in configs:
        run_at = (now - datetime.timedelta(hours=hr_ago)).isoformat()
        
        results = []
        for idx, tc in enumerate(DEFAULT_TEST_CASES):
            hit = 0.0 if idx % 6 == 0 else 1.0
            
            # Simulate failure case
            if r_id == 10 and idx % 4 == 0:
                answer = "[Generation Failed: Connection timeout to local Ollama]"
                rouge = 0.0
            else:
                trunc_len = int(len(tc["ground_truth"]) * (0.6 + random.random() * 0.4))
                answer = tc["ground_truth"][:trunc_len]
                rouge = 0.65 + random.random() * 0.3
                
            results.append({
                "question": tc["question"],
                "expected_source": tc["expected_source"],
                "retrieved_sources": [tc["expected_source"], "notes.md"] if hit > 0 else ["other_doc.txt"],
                "ground_truth": tc["ground_truth"],
                "generated_answer": answer,
                "hit": hit,
                "rouge_l": rouge,
                "latency_ms": float(1200 + random.randint(0, 2000))
            })
            
        mock_runs.append({
            "id": r_id,
            "run_at": run_at,
            "collection_name": col,
            "hit_at_3": hit_val,
            "avg_rouge_l": rouge_val,
            "avg_latency_ms": latency_val,
            "results": results
        })
        
    return mock_runs
