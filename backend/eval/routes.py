import os
import time
import json
import sqlite3
from typing import List
from fastapi import APIRouter, HTTPException
import chromadb

from app.config import settings
from app.rag.chain import build_rag_chain
from app.rag.retriever import get_retriever
from eval.schemas import EvalRequest, TestCaseResult, EvalRunResponse
from eval.metrics import rouge_l_f1

router = APIRouter()

DB_PATH = os.path.join(os.getcwd(), "eval_results.db")

@router.post("/run", response_model=EvalRunResponse)
async def run_evaluation(request: EvalRequest):
    """
    Runs a list of test cases on a given RAG collection.
    Computes retrieval Hit@3, generation ROUGE-L, and query latency.
    Saves the aggregated results to the database and returns them.
    """
    if not request.test_cases:
        raise HTTPException(status_code=400, detail="Test cases list cannot be empty.")
        
    # Verify collection exists in ChromaDB
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
        raise HTTPException(status_code=500, detail=f"Database connection error: {e}")
        
    try:
        # Build retriever and RAG chain
        retriever = get_retriever(request.collection_name, settings)
        chain = build_rag_chain(request.collection_name, settings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize RAG pipeline: {e}")
        
    results: List[TestCaseResult] = []
    
    total_hit = 0.0
    total_rouge_l = 0.0
    total_latency_ms = 0.0
    
    for case in request.test_cases:
        start_time = time.perf_counter()
        
        # 1. Retrieve documents to calculate Hit@3
        try:
            if hasattr(retriever, "invoke"):
                retrieved_docs = retriever.invoke(case.question)
            else:
                retrieved_docs = retriever.get_relevant_documents(case.question)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Retriever error during evaluation: {e}")
            
        # Top 3 retrieved sources
        top_3_docs = retrieved_docs[:3]
        retrieved_sources = [doc.metadata.get("source", "Unknown") for doc in top_3_docs]
        
        # Calculate Hit@3 (case-insensitive & stripped filename match)
        expected_source_clean = case.expected_source.strip().lower()
        hit = 1.0 if any(src.strip().lower() == expected_source_clean for src in retrieved_sources) else 0.0
        
        # 2. Run LLM chain generation
        try:
            if hasattr(chain, "invoke"):
                generated_answer = chain.invoke(case.question)
            else:
                generated_answer = chain(case.question)
        except Exception as e:
            generated_answer = f"[Generation Failed: {e}]"
            
        latency_ms = (time.perf_counter() - start_time) * 1000
        
        # 3. Calculate generation quality (ROUGE-L F1)
        # If generation failed, rouge_l is 0.0
        r_l = rouge_l_f1(case.ground_truth, generated_answer) if "Generation Failed" not in generated_answer else 0.0
        
        # Aggregate metrics
        total_hit += hit
        total_rouge_l += r_l
        total_latency_ms += latency_ms
        
        results.append(TestCaseResult(
            question=case.question,
            expected_source=case.expected_source,
            retrieved_sources=retrieved_sources,
            ground_truth=case.ground_truth,
            generated_answer=generated_answer,
            latency_ms=latency_ms,
            hit=hit,
            rouge_l=r_l
        ))
        
    num_cases = len(request.test_cases)
    avg_hit = total_hit / num_cases
    avg_rouge = total_rouge_l / num_cases
    avg_latency = total_latency_ms / num_cases
    
    # Save the run details to SQLite database
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Convert results to dict list for serialization
        results_json = json.dumps([res.model_dump() for res in results])
        
        cursor.execute("""
            INSERT INTO eval_runs (collection_name, hit_at_3, avg_rouge_l, avg_latency_ms, results_json)
            VALUES (?, ?, ?, ?, ?)
        """, (request.collection_name, avg_hit, avg_rouge, avg_latency, results_json))
        
        conn.commit()
        run_id = cursor.lastrowid
        
        # Fetch the generated timestamp
        cursor.execute("SELECT run_at FROM eval_runs WHERE id = ?", (run_id,))
        run_at = cursor.fetchone()[0]
        
        conn.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record evaluation run to database: {e}")
        
    return EvalRunResponse(
        id=run_id,
        run_at=run_at,
        collection_name=request.collection_name,
        hit_at_3=avg_hit,
        avg_rouge_l=avg_rouge,
        avg_latency_ms=avg_latency,
        results=results
    )

@router.get("/runs", response_model=List[EvalRunResponse])
async def list_eval_runs():
    """
    Lists historical evaluation runs.
    """
    try:
        if not os.path.exists(DB_PATH):
            return []
            
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, run_at, collection_name, hit_at_3, avg_rouge_l, avg_latency_ms 
            FROM eval_runs 
            ORDER BY id DESC
        """)
        rows = cursor.fetchall()
        conn.close()
        
        runs = []
        for row in rows:
            runs.append(EvalRunResponse(
                id=row[0],
                run_at=row[1],
                collection_name=row[2],
                hit_at_3=row[3],
                avg_rouge_l=row[4],
                avg_latency_ms=row[5]
            ))
        return runs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch eval runs: {e}")

@router.get("/runs/{run_id}", response_model=EvalRunResponse)
async def get_eval_run(run_id: int):
    """
    Retrieves detailed results for a specific evaluation run.
    """
    try:
        if not os.path.exists(DB_PATH):
            raise HTTPException(status_code=404, detail="Database file not found.")
            
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, run_at, collection_name, hit_at_3, avg_rouge_l, avg_latency_ms, results_json 
            FROM eval_runs 
            WHERE id = ?
        """, (run_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(status_code=404, detail=f"Evaluation run {run_id} not found.")
            
        results = json.loads(row[6])
        parsed_results = [TestCaseResult(**res) for res in results]
        
        return EvalRunResponse(
            id=row[0],
            run_at=row[1],
            collection_name=row[2],
            hit_at_3=row[3],
            avg_rouge_l=row[4],
            avg_latency_ms=row[5],
            results=parsed_results
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch eval run details: {e}")
