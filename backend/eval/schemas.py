from pydantic import BaseModel
from typing import List, Optional

class TestCase(BaseModel):
    question: str
    expected_source: str
    ground_truth: str

class EvalRequest(BaseModel):
    collection_name: str
    test_cases: List[TestCase]

class TestCaseResult(BaseModel):
    question: str
    expected_source: str
    retrieved_sources: List[str]
    ground_truth: str
    generated_answer: str
    latency_ms: float
    hit: float
    rouge_l: float

class EvalRunResponse(BaseModel):
    id: Optional[int] = None
    run_at: Optional[str] = None
    collection_name: str
    hit_at_3: float
    avg_rouge_l: float
    avg_latency_ms: float
    results: Optional[List[TestCaseResult]] = None
