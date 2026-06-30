import React from 'react';

const RAG_FLOW_STYLES = `
  @keyframes flow-dash {
    to {
      stroke-dashoffset: -20;
    }
  }

  @keyframes pulse-node-doc {
    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0)); }
    10%, 30% { transform: scale(1.06); filter: drop-shadow(0 0 12px rgba(59, 130, 246, 0.4)); }
  }

  @keyframes pulse-node-chunk {
    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(107, 114, 128, 0)); }
    20%, 40% { transform: scale(1.06); filter: drop-shadow(0 0 12px rgba(107, 114, 128, 0.4)); }
  }

  @keyframes pulse-node-embed {
    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(124, 58, 237, 0)); }
    30%, 50% { transform: scale(1.06); filter: drop-shadow(0 0 12px rgba(124, 58, 237, 0.4)); }
  }

  @keyframes pulse-node-db {
    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(13, 148, 136, 0)); }
    40%, 60% { transform: scale(1.06); filter: drop-shadow(0 0 12px rgba(13, 148, 136, 0.4)); }
  }

  @keyframes pulse-node-retriever {
    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(124, 58, 237, 0)); }
    50%, 70% { transform: scale(1.06); filter: drop-shadow(0 0 12px rgba(124, 58, 237, 0.4)); }
  }

  @keyframes pulse-node-llm {
    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(245, 158, 11, 0)); }
    60%, 80% { transform: scale(1.06); filter: drop-shadow(0 0 12px rgba(245, 158, 11, 0.4)); }
  }

  @keyframes pulse-node-ans {
    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(16, 185, 129, 0)); }
    70%, 90% { transform: scale(1.06); filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.4)); }
  }

  .node-doc { animation: pulse-node-doc 6s ease-in-out infinite; transform-origin: 60px 80px; }
  .node-chunk { animation: pulse-node-chunk 6s ease-in-out infinite; transform-origin: 190px 80px; }
  .node-embed { animation: pulse-node-embed 6s ease-in-out infinite; transform-origin: 320px 80px; }
  .node-db { animation: pulse-node-db 6s ease-in-out infinite; transform-origin: 450px 80px; }
  .node-retriever { animation: pulse-node-retriever 6s ease-in-out infinite; transform-origin: 580px 80px; }
  .node-llm { animation: pulse-node-llm 6s ease-in-out infinite; transform-origin: 710px 80px; }
  .node-ans { animation: pulse-node-ans 6s ease-in-out infinite; transform-origin: 840px 80px; }

  .flow-line {
    stroke-dasharray: 6 4;
    animation: flow-dash 1.2s linear infinite;
  }
`;

export const RAGFlow = () => {
  return (
    <div className="glass-panel" style={{
      width: '100%',
      padding: '24px',
      background: 'rgba(10, 10, 15, 0.4)',
      border: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <style dangerouslySetInnerHTML={{ __html: RAG_FLOW_STYLES }} />
      
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>RAG Architecture Pipeline</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Watch documents flow from ingestion to vector indexation and real-time inference.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.0px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0055DA' }}>● Ingest</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#00C68D' }}>● Vectorize</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#FFD400' }}>● Infer</span>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '900px', overflowX: 'auto' }}>
        <svg 
          viewBox="0 0 900 160" 
          width="100%" 
          height="100%"
          style={{ display: 'block', minWidth: '700px' }}
        >
          {/* Connecting Lines */}
          <path d="M 60 80 L 190 80" fill="none" stroke="rgba(0, 85, 218, 0.4)" strokeWidth="2" className="flow-line" />
          <path d="M 190 80 L 320 80" fill="none" stroke="rgba(0, 85, 218, 0.4)" strokeWidth="2" className="flow-line" />
          <path d="M 320 80 L 450 80" fill="none" stroke="rgba(255, 0, 82, 0.4)" strokeWidth="2" className="flow-line" />
          <path d="M 450 80 L 580 80" fill="none" stroke="rgba(0, 198, 141, 0.4)" strokeWidth="2" className="flow-line" />
          <path d="M 580 80 L 710 80" fill="none" stroke="rgba(255, 0, 82, 0.4)" strokeWidth="2" className="flow-line" />
          <path d="M 710 80 L 840 80" fill="none" stroke="rgba(255, 212, 0, 0.4)" strokeWidth="2" className="flow-line" />

          {/* Data Packets (Flying circles) */}
          <circle r="4.5" fill="#0055DA" filter="drop-shadow(0 0 6px #0055DA)">
            <animateMotion dur="6s" repeatCount="indefinite" path="M 60 80 L 190 80" keyPoints="0;1" keyTimes="0;0.166" calcMode="linear" />
          </circle>
          
          <circle r="4.5" fill="#0055DA" filter="drop-shadow(0 0 6px #0055DA)">
            <animateMotion dur="6s" repeatCount="indefinite" path="M 190 80 L 320 80" keyPoints="0;1" keyTimes="0.166;0.333" calcMode="linear" />
          </circle>

          <circle r="4.5" fill="#FF0052" filter="drop-shadow(0 0 6px #FF0052)">
            <animateMotion dur="6s" repeatCount="indefinite" path="M 320 80 L 450 80" keyPoints="0;1" keyTimes="0.333;0.5" calcMode="linear" />
          </circle>

          <circle r="4.5" fill="#00C68D" filter="drop-shadow(0 0 6px #00C68D)">
            <animateMotion dur="6s" repeatCount="indefinite" path="M 450 80 L 580 80" keyPoints="0;1" keyTimes="0.5;0.666" calcMode="linear" />
          </circle>

          <circle r="4.5" fill="#FF0052" filter="drop-shadow(0 0 6px #FF0052)">
            <animateMotion dur="6s" repeatCount="indefinite" path="M 580 80 L 710 80" keyPoints="0;1" keyTimes="0.666;0.833" calcMode="linear" />
          </circle>

          <circle r="4.5" fill="#FFD400" filter="drop-shadow(0 0 6px #FFD400)">
            <animateMotion dur="6s" repeatCount="indefinite" path="M 710 80 L 840 80" keyPoints="0;1" keyTimes="0.833;1" calcMode="linear" />
          </circle>

          {/* Node 1: Document */}
          <g className="node-doc" style={{ cursor: 'pointer' }}>
            <rect x="25" y="55" width="70" height="50" rx="8" fill="rgba(10, 10, 15, 0.85)" stroke="#0055DA" strokeWidth="1.5" />
            <text x="60" y="80" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">Document</text>
            <text x="60" y="93" fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="middle">Source PDF</text>
          </g>

          {/* Node 2: Chunker */}
          <g className="node-chunk" style={{ cursor: 'pointer' }}>
            <rect x="155" y="55" width="70" height="50" rx="8" fill="rgba(10, 10, 15, 0.85)" stroke="#0055DA" strokeWidth="1.5" />
            <text x="190" y="80" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">Chunker</text>
            <text x="190" y="93" fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="middle">512 tokens</text>
          </g>

          {/* Node 3: Embedder */}
          <g className="node-embed" style={{ cursor: 'pointer' }}>
            <rect x="285" y="55" width="70" height="50" rx="8" fill="rgba(10, 10, 15, 0.85)" stroke="#FF0052" strokeWidth="1.5" />
            <text x="320" y="80" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">Embedder</text>
            <text x="320" y="93" fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="middle">Vector Map</text>
          </g>

          {/* Node 4: VectorDB */}
          <g className="node-db" style={{ cursor: 'pointer' }}>
            <rect x="415" y="55" width="70" height="50" rx="8" fill="rgba(10, 10, 15, 0.85)" stroke="#00C68D" strokeWidth="1.5" />
            <text x="450" y="80" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">Vector DB</text>
            <text x="450" y="93" fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="middle">Chroma Index</text>
          </g>

          {/* Node 5: Retriever */}
          <g className="node-retriever" style={{ cursor: 'pointer' }}>
            <rect x="545" y="55" width="70" height="50" rx="8" fill="rgba(10, 10, 15, 0.85)" stroke="#FF0052" strokeWidth="1.5" />
            <text x="580" y="80" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">Retriever</text>
            <text x="580" y="93" fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="middle">Top-K search</text>
          </g>

          {/* Node 6: LLM */}
          <g className="node-llm" style={{ cursor: 'pointer' }}>
            <rect x="675" y="55" width="70" height="50" rx="8" fill="rgba(10, 10, 15, 0.85)" stroke="#FFD400" strokeWidth="1.5" />
            <text x="710" y="80" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">LLM Inference</text>
            <text x="710" y="93" fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="middle">Llama3 / Mistral</text>
          </g>

          {/* Node 7: Answer */}
          <g className="node-ans" style={{ cursor: 'pointer' }}>
            <rect x="805" y="55" width="70" height="50" rx="8" fill="rgba(10, 10, 15, 0.85)" stroke="#00C68D" strokeWidth="1.5" />
            <text x="840" y="80" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">Response</text>
            <text x="840" y="93" fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="middle">Secured QA</text>
          </g>
        </svg>
      </div>
    </div>
  );
};

export default RAGFlow;
