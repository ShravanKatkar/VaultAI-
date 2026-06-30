import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  IconPlayerPlay, 
  IconLoader, 
  IconChevronDown, 
  IconDownload, 
  IconCheck, 
  IconX, 
  IconClock, 
  IconPlus, 
  IconTrash, 
  IconFileText, 
  IconSettings,
  IconArrowUpRight,
  IconArrowDownRight
} from '@tabler/icons-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { use3DTilt } from '../hooks/use3DTilt';
import { API_BASE_URL } from '../config';

export default function EvalDashboard({ collections, selectedCollection }) {
  const [runs, setRuns] = useState([]);
  const metricCard1Ref = use3DTilt();
  const metricCard2Ref = use3DTilt();
  const metricCard3Ref = use3DTilt();
  const [selectedRun, setSelectedRun] = useState(null);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [runningEval, setRunningEval] = useState(false);
  const [progressStage, setProgressStage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [testCases, setTestCases] = useState([]);
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const dropdownRef = useRef(null);
  const canvasRef = useRef(null);
  const [confettiActive, setConfettiActive] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setHistoryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real runs from backend & merge with mock ones from python
  const fetchRuns = async () => {
    setLoadingRuns(true);
    try {
      // 1. Fetch mock runs from Python
      let localMockRuns = [];
      try {
        const mockRes = await fetch(`${API_BASE_URL}/eval/mock_runs`);
        if (mockRes.ok) {
          localMockRuns = await mockRes.json();
        }
      } catch (e) {
        console.warn("Could not load mock runs from backend", e);
      }

      // 2. Fetch real runs from SQLite
      const response = await fetch(`${API_BASE_URL}/eval/runs`);
      if (response.ok) {
        const backendRuns = await response.json();
        if (backendRuns && backendRuns.length > 0) {
          const detailedRuns = await Promise.all(
            backendRuns.slice(0, 5).map(async (run) => {
              try {
                const detailRes = await fetch(`${API_BASE_URL}/eval/runs/${run.id}`);
                if (detailRes.ok) return await detailRes.json();
              } catch (e) {
                console.error(e);
              }
              return run;
            })
          );
          
          const filteredDetailed = detailedRuns.filter(r => r && r.results);
          const merged = [...filteredDetailed, ...localMockRuns].slice(0, 10);
          setRuns(merged);
          
          if (filteredDetailed.length > 0) {
            setSelectedRun(filteredDetailed[0]);
          } else if (localMockRuns.length > 0) {
            setSelectedRun(localMockRuns[0]);
          }
        } else {
          setRuns(localMockRuns);
          if (localMockRuns.length > 0) {
            setSelectedRun(localMockRuns[0]);
          }
        }
      } else {
        setRuns(localMockRuns);
        if (localMockRuns.length > 0) {
          setSelectedRun(localMockRuns[0]);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch evaluation runs:", err);
    } finally {
      setLoadingRuns(false);
    }
  };

  // Load test cases and run history on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/eval/default_test_cases`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && Array.isArray(data)) {
          setTestCases(data);
        }
      })
      .catch(() => {});
      
    fetchRuns();
  }, []);

  // Relative time helper
  const getRelativeTime = (isoString) => {
    if (!isoString) return "";
    const runDate = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - runDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins === 1) return "1 min ago";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "yesterday";
    return `${diffDays} days ago`;
  };

  // Delta calculation vs previous run
  const getDelta = (currentVal, runIndex, field) => {
    const prevRun = runs[runIndex + 1];
    if (!prevRun) return null;
    const prevVal = prevRun[field];
    
    if (field === 'avg_latency_ms') {
      const diffS = (prevVal - currentVal) / 1000; // Positive means faster/decreased latency
      return {
        value: Math.abs(diffS).toFixed(2),
        isPositive: currentVal <= prevVal // Lower latency is positive
      };
    } else {
      const diffPct = (currentVal - prevVal) * 100;
      return {
        value: Math.abs(diffPct).toFixed(1),
        isPositive: currentVal >= prevVal
      };
    }
  };

  const activeRunIndex = runs.findIndex(r => r.id === selectedRun?.id);

  // SVG Semicircle parameters
  const strokeLength = 188.5; // Pi * r where r = 60
  
  // Confetti Particle System
  const triggerConfetti = () => {
    setConfettiActive(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#FF0052', '#00C68D', '#FFD400', '#0055DA', '#EC4899', '#10B981'];

    // Spawn 120 particles around the button
    const buttonElement = document.getElementById('run-eval-btn');
    let startX = canvas.width / 2;
    let startY = canvas.height * 0.7;
    if (buttonElement) {
      const rect = buttonElement.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    }

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: startX,
        y: startY,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 15,
        speedY: (Math.random() - 0.7) * 18 - 5,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    let animationFrameId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let alive = false;
      particles.forEach(p => {
        if (p.opacity > 0) {
          alive = true;
          p.x += p.speedX;
          p.y += p.speedY;
          p.speedY += 0.45; // gravity
          p.speedX *= 0.98; // friction
          p.rotation += p.rotationSpeed;
          p.opacity -= 0.012; // fade

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.opacity);
          
          if (Math.random() > 0.5) {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          } else {
            ctx.beginPath();
            ctx.moveTo(0, -p.size / 2);
            ctx.lineTo(p.size / 2, p.size / 2);
            ctx.lineTo(-p.size / 2, p.size / 2);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }
      });

      if (alive) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setConfettiActive(false);
      }
    };

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  };

  // Run pipeline evaluation
  const runEvaluation = async () => {
    if (!selectedCollection) {
      alert("Please select a document vault in the Secure Chat sidebar first.");
      return;
    }

    setRunningEval(true);
    setProgressPercent(0);
    setProgressStage("✓ Loading test set (15 questions)");

    const stepInterval = 1000;
    let currentQuestion = 1;

    const timer = setInterval(() => {
      if (currentQuestion <= testCases.length) {
        setProgressStage(`● Running question ${currentQuestion}/${testCases.length}...`);
        setProgressPercent(Math.floor((currentQuestion / (testCases.length + 1)) * 95));
        currentQuestion++;
      }
    }, stepInterval);

    try {
      const response = await fetch(`${API_BASE_URL}/eval/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection_name: selectedCollection,
          test_cases: testCases
        })
      });

      clearInterval(timer);

      if (response.ok) {
        const data = await response.json();
        
        setProgressStage("✓ Complete!");
        setProgressPercent(100);
        
        setTimeout(() => {
          setSelectedRun(data);
          setRuns(prev => [data, ...prev].slice(0, 10));
          setSelectedCaseIndex(0);
          setRunningEval(false);
          triggerConfetti();
        }, 600);
        
        fetchRuns();
      } else {
        const errorData = await response.json();
        alert(errorData.detail || "Evaluation failed on backend.");
        setRunningEval(false);
      }
    } catch (err) {
      clearInterval(timer);
      console.error(err);
      alert("Network error: Could not connect to evaluation server.");
      setRunningEval(false);
    }
  };

  // Token per second calculation
  const tokPerSec = useMemo(() => {
    if (!selectedRun?.results) return "0.0";
    let totalWords = 0;
    let totalLatencyMs = 0;

    selectedRun.results.forEach((r) => {
      if (r.generated_answer && !r.generated_answer.startsWith("[Generation Failed")) {
        totalWords += r.generated_answer.split(/\s+/).length;
        totalLatencyMs += r.latency_ms;
      }
    });

    if (totalLatencyMs === 0) return "18.5";
    const tokens = totalWords * 1.35;
    const latencySec = totalLatencyMs / 1000;
    return (tokens / latencySec).toFixed(1);
  }, [selectedRun]);

  // Export Results via Backend file download
  const exportResults = (format) => {
    if (!selectedRun) return;
    const url = `${API_BASE_URL}/eval/export/${selectedRun.id}?format=${format}`;
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `vaultai-eval-run-${selectedRun.id}.${format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Process data for Recharts Graph
  const chartData = useMemo(() => {
    if (!selectedRun?.results) return [];
    return selectedRun.results.map((r, idx) => ({
      name: `Q${idx + 1}`,
      latency: parseFloat((r.latency_ms / 1000).toFixed(2)),
      question: r.question,
      status: r.hit > 0 ? 'Hit' : 'Miss',
      rouge: r.rouge_l
    }));
  }, [selectedRun]);

  const avgLatencySec = selectedRun ? (selectedRun.avg_latency_ms / 1000).toFixed(2) : "2.30";

  // Configuration editors
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

  const resetTestCases = () => {
    fetch(`${API_BASE_URL}/eval/default_test_cases`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && Array.isArray(data)) {
          setTestCases(data);
        }
      })
      .catch(() => {});
  };

  return (
    <div className="eval-dashboard" style={{ position: 'relative' }}>
      {/* Canvas for Confetti Overlay */}
      <canvas 
        ref={canvasRef} 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          pointerEvents: 'none', 
          zIndex: 9999 
        }} 
      />

      {/* Top Action Bar */}
      <div className="flex-between glass-panel" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(10, 10, 15, 0.5)' }}>
        <div>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--accent-purple)', fontWeight: 'bold' }}>
            Pipeline Quality Gate
          </span>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>Evaluation Suite</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
          {/* History Dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setHistoryOpen(!historyOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px' }}
            >
              <span>{selectedRun ? `Run · ${getRelativeTime(selectedRun.run_at)}` : 'Loading runs...'}</span>
              <IconChevronDown size={16} style={{ transform: historyOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
            </button>

            {historyOpen && (
              <div className="glass" style={{ 
                position: 'absolute', 
                top: 'calc(100% + 8px)', 
                right: 0, 
                width: '320px', 
                maxHeight: '400px', 
                overflowY: 'auto', 
                zIndex: 200, 
                boxShadow: 'var(--shadow-lg)',
                padding: '8px 0',
                border: '1px solid var(--border-strong)',
                background: 'rgba(15, 15, 23, 0.95)',
                borderRadius: '12px'
              }}>
                <div style={{ padding: '8px 16px 4px 16px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.5px', fontWeight: 'bold', borderBottom: '1px solid var(--border-subtle)' }}>
                  Evaluation Runs History
                </div>
                {runs.map((run, idx) => {
                  const delta = getDelta(run.hit_at_3, idx, 'hit_at_3');
                  return (
                    <div 
                      key={run.id}
                      onClick={() => {
                        setSelectedRun(run);
                        setSelectedCaseIndex(0);
                        setHistoryOpen(false);
                      }}
                      style={{ 
                        padding: '12px 16px', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: idx < runs.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                        background: selectedRun?.id === run.id ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                      className="history-run-item"
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
                          Run #{run.id > 10000 ? run.id.toString().slice(-4) : run.id}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {new Date(run.run_at).toLocaleDateString()} · {run.collection_name}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {(run.hit_at_3 * 100).toFixed(0)}% Hit
                        </div>
                        {delta && (
                          <div style={{ fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px', color: delta.isPositive ? 'var(--accent-teal)' : '#EF4444' }}>
                            {delta.isPositive ? <IconArrowUpRight size={10} /> : <IconArrowDownRight size={10} />}
                            {delta.isPositive ? '▲' : '▼'}{delta.value}%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Test Case Builder Toggle */}
          <button 
            className="btn btn-secondary"
            onClick={() => setShowConfig(!showConfig)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
          >
            <IconSettings size={16} />
            <span>Config Suite</span>
          </button>

          {/* Export Dropdown */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => exportResults('json')}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '10px' }}
              title="Export as JSON"
            >
              <IconDownload size={16} />
              <span style={{ fontSize: '12px' }}>JSON</span>
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => exportResults('csv')}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '10px' }}
              title="Export as CSV"
            >
              <IconDownload size={16} />
              <span style={{ fontSize: '12px' }}>CSV</span>
            </button>
          </div>

          {/* Run Button */}
          <div style={{ position: 'relative' }}>
            <button 
              id="run-eval-btn"
              className="btn"
              disabled={runningEval || !selectedCollection}
              onClick={runEvaluation}
              style={{ 
                background: 'var(--accent-purple)',
                padding: '10px 20px',
                borderRadius: '8px',
                minWidth: '150px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', position: 'relative', zIndex: 5 }}>
                {runningEval ? (
                  <IconLoader size={18} className="ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <IconPlayerPlay size={18} />
                )}
                <span>{runningEval ? 'Running...' : 'Run Evaluation'}</span>
              </div>
              
              {/* Bottom Progress Bar */}
              {runningEval && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: '4px',
                  background: 'rgba(255, 255, 255, 0.4)',
                  width: `${progressPercent}%`,
                  transition: 'width 0.3s ease-out'
                }} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Running Stages log area */}
      {runningEval && (
        <div className="glass-panel" style={{ 
          marginTop: '12px', 
          padding: '14px 20px', 
          background: 'rgba(124,58,237,0.04)', 
          border: '1px solid rgba(124,58,237,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IconLoader size={16} className="ti-loader" style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-purple)' }} />
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {progressStage}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Active Vault: <span className="tag tag-indigo" style={{ verticalAlign: 'middle' }}>{selectedCollection}</span>
          </div>
        </div>
      )}

      {/* Collapsible Test Case Config Configurator */}
      {showConfig && (
        <div className="glass-panel" style={{ marginTop: '16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-default)' }}>
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>Benchmark Test Cases ({testCases.length})</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Modify the prompts and expected ground truth references evaluated during run.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={resetTestCases} style={{ padding: '6px 12px', fontSize: '12px' }}>
                Reset Defaults
              </button>
              <button className="btn" onClick={handleAddTestCase} style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--accent-purple)' }}>
                <IconPlus size={14} /> Add Question
              </button>
            </div>
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
            {testCases.map((tc, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-tertiary)', minWidth: '24px' }}>#{idx+1}</span>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ flex: 2, padding: '8px' }} 
                  placeholder="Question text"
                  value={tc.question}
                  onChange={(e) => handleTestCaseChange(idx, 'question', e.target.value)}
                />
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ flex: 1, padding: '8px' }} 
                  placeholder="Expected PDF Source" 
                  value={tc.expected_source}
                  onChange={(e) => handleTestCaseChange(idx, 'expected_source', e.target.value)}
                />
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ flex: 2, padding: '8px' }} 
                  placeholder="Ground Truth Answer" 
                  value={tc.ground_truth}
                  onChange={(e) => handleTestCaseChange(idx, 'ground_truth', e.target.value)}
                />
                <button 
                  className="icon-btn" 
                  onClick={() => handleRemoveTestCase(idx)}
                  style={{ color: '#EF4444' }}
                >
                  <IconTrash size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3-Column Metrics Card Row */}
      {selectedRun && (
        <div className="eval-metrics-grid" style={{ marginTop: '20px' }}>
          
          {/* Card 1: Hit@3 Arc Gauge */}
          <div ref={metricCard1Ref} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '190px', position: 'relative' }}>
            {/* SVG Defs for Glow Effect */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
              <defs>
                <filter id="glow-teal" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
            </svg>

            <div style={{ position: 'relative', width: '140px', height: '80px', display: 'flex', justifyContent: 'center' }}>
              <svg width="140" height="80" viewBox="0 0 140 80">
                {/* Track semicircle */}
                <path 
                  d="M 10 70 A 60 60 0 0 1 130 70" 
                  fill="none" 
                  stroke="rgba(255, 255, 255, 0.08)" 
                  strokeWidth="10" 
                  strokeLinecap="round" 
                />
                {/* Active fill semicircle */}
                <path 
                  d="M 10 70 A 60 60 0 0 1 130 70" 
                  fill="none" 
                  stroke="#00C68D" 
                  strokeWidth="10" 
                  strokeLinecap="round" 
                  strokeDasharray={strokeLength}
                  strokeDashoffset={strokeLength - (selectedRun.hit_at_3 * strokeLength)}
                  style={{ 
                    transition: 'stroke-dashoffset 800ms ease-out',
                  }}
                  filter="url(#glow-teal)"
                />
              </svg>
              
              {/* Inner score label */}
              <div style={{ position: 'absolute', bottom: '0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '24px', fontWeight: 500, color: '#fff', fontFamily: 'Inter' }}>
                  {(selectedRun.hit_at_3 * 100).toFixed(0)}%
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 'bold' }}>Hit@3</span>
              </div>
            </div>
            
            {/* Description Subtext */}
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '16px', textAlign: 'center' }}>
              Source doc found in top 3 retrievals
            </div>
          </div>

          {/* Card 2: ROUGE-L Semicircle Gauge */}
          <div ref={metricCard2Ref} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '190px', position: 'relative' }}>
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
              <defs>
                <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
            </svg>

            <div style={{ position: 'relative', width: '140px', height: '80px', display: 'flex', justifyContent: 'center' }}>
              <svg width="140" height="80" viewBox="0 0 140 80">
                {/* Track semicircle */}
                <path 
                  d="M 10 70 A 60 60 0 0 1 130 70" 
                  fill="none" 
                  stroke="rgba(255, 255, 255, 0.08)" 
                  strokeWidth="10" 
                  strokeLinecap="round" 
                />
                {/* Active fill semicircle */}
                <path 
                  d="M 10 70 A 60 60 0 0 1 130 70" 
                  fill="none" 
                  stroke="#FF0052" 
                  strokeWidth="10" 
                  strokeLinecap="round" 
                  strokeDasharray={strokeLength}
                  strokeDashoffset={strokeLength - (selectedRun.avg_rouge_l * strokeLength)}
                  style={{ 
                    transition: 'stroke-dashoffset 800ms ease-out',
                  }}
                  filter="url(#glow-purple)"
                />
              </svg>
              
              {/* Inner score label */}
              <div style={{ position: 'absolute', bottom: '0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 500, color: '#fff', fontFamily: 'Inter' }}>
                    {selectedRun.avg_rouge_l.toFixed(3)}
                  </span>
                  {activeRunIndex !== -1 && getDelta(selectedRun.avg_rouge_l, activeRunIndex, 'avg_rouge_l') && (
                    <span style={{ 
                      fontSize: '10px', 
                      color: getDelta(selectedRun.avg_rouge_l, activeRunIndex, 'avg_rouge_l')?.isPositive ? '#10B981' : '#EF4444', 
                      display: 'flex', 
                      alignItems: 'center',
                      fontWeight: 'bold'
                    }}>
                      ▲{getDelta(selectedRun.avg_rouge_l, activeRunIndex, 'avg_rouge_l')?.value}%
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 'bold' }}>ROUGE-L F1</span>
              </div>
            </div>
            
            {/* Description Subtext */}
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '16px', textAlign: 'center' }}>
              Generation overlap vs ground truth
            </div>
          </div>

          {/* Card 3: Avg Latency Vertical Bar Fill */}
          <div ref={metricCard3Ref} className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '190px', padding: '24px 32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Avg Latency
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                <span style={{ fontSize: '32px', fontWeight: 700, color: '#fff' }}>
                  {avgLatencySec}s
                </span>
                {activeRunIndex !== -1 && getDelta(selectedRun.avg_latency_ms, activeRunIndex, 'avg_latency_ms') && (
                  <span style={{ 
                    fontSize: '11px', 
                    color: getDelta(selectedRun.avg_latency_ms, activeRunIndex, 'avg_latency_ms')?.isPositive ? '#10B981' : '#EF4444',
                    fontWeight: 'bold'
                  }}>
                    {getDelta(selectedRun.avg_latency_ms, activeRunIndex, 'avg_latency_ms')?.isPositive ? '▲ Faster' : '▼ Slower'} ({getDelta(selectedRun.avg_latency_ms, activeRunIndex, 'avg_latency_ms')?.value}s)
                  </span>
                )}
              </div>

              {/* tok/s output */}
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: '12px' }}>
                <span style={{ fontSize: '14px', color: '#F59E0B', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
                  {tokPerSec} tok/s
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  Token generation speed
                </span>
              </div>
            </div>

            {/* Vertical Bar indicator - amber fill, "shows time remaining style" */}
            <div style={{ 
              height: '100px', 
              width: '14px', 
              background: 'rgba(255, 255, 255, 0.05)', 
              borderRadius: '20px', 
              overflow: 'hidden', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'flex-end',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ 
                height: `${Math.min(100, (selectedRun.avg_latency_ms / 5000) * 100)}%`, 
                width: '100%', 
                background: 'var(--accent-yellow)', 
                borderRadius: '20px',
                transition: 'height 800ms cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 10px var(--accent-yellow-glow)'
              }} />
            </div>
          </div>
          
        </div>
      )}

      {/* Latency Recharts Area Chart */}
      {selectedRun && (
        <div className="glass-panel" style={{ marginTop: '24px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>Latency Distribution Graph</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Full end-to-end response latency mapping per evaluation test case.</p>
            </div>
            <div className="tag tag-indigo">
              Avg Pipeline Latency: {avgLatencySec} seconds
            </div>
          </div>

          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF0052" stopOpacity="0.4"/>
                    <stop offset="95%" stopColor="#FF0052" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(255, 255, 255, 0.3)" 
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="rgba(255, 255, 255, 0.3)" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Seconds', angle: -90, position: 'insideLeft', offset: 5, fill: 'rgba(255, 255, 255, 0.3)', style: { fontSize: '11px' } }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="glass" style={{ 
                          padding: '12px', 
                          background: 'rgba(15, 15, 23, 0.9)', 
                          border: '1px solid var(--border-strong)', 
                          borderRadius: '8px', 
                          boxShadow: 'var(--shadow-md)',
                          maxWidth: '280px'
                        }}>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '4px' }}>
                            QUESTION {data.name}
                          </p>
                          <p style={{ fontSize: '13px', color: '#fff', fontWeight: '500', marginBottom: '8px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {data.question}
                          </p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', gap: '16px' }}>
                            <span>Latency: <strong>{data.latency}s</strong></span>
                            <span style={{ color: data.status === 'Hit' ? 'var(--accent-teal)' : '#EF4444', fontWeight: 'bold' }}>
                              {data.status}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine 
                  y={parseFloat(avgLatencySec)} 
                  stroke="rgba(255, 255, 255, 0.2)" 
                  strokeDasharray="4 4"
                  label={{ 
                    value: `avg ${avgLatencySec}s`, 
                    position: 'top', 
                    fill: 'rgba(255, 255, 255, 0.4)', 
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    offset: 4
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="latency" 
                  stroke="#FF0052" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorLatency)" 
                  dot={{ r: 3, fill: '#FF0052', stroke: 'transparent' }}
                  activeDot={{ r: 5, fill: '#FF0052', stroke: '#fff', strokeWidth: 1.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Results Table & Details Split Layout */}
      {selectedRun && selectedRun.results && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginTop: '24px' }}>
          
          {/* Results Table Container */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>
              Evaluation Log ({selectedRun.results.length} Cases)
            </h3>
            
            <div className="table-container" style={{ margin: 0 }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                    <th style={{ width: '35%' }}>Question</th>
                    <th>Expected Document</th>
                    <th>Retrieved Sources</th>
                    <th>Retrieval Hit</th>
                    <th>ROUGE-L Score</th>
                    <th>Response Time</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRun.results.map((result, idx) => {
                    const isSelected = selectedCaseIndex === idx;
                    const latencyS = result.latency_ms / 1000;
                    
                    let dotColor = '#10B981';
                    if (latencyS >= 2.0 && latencyS <= 4.0) dotColor = '#F59E0B';
                    else if (latencyS > 4.0) dotColor = '#EF4444';

                    return (
                      <tr 
                        key={idx}
                        onClick={() => setSelectedCaseIndex(idx)}
                        style={{ 
                          cursor: 'pointer',
                          background: isSelected 
                            ? 'rgba(124, 58, 237, 0.04)' 
                            : (idx % 2 === 1 ? 'rgba(255, 255, 255, 0.015)' : 'transparent'),
                          borderLeft: isSelected ? '3px solid var(--accent-purple)' : '3px solid transparent',
                          transition: 'all 0.2s ease-in-out'
                        }}
                        className="eval-table-row"
                      >
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-tertiary)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ fontWeight: '500', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '300px' }} title={result.question}>
                          {result.question}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {result.expected_source}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {result.retrieved_sources && result.retrieved_sources.length > 0 ? (
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {result.retrieved_sources.slice(0, 2).join(', ')}
                              {result.retrieved_sources.length > 2 ? '...' : ''}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>None</span>
                          )}
                        </td>
                        <td>
                          {result.hit > 0 ? (
                            <span className="tag" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px' }}>
                              <IconCheck size={11} strokeWidth={3} /> Hit
                            </span>
                          ) : (
                            <span className="tag" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#EF4444', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px' }}>
                              <IconX size={11} strokeWidth={3} /> Miss
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '36px', fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                              {result.rouge_l.toFixed(2)}
                            </span>
                            <div style={{ flex: 1, minWidth: '60px', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ 
                                height: '100%', 
                                width: `${result.rouge_l * 100}%`, 
                                background: result.rouge_l > 0.7 ? '#FF0052' : '#0055DA',
                                borderRadius: '4px' 
                              }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, display: 'inline-block', boxShadow: `0 0 6px ${dotColor}` }} />
                            <span>{latencyS.toFixed(2)}s</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Metrics Inspector (Interactive Detail View) */}
          <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(124, 58, 237, 0.2)', background: 'rgba(20, 10, 30, 0.15)' }}>
            <div className="eval-detail-header" style={{ marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--accent-purple)', fontWeight: 'bold', letterSpacing: '1px' }}>
                  Metrics Inspector
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
                  Case #{selectedCaseIndex + 1} Detailed Log
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="tag tag-indigo">
                  Latency: {(selectedRun.results[selectedCaseIndex].latency_ms / 1000).toFixed(2)}s
                </span>
                <span className="tag" style={{ 
                  background: selectedRun.results[selectedCaseIndex].hit > 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: selectedRun.results[selectedCaseIndex].hit > 0 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                  color: selectedRun.results[selectedCaseIndex].hit > 0 ? '#10B981' : '#EF4444' 
                }}>
                  Retrieval: {selectedRun.results[selectedCaseIndex].hit > 0 ? 'HIT' : 'MISS'}
                </span>
                <span className="tag tag-cyan">
                  ROUGE-L: {selectedRun.results[selectedCaseIndex].rouge_l.toFixed(3)}
                </span>
              </div>
            </div>

            {/* Question Evaluated */}
            <div className="eval-diff-box" style={{ background: 'rgba(124, 58, 237, 0.03)', border: '1px solid rgba(124, 58, 237, 0.15)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
              <div className="eval-diff-title" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '6px' }}>
                Evaluated Question
              </div>
              <div className="eval-diff-content" style={{ fontWeight: '600', color: '#fff', fontSize: '14px' }}>
                {selectedRun.results[selectedCaseIndex].question}
              </div>
            </div>

            {/* Expected Source vs Retrieved Sources */}
            <div className="eval-row-diff" style={{ marginBottom: '16px' }}>
              <div className="eval-diff-box" style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-subtle)', padding: '12px 16px', borderRadius: '8px' }}>
                <div className="eval-diff-title" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '6px' }}>
                  Expected Source Document
                </div>
                <div className="eval-diff-content" style={{ color: '#fff', fontSize: '13px', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconFileText size={16} style={{ color: 'var(--accent-teal)' }} />
                  {selectedRun.results[selectedCaseIndex].expected_source}
                </div>
              </div>

              <div className="eval-diff-box" style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-subtle)', padding: '12px 16px', borderRadius: '8px' }}>
                <div className="eval-diff-title" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '6px' }}>
                  Actual Retrieved Top 3 Sources
                </div>
                <div className="eval-diff-content" style={{ fontSize: '13px' }}>
                  {selectedRun.results[selectedCaseIndex].retrieved_sources && selectedRun.results[selectedCaseIndex].retrieved_sources.length > 0 ? (
                    <ol style={{ paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {selectedRun.results[selectedCaseIndex].retrieved_sources.map((src, i) => {
                        const isMatch = src.trim().toLowerCase() === selectedRun.results[selectedCaseIndex].expected_source.trim().toLowerCase();
                        return (
                          <li key={i} style={{ 
                            color: isMatch ? '#10B981' : 'var(--text-secondary)',
                            fontWeight: isMatch ? '600' : 'normal',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px'
                          }}>
                            {src} {isMatch && ' (✓ Target Hit)'}
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No sources retrieved.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Ground Truth Answer vs Model Generated Answer */}
            <div className="eval-row-diff">
              <div className="eval-diff-box" style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '8px' }}>
                <div className="eval-diff-title" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '8px' }}>
                  Ground Truth Reference
                </div>
                <div className="eval-diff-content" style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {selectedRun.results[selectedCaseIndex].ground_truth}
                </div>
              </div>

              <div className="eval-diff-box" style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '8px' }}>
                <div className="eval-diff-title" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '8px' }}>
                  Model Output Generation
                </div>
                <div className="eval-diff-content" style={{ 
                  color: selectedRun.results[selectedCaseIndex].generated_answer.startsWith("[Generation Failed") ? '#EF4444' : 'var(--text-primary)', 
                  fontSize: '13px', 
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedRun.results[selectedCaseIndex].generated_answer}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
