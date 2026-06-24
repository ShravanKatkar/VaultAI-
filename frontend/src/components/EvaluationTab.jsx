import React, { useState, useEffect } from 'react';
import { Activity, Play, List, Clock, CheckCircle, AlertTriangle, ChevronRight, Loader2, Plus, Trash2, Eye } from 'lucide-react';
import { API_BASE_URL } from '../config';

const DEFAULT_TEST_CASES = [
  {
    question: "What are the key technical requirements outlined in this document?",
    expected_source: "quarterly_report.pdf",
    ground_truth: "The key technical requirements include migration to a distributed offline database, integration with Ollama for secure local processing, and maintaining low-latency response times under 500ms."
  },
  {
    question: "Who is the primary contact person for this integration project?",
    expected_source: "quarterly_report.pdf",
    ground_truth: "The primary contact for the project integration is Sarah Connor, lead architect in the private AI infrastructure division."
  }
];

export default function EvaluationTab({ collections, selectedCollection }) {
  const [runs, setRuns] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [loadingRunDetail, setLoadingRunDetail] = useState(false);
  
  // Test case builder state
  const [testCases, setTestCases] = useState(DEFAULT_TEST_CASES);
  const [runningEval, setRunningEval] = useState(false);
  
  // Selected single test case in detailed view
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);

  const fetchRuns = async () => {
    setLoadingRuns(true);
    try {
      const response = await fetch(`${API_BASE_URL}/eval/runs`);
      if (response.ok) {
        const data = await response.json();
        setRuns(data);
      }
    } catch (err) {
      console.error("Failed to fetch evaluation runs:", err);
    } finally {
      setLoadingRuns(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleFetchRunDetail = async (runId) => {
    setLoadingRunDetail(true);
    try {
      const response = await fetch(`${API_BASE_URL}/eval/runs/${runId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedRun(data);
        setSelectedCaseIndex(0);
      }
    } catch (err) {
      console.error("Failed to fetch evaluation run details:", err);
      alert("Failed to load run details.");
    } finally {
      setLoadingRunDetail(false);
    }
  };

  const handleAddTestCase = () => {
    setTestCases([...testCases, { question: '', expected_source: '', ground_truth: '' }]);
  };

  const handleRemoveTestCase = (index) => {
    const updated = [...testCases];
    updated.splice(index, 1);
    setTestCases(updated);
  };

  const handleTestCaseChange = (index, field, value) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  const handleRunEvaluation = async () => {
    if (!selectedCollection) {
      alert("Please select a document vault in the Chat or Document tab first.");
      return;
    }
    
    // Validate test cases
    const invalid = testCases.some(tc => !tc.question.trim() || !tc.expected_source.trim() || !tc.ground_truth.trim());
    if (invalid) {
      alert("Please fill in all fields (Question, Expected Source, Ground Truth) for all test cases.");
      return;
    }

    setRunningEval(true);
    setSelectedRun(null);

    try {
      const response = await fetch(`${API_BASE_URL}/eval/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection_name: selectedCollection,
          test_cases: testCases
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedRun(data);
        setSelectedCaseIndex(0);
        fetchRuns(); // refresh runs list
      } else {
        const data = await response.json();
        alert(data.detail || 'Evaluation failed.');
      }
    } catch (err) {
      alert("Backend connection error. Is the server running?");
    } finally {
      setRunningEval(false);
    }
  };

  return (
    <div className="eval-dashboard">
      {/* Run Evaluation Section */}
      <div className="glass-panel">
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>Run Pipeline Evaluation</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Benchmark the retrieval and generation components of your RAG pipeline.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {selectedCollection ? (
              <span className="tag tag-indigo">Active Vault: {selectedCollection}</span>
            ) : (
              <span className="status-badge danger">Select a Vault to Start</span>
            )}
            <button 
              className="btn"
              onClick={handleRunEvaluation}
              disabled={runningEval || !selectedCollection || testCases.length === 0}
            >
              {runningEval ? (
                <>
                  <Loader2 className="loading-spinner" size={16} />
                  Evaluating Pipeline...
                </>
              ) : (
                <>
                  <Play size={16} />
                  Run Benchmarks
                </>
              )}
            </button>
          </div>
        </div>

        {/* Test Case Builder */}
        <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '10px', padding: '16px', border: '1px solid var(--border-light)' }}>
          <div className="flex-between" style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>Evaluation Test Cases ({testCases.length})</h3>
            <button 
              className="btn btn-secondary" 
              onClick={handleAddTestCase}
              style={{ padding: '6px 12px', fontSize: '12px' }}
              disabled={runningEval}
            >
              <Plus size={14} /> Add Test Case
            </button>
          </div>

          <div className="testcase-editor-list">
            {testCases.map((tc, index) => (
              <div key={index} className="testcase-editor-row" style={{ marginBottom: '8px' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Question / Prompt"
                  value={tc.question}
                  onChange={(e) => handleTestCaseChange(index, 'question', e.target.value)}
                  disabled={runningEval}
                />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Expected Source File (e.g. docs.txt)"
                  value={tc.expected_source}
                  onChange={(e) => handleTestCaseChange(index, 'expected_source', e.target.value)}
                  disabled={runningEval}
                />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ground Truth Answer"
                  value={tc.ground_truth}
                  onChange={(e) => handleTestCaseChange(index, 'ground_truth', e.target.value)}
                  disabled={runningEval}
                />
                <button 
                  className="icon-btn" 
                  onClick={() => handleRemoveTestCase(index)}
                  style={{ color: 'var(--danger)', height: '40px' }}
                  disabled={runningEval}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Results View */}
      {selectedRun ? (
        <div className="glass-panel" style={{ border: '1px solid rgba(99,102,241,0.25)' }}>
          <div className="flex-between" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)', fontWeight: 'bold' }}>
                Evaluation Results
              </span>
              <h2 style={{ fontSize: '20px', fontWeight: '800', marginTop: '4px', color: '#fff' }}>
                Run Details for Collection "{selectedRun.collection_name}"
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Executed on: {selectedRun.run_at ? new Date(selectedRun.run_at).toLocaleString() : 'Just now'}
              </span>
            </div>
            <button className="btn btn-secondary" onClick={() => setSelectedRun(null)}>
              Back to History
            </button>
          </div>

          {/* Aggregated Metrics Cards */}
          <div className="metrics-summary-grid" style={{ marginBottom: '24px' }}>
            <div className="glass-panel metric-card" style={{ background: 'rgba(255,255,255,0.01)' }}>
              <div className="metric-icon-box indigo">
                <CheckCircle size={24} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Retrieval Hit@3</span>
                <span className="metric-value">{(selectedRun.hit_at_3 * 100).toFixed(0)}%</span>
                <span className="metric-subtext">Target file inside top 3 retrievals</span>
              </div>
            </div>

            <div className="glass-panel metric-card" style={{ background: 'rgba(255,255,255,0.01)' }}>
              <div className="metric-icon-box cyan">
                <Activity size={24} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Avg ROUGE-L F1</span>
                <span className="metric-value">{selectedRun.avg_rouge_l.toFixed(3)}</span>
                <span className="metric-subtext">Generation overlap with ground truth</span>
              </div>
            </div>

            <div className="glass-panel metric-card" style={{ background: 'rgba(255,255,255,0.01)' }}>
              <div className="metric-icon-box teal">
                <Clock size={24} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Avg Latency</span>
                <span className="metric-value">{selectedRun.avg_latency_ms.toFixed(0)} ms</span>
                <span className="metric-subtext">Average full iteration latency</span>
              </div>
            </div>
          </div>

          {/* Test Case Detail split list */}
          {selectedRun.results && selectedRun.results.length > 0 && (
            <div className="eval-split-layout">
              {/* Left test case selector */}
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>Test Case Logs</h3>
                {selectedRun.results.map((result, idx) => (
                  <div 
                    key={idx}
                    className={`eval-testcase-item ${selectedCaseIndex === idx ? 'active' : ''}`}
                    onClick={() => setSelectedCaseIndex(idx)}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '6px' }}>
                      {result.question}
                    </div>
                    <div className="flex-between">
                      <span className={`status-badge ${result.hit > 0 ? 'success' : 'danger'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                        Hit: {result.hit > 0 ? 'Yes' : 'No'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        ROUGE: {result.rouge_l.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right test case detail inspector */}
              <div className="eval-detail-container">
                <div className="eval-detail-header">
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>
                    Metrics Inspector
                  </h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span className={`status-badge ${selectedRun.results[selectedCaseIndex].hit > 0 ? 'success' : 'danger'}`}>
                      Retrieval: {selectedRun.results[selectedCaseIndex].hit > 0 ? 'HIT' : 'MISS'}
                    </span>
                    <span className="status-badge" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                      ROUGE-L F1: {selectedRun.results[selectedCaseIndex].rouge_l.toFixed(3)}
                    </span>
                    <span className="status-badge" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                      Latency: {selectedRun.results[selectedCaseIndex].latency_ms.toFixed(0)} ms
                    </span>
                  </div>
                </div>

                <div className="eval-diff-box" style={{ background: 'rgba(99, 102, 241, 0.03)', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                  <div className="eval-diff-title">Question Evaluated</div>
                  <div className="eval-diff-content" style={{ fontWeight: '600', color: '#fff' }}>
                    {selectedRun.results[selectedCaseIndex].question}
                  </div>
                </div>

                <div className="eval-row-diff">
                  <div className="eval-diff-box">
                    <div className="eval-diff-title">Expected Source File</div>
                    <div className="eval-diff-content">{selectedRun.results[selectedCaseIndex].expected_source}</div>
                  </div>
                  <div className="eval-diff-box">
                    <div className="eval-diff-title">Actual Retrieved Top 3 Sources</div>
                    <div className="eval-diff-content">
                      {selectedRun.results[selectedCaseIndex].retrieved_sources && selectedRun.results[selectedCaseIndex].retrieved_sources.length > 0 ? (
                        <ol style={{ paddingLeft: '16px' }}>
                          {selectedRun.results[selectedCaseIndex].retrieved_sources.map((src, i) => (
                            <li key={i} style={{ color: src.toLowerCase() === selectedRun.results[selectedCaseIndex].expected_source.toLowerCase() ? 'var(--success)' : 'inherit' }}>
                              {src}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>None retrieved.</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="eval-row-diff">
                  <div className="eval-diff-box">
                    <div className="eval-diff-title">Ground Truth Reference</div>
                    <div className="eval-diff-content" style={{ color: 'var(--text-secondary)' }}>
                      {selectedRun.results[selectedCaseIndex].ground_truth}
                    </div>
                  </div>
                  <div className="eval-diff-box">
                    <div className="eval-diff-title">Model Output Generation</div>
                    <div className="eval-diff-content">
                      {selectedRun.results[selectedCaseIndex].generated_answer}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Evaluation History Section */
        <div className="glass-panel">
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>Evaluation History</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Review metrics of past evaluation runs.</p>
            </div>
            <button className="btn btn-secondary" onClick={fetchRuns} disabled={loadingRuns}>
              {loadingRuns ? <Loader2 className="loading-spinner" size={14} /> : 'Refresh History'}
            </button>
          </div>

          {loadingRuns ? (
            <div className="loading-container">
              <Loader2 className="loading-spinner" size={32} />
              <p>Scanning history db...</p>
            </div>
          ) : runs.length === 0 ? (
            <div className="loading-container" style={{ opacity: 0.7 }}>
              <Activity size={48} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
              <p style={{ fontWeight: '600' }}>No evaluation records found</p>
              <p style={{ fontSize: '12px' }}>Click "Run Benchmarks" above to create your first evaluation run.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Run ID</th>
                    <th>Date / Time</th>
                    <th>Library Context</th>
                    <th>Retrieval Hit@3</th>
                    <th>ROUGE-L F1</th>
                    <th>Avg Latency</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td style={{ fontWeight: '700', color: '#fff' }}>#{run.id}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {new Date(run.run_at).toLocaleString()}
                      </td>
                      <td>
                        <span className="tag tag-indigo">{run.collection_name}</span>
                      </td>
                      <td>
                        <span className="tag tag-cyan">{(run.hit_at_3 * 100).toFixed(0)}% Hit</span>
                      </td>
                      <td>
                        <span className="tag tag-indigo">{run.avg_rouge_l.toFixed(3)}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                          <Clock size={12} />
                          {run.avg_latency_ms.toFixed(0)} ms
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => handleFetchRunDetail(run.id)}
                        >
                          <Eye size={12} style={{ marginRight: '4px' }} /> View Results
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
