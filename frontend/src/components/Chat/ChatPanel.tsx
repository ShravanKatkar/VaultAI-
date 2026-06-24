import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, BookOpen, Database, Cpu, HelpCircle } from 'lucide-react';
import { use3DTilt } from '../../hooks/use3DTilt';
import { API_BASE_URL } from '../../config';

// --- Type Definitions ---
export interface SourceChunk {
  source: string;
  page: number;
  content_preview: string;
}

export interface PerformanceMetrics {
  ttft: number; // Time to first token (ms)
  tokensPerSec: number; // Tokens per second (avg)
  throughputHistory: number[]; // Speed samples over time for sparkline
  totalTime: number; // Total retrieval/generation time (ms)
  totalTokens: number; // Total tokens generated (estimated)
}

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
  sources?: SourceChunk[];
  perf?: PerformanceMetrics;
}

export interface Collection {
  collection_name: string;
  filename: string;
  chunk_count: number;
  uploaded_at?: string;
}

export interface ChatPanelProps {
  collections: Collection[];
  selectedCollection: string;
  selectedModel: string;
  settings: {
    temperature: number;
    chunkSize: number;
    topK: number;
  };
}

// --- Local Helpers ---

// A simple high-fidelity local code block syntax highlighter using single-pass tokenization
function highlightCode(code: string, language: string): string {
  if (!code) return '';
  
  // Escape HTML tags first
  let escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Define tokens with capturing groups (comments, strings, keywords, functions, numbers)
  const tokenRegex = /(\/\/.*|#.*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\b(const|let|var|function|return|class|import|export|from|default|extends|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|this|typeof|instanceof|async|await|def|elif|print|in|is|not|and|or|lambda|None|True|False|self|int|float|str|list|dict|tuple|set|bool|void|public|private|protected|static|interface|package|struct|fn|mut|impl|use|pub)\b|\b([a-zA-Z_]\w*)(?=\()|\b(\d+)\b/g;

  return escaped.replace(tokenRegex, (match, comment, str, keyword, fnName, num) => {
    if (comment !== undefined) {
      return `<span style="color: #71717a; font-style: italic;">${match}</span>`;
    }
    if (str !== undefined) {
      return `<span style="color: #a3e635;">${match}</span>`;
    }
    if (keyword !== undefined) {
      return `<span style="color: #f472b6; font-weight: 600;">${match}</span>`;
    }
    if (fnName !== undefined) {
      return `<span style="color: #60a5fa;">${match}</span>`;
    }
    if (num !== undefined) {
      return `<span style="color: #fb923c;">${match}</span>`;
    }
    return match;
  });
}

// Generate the SVG path for the throughput sparkline
function generateSparklinePath(history: number[]): string {
  if (!history || history.length < 2) return 'M 0 10 L 60 10';
  
  const width = 60;
  const height = 14;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  
  const points = history.map((val, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = 17 - ((val - min) / range) * height; // Keep within viewBox (0 to 20)
    return { x, y };
  });
  
  // Create smooth bezier path
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX1 = p0.x + (p1.x - p0.x) / 2;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (p1.x - p0.x) / 2;
    const cpY2 = p1.y;
    path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }
  return path;
}

// --- Sub-components ---

// Single copyable syntax-highlighted code block
const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.25)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '8px',
      overflow: 'hidden',
      margin: '16px 0',
      fontFamily: 'var(--font-mono, monospace)',
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 16px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderBottom: '1px solid var(--border-subtle)',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        <span>{language}</span>
        <button
          onClick={handleCopy}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '4px',
            transition: 'all 200ms ease'
          }}
          className="copy-btn-hover"
        >
          {copied ? (
            <span style={{ color: 'var(--accent-teal)', fontWeight: 'bold' }}>Copied!</span>
          ) : (
            <span>Copy</span>
          )}
        </button>
      </div>
      
      {/* Code body */}
      <pre style={{ margin: 0, overflowX: 'auto', padding: '14px', background: 'rgba(0, 0, 0, 0.1)' }}>
        <code 
          dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }}
          style={{
            color: 'var(--text-primary)',
            fontSize: '13px',
            lineHeight: '1.5',
            whiteSpace: 'pre',
          }}
        />
      </pre>
      <style dangerouslySetInnerHTML={{__html: `
        .copy-btn-hover:hover {
          color: var(--text-primary) !important;
          background: rgba(255, 255, 255, 0.05);
        }
      `}} />
    </div>
  );
};

// Inline Markdown Parser Component
interface CustomMarkdownProps {
  text: string;
  streaming?: boolean;
  cursorClass?: string;
}

const CustomMarkdown: React.FC<CustomMarkdownProps> = ({ text, streaming, cursorClass }) => {
  if (!text) {
    if (streaming) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
          <span style={{ opacity: 0.6 }}>Thinking...</span>
          <span className={`custom-cursor ${cursorClass || 'active'}`}>▌</span>
        </span>
      );
    }
    return null;
  }

  // Split content by triple-backticks to isolate code blocks
  const segments = text.split(/(```[\s\S]*?```)/g);

  // Markdown block element styles
  const mdStyles = {
    h1: { fontSize: '1.4rem', fontWeight: '700', color: '#fff', marginTop: '1.25rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.25rem' },
    h2: { fontSize: '1.2rem', fontWeight: '600', color: '#fff', marginTop: '1rem', marginBottom: '0.5rem' },
    h3: { fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '0.75rem', marginBottom: '0.25rem' },
    p: { marginBottom: '0.75rem', lineHeight: '1.6', color: 'var(--text-primary)' },
    ul: { marginLeft: '1.5rem', marginBottom: '0.75rem', listStyleType: 'disc' as const },
    ol: { marginLeft: '1.5rem', marginBottom: '0.75rem', listStyleType: 'decimal' as const },
    li: { marginBottom: '0.25rem', lineHeight: '1.5' },
    inlineCode: { fontFamily: 'var(--font-mono, monospace)', backgroundColor: 'rgba(255, 255, 255, 0.08)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.9em', color: 'var(--accent-teal)', border: '1px solid rgba(255, 255, 255, 0.05)' },
    bold: { fontWeight: '700', color: '#fff' },
    italic: { fontStyle: 'italic' }
  };

  const parseInline = (inlineText: string, appendCursor: boolean) => {
    // Split by inline code, bold, italic
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;
    const parts = inlineText.split(regex);

    const elements = parts.map((part, index) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={index} style={mdStyles.inlineCode}>
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} style={mdStyles.bold}>{part.slice(2, -2)}</strong>;
      }
      if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
        return <em key={index} style={mdStyles.italic}>{part.slice(1, -1)}</em>;
      }
      return part;
    });

    return (
      <>
        {elements}
        {appendCursor && <span className={`custom-cursor ${cursorClass || 'active'}`}>▌</span>}
      </>
    );
  };

  const parseTextBlocks = (blockText: string, segmentIdx: number, isLastSegment: boolean) => {
    const blocks = blockText.split(/\n\n+/);

    return blocks.map((block, blockIdx) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      const isLastBlock = isLastSegment && blockIdx === blocks.length - 1;

      // Header 1
      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={`${segmentIdx}-${blockIdx}`} style={mdStyles.h1}>
            {parseInline(trimmed.slice(2), isLastBlock)}
          </h1>
        );
      }
      // Header 2
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={`${segmentIdx}-${blockIdx}`} style={mdStyles.h2}>
            {parseInline(trimmed.slice(3), isLastBlock)}
          </h2>
        );
      }
      // Header 3
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={`${segmentIdx}-${blockIdx}`} style={mdStyles.h3}>
            {parseInline(trimmed.slice(4), isLastBlock)}
          </h3>
        );
      }

      // Unordered list
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const items = block.split(/\n[-*]\s+/);
        return (
          <ul key={`${segmentIdx}-${blockIdx}`} style={mdStyles.ul}>
            {items.map((item, itemIdx) => {
              let cleanItem = item;
              if (itemIdx === 0) {
                cleanItem = item.replace(/^[-*]\s+/, '');
              }
              const isLastItem = isLastBlock && itemIdx === items.length - 1;
              return (
                <li key={itemIdx} style={mdStyles.li}>
                  {parseInline(cleanItem, isLastItem)}
                </li>
              );
            })}
          </ul>
        );
      }

      // Ordered list
      if (/^\d+\.\s+/.test(trimmed)) {
        const items = block.split(/\n\d+\.\s+/);
        return (
          <ol key={`${segmentIdx}-${blockIdx}`} style={mdStyles.ol}>
            {items.map((item, itemIdx) => {
              let cleanItem = item;
              if (itemIdx === 0) {
                cleanItem = item.replace(/^\d+\.\s+/, '');
              }
              const isLastItem = isLastBlock && itemIdx === items.length - 1;
              return (
                <li key={itemIdx} style={mdStyles.li}>
                  {parseInline(cleanItem, isLastItem)}
                </li>
              );
            })}
          </ol>
        );
      }

      // Paragraph with line breaks
      const lines = block.split('\n');
      if (lines.length > 1) {
        return (
          <p key={`${segmentIdx}-${blockIdx}`} style={mdStyles.p}>
            {lines.map((line, lineIdx) => {
              const isLastLine = isLastBlock && lineIdx === lines.length - 1;
              return (
                <React.Fragment key={lineIdx}>
                  {parseInline(line, isLastLine)}
                  {lineIdx < lines.length - 1 && <br />}
                </React.Fragment>
              );
            })}
          </p>
        );
      }

      // Plain paragraph
      return (
        <p key={`${segmentIdx}-${blockIdx}`} style={mdStyles.p}>
          {parseInline(trimmed, isLastBlock)}
        </p>
      );
    });
  };

  return (
    <div style={{ wordBreak: 'break-word' }}>
      {segments.map((segment, idx) => {
        if (segment.startsWith('```') && segment.endsWith('```')) {
          const lines = segment.slice(3, -3).split('\n');
          const firstLine = lines[0].trim();
          const languages = ['javascript', 'typescript', 'js', 'ts', 'python', 'py', 'json', 'html', 'css', 'bash', 'sh', 'sql', 'yaml', 'dockerfile'];
          const isLang = languages.includes(firstLine.toLowerCase());
          const language = isLang ? firstLine : 'code';
          const codeContent = isLang ? lines.slice(1).join('\n') : lines.join('\n');

          return (
            <CodeBlock 
              key={idx} 
              language={language} 
              code={codeContent} 
            />
          );
        } else {
          return parseTextBlocks(segment, idx, idx === segments.length - 1 && streaming);
        }
      })}
    </div>
  );
};

// Assistant Message Bubble with local fading cursor management
const AssistantBubble: React.FC<{ message: Message }> = ({ message }) => {
  const [showCursor, setShowCursor] = useState(message.streaming);
  const [cursorClass, setCursorClass] = useState('active');

  useEffect(() => {
    if (message.streaming) {
      setShowCursor(true);
      setCursorClass('active');
    } else {
      setCursorClass('fading');
      const timer = setTimeout(() => {
        setShowCursor(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [message.streaming]);

  return (
    <div className="chat-message assistant msg-appear" style={{ animation: 'message-appear 200ms ease-out forwards' }}>
      <div className="message-avatar">AI</div>
      <div className="message-bubble" style={{ maxWidth: '85%' }}>
        <CustomMarkdown 
          text={message.text} 
          streaming={showCursor} 
          cursorClass={cursorClass} 
        />

        {/* Source Citations with hoverable tooltip glass cards */}
        {message.sources && message.sources.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
            {message.sources.map((src, i) => (
              <div key={i} className="citation-container">
                <button 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    color: 'var(--accent-teal)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 200ms ease'
                  }}
                  className="citation-pill"
                >
                  <BookOpen size={10} />
                  Source {i + 1}
                </button>
                <div className="citation-tooltip">
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--accent-teal)',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '4px',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>Chunk #{i + 1}</span>
                    <span style={{ color: 'var(--text-tertiary)' }}>Page {src.page || 'N/A'}</span>
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    lineHeight: '1.4', 
                    color: 'var(--text-primary)',
                    maxHeight: '120px',
                    overflowY: 'auto',
                    fontFamily: 'var(--font-ui)',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {src.content_preview}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Performance Badge with dynamically generated inline SVG sparkline */}
        {message.perf && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '20px',
            padding: '4px 12px',
            marginTop: '12px',
            fontSize: '11px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Cpu size={12} style={{ color: 'var(--accent-purple)' }} />
              <span>TTFT:</span>
              <span style={{ fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>
                {(message.perf.ttft / 1000).toFixed(2)}s
              </span>
            </div>
            
            <div style={{ width: '1px', height: '10px', background: 'var(--border-subtle)' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Speed:</span>
              <span style={{ fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>
                {message.perf.tokensPerSec.toFixed(1)} t/s
              </span>
            </div>

            {message.perf.throughputHistory && message.perf.throughputHistory.length > 1 && (
              <>
                <div style={{ width: '1px', height: '10px', background: 'var(--border-subtle)' }} />
                <div style={{ display: 'inline-flex', alignItems: 'center' }} title="Throughput chart">
                  <svg width="60" height="20" viewBox="0 0 60 20" style={{ display: 'block' }}>
                    <path
                      d={generateSparklinePath(message.perf.throughputHistory)}
                      fill="none"
                      stroke="var(--accent-teal)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main ChatPanel Component ---

export default function ChatPanel({
  collections,
  selectedCollection,
  selectedModel,
  settings,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am VaultAI, your offline document intelligence assistant. Select a document vault on the left, choose a model, and ask me anything about your files."
    }
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 3D Tilt hook for the empty state card
  const emptyTiltRef = use3DTilt<HTMLDivElement>(2);

  // Auto-scroll messages list to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Adjust input textarea height dynamically (1 to 6 lines)
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const computedHeight = Math.min(Math.max(textarea.scrollHeight, 48), 150);
    textarea.style.height = `${computedHeight}px`;
  };

  // Reset textarea height on model or collection change
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
    }
  }, [selectedCollection, selectedModel]);

  // Handle Stopping the Stream
  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStreaming(false);
      setMessages(prev => prev.map(msg => 
        msg.streaming ? { ...msg, streaming: false } : msg
      ));
    }
  };

  // Handle Query Submission
  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim() || streaming || !selectedCollection) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
    }

    const userMsgId = Date.now().toString();
    const userMsg: Message = { id: userMsgId, sender: 'user', text: queryText.trim() };
    
    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: Message = { 
      id: assistantMsgId, 
      sender: 'assistant', 
      text: '', 
      streaming: true,
      sources: [],
      perf: {
        ttft: 0,
        tokensPerSec: 0,
        throughputHistory: [],
        totalTime: 0,
        totalTokens: 0
      }
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const startTime = performance.now();
    let firstTokenTime: number | null = null;
    let accumulatedText = '';
    const rates: number[] = [];
    let lastPushTime = 0;

    try {
      const response = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: queryText.trim(),
          collection_name: selectedCollection,
          model_name: selectedModel
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || 'Failed to query the document library.');
      }

      // Read sources from header
      let sources: SourceChunk[] = [];
      const sourcesHeader = response.headers.get('X-Sources');
      if (sourcesHeader) {
        try {
          sources = JSON.parse(sourcesHeader);
        } catch (e) {
          console.error("Failed to parse X-Sources header:", e);
        }
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response body is not readable.");

      const decoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          accumulatedText += chunk;
          
          const now = performance.now();
          if (firstTokenTime === null) {
            firstTokenTime = now;
          }

          const elapsedSec = (now - firstTokenTime) / 1000;
          const currentTokens = Math.ceil(accumulatedText.length / 4);
          const currentRate = elapsedSec > 0 ? (currentTokens / elapsedSec) : 0;

          if (now - lastPushTime > 150) {
            rates.push(Number(currentRate.toFixed(1)));
            if (rates.length > 20) rates.shift();
            lastPushTime = now;
          }

          const ttftVal = firstTokenTime ? (firstTokenTime - startTime) : 0;

          setMessages(prev => prev.map(msg => 
            msg.id === assistantMsgId 
              ? { 
                  ...msg, 
                  text: accumulatedText, 
                  sources: sources,
                  perf: {
                    ttft: ttftVal,
                    tokensPerSec: currentRate,
                    throughputHistory: [...rates],
                    totalTime: elapsedSec * 1000,
                    totalTokens: currentTokens
                  }
                }
              : msg
          ));
        }
      }

      // Finish streaming cleanly
      const totalTimeVal = firstTokenTime ? (performance.now() - firstTokenTime) : 0;
      const finalTokens = Math.ceil(accumulatedText.length / 4);
      const finalRate = totalTimeVal > 0 ? (finalTokens / (totalTimeVal / 1000)) : 0;

      if (rates.length === 0 || rates[rates.length - 1] !== finalRate) {
        rates.push(Number(finalRate.toFixed(1)));
        if (rates.length > 20) rates.shift();
      }

      setMessages(prev => prev.map(msg => 
        msg.id === assistantMsgId 
          ? { 
              ...msg, 
              text: accumulatedText, 
              sources: sources,
              streaming: false,
              perf: {
                ttft: firstTokenTime ? (firstTokenTime - startTime) : 0,
                tokensPerSec: finalRate,
                throughputHistory: [...rates],
                totalTime: totalTimeVal,
                totalTokens: finalTokens
              }
            }
          : msg
      ));

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Streaming aborted by user.');
      } else {
        console.error(err);
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMsgId 
            ? { 
                ...msg, 
                text: `Error: ${err.message || 'Failed to query the document library.'}`, 
                streaming: false,
                perf: undefined
              }
            : msg
        ));
      }
    } finally {
      setStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Helper variables for empty states
  const activeDoc = collections.find(c => c.collection_name === selectedCollection);
  const docFilename = activeDoc ? activeDoc.filename : 'Active Document';
  const chunkCount = activeDoc ? activeDoc.chunk_count : 0;

  return (
    <div 
      className="glass-panel chat-main" 
      style={{ 
        padding: 0, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* 1. Global / Ambient Custom Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-chat-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-chat-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-chat-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(124, 58, 237, 0.25);
          border-radius: 4px;
        }
        .custom-chat-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(124, 58, 237, 0.5);
        }
        
        .custom-cursor {
          display: inline-block;
          color: var(--accent-teal);
          margin-left: 2px;
          font-family: monospace;
          font-weight: bold;
        }
        .custom-cursor.active {
          animation: blink-cursor-teal 0.5s step-end infinite;
          opacity: 1;
        }
        .custom-cursor.fading {
          opacity: 0;
          transition: opacity 300ms ease-out;
        }
        
        @keyframes blink-cursor-teal {
          50% {
            opacity: 0;
          }
        }
      `}} />

      {/* 2. Messages List Area */}
      <div 
        className="chat-messages custom-chat-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          zIndex: 1
        }}
      >
        {!selectedCollection ? (
          /* Empty state: No active document */
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', height: '100%' }}>
            <div 
              ref={emptyTiltRef}
              className="glass card-3d"
              style={{
                maxWidth: '480px',
                width: '100%',
                padding: '40px 32px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '24px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-teal))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-glow-purple)',
                filter: 'drop-shadow(0 0 24px rgba(124, 58, 237, 0.5))',
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 9v6M9 12h6" />
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', marginBottom: '8px', letterSpacing: '-0.3px' }}>
                  Your Documents. Your Intelligence.
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Please select a document library from the sidebar or drop a new file (.pdf, .txt, .md) to initiate secure query workflows.
                </p>
              </div>
            </div>
          </div>
        ) : messages.length === 1 && messages[0].id === 'welcome' ? (
          /* Empty state: Selected document, no queries submitted yet */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '32px', height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', maxWidth: '480px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'rgba(13, 148, 136, 0.1)',
                border: '1px solid rgba(13, 148, 136, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-teal)',
                filter: 'drop-shadow(0 0 20px rgba(13, 148, 136, 0.3))'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>
                  {docFilename} Loaded
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  This document vault contains <span style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>{chunkCount} vector chunks</span> ready for offline inference.
                </p>
              </div>
            </div>

            {/* Suggestion Chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px', width: '100%' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: '4px' }}>
                Quick Suggestions
              </div>
              
              {['Summarize this document', 'What are the key findings?', 'List all action items'].map((text, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendQuery(text)}
                  style={{
                    padding: '14px 20px',
                    borderRadius: '12px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                    opacity: 0,
                    animation: 'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                    animationDelay: `${idx * 100}ms`
                  }}
                  className="suggestion-chip"
                >
                  <span>{text}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
              <style dangerouslySetInnerHTML={{__html: `
                .suggestion-chip:hover {
                  border-color: rgba(124, 58, 237, 0.4) !important;
                  background: rgba(124, 58, 237, 0.05) !important;
                  transform: translateY(-2px);
                  box-shadow: 0 0 15px rgba(124, 58, 237, 0.2);
                }
              `}} />
            </div>
          </div>
        ) : (
          /* Render messages */
          messages.map((msg) => {
            if (msg.sender === 'user') {
              return (
                <div key={msg.id} className="chat-message user msg-appear" style={{ alignSelf: 'flex-end', display: 'flex', gap: '16px', maxWidth: '75%', animation: 'message-appear 200ms ease-out forwards' }}>
                  <div className="message-bubble" style={{
                    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.35), rgba(124, 58, 237, 0.2))',
                    border: '1px solid rgba(124, 58, 237, 0.2)',
                    borderRadius: '16px 16px 4px 16px',
                    color: 'var(--text-primary)',
                    padding: '16px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div className="message-text" style={{ whiteSpace: 'pre-wrap' }}>
                      {msg.text}
                    </div>
                  </div>
                  <div className="message-avatar" style={{
                    background: 'linear-gradient(135deg, var(--accent-teal), var(--accent-purple))',
                    color: '#fff',
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    boxShadow: 'var(--shadow-sm)'
                  }}>U</div>
                </div>
              );
            } else {
              return <AssistantBubble key={msg.id} message={msg} />;
            }
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Sticky Input Footer */}
      <div 
        style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(8, 8, 14, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          position: 'relative',
          zIndex: 5
        }}
      >
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuery(input);
          }}
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-end',
            width: '100%'
          }}
        >
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendQuery(input);
                }
              }}
              placeholder={selectedCollection ? `Ask a question about "${docFilename}"...` : "Select a document vault from the sidebar to begin"}
              disabled={!selectedCollection}
              style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-default)',
                borderRadius: '12px',
                padding: '14px 18px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-ui)',
                fontSize: '14px',
                width: '100%',
                resize: 'none',
                minHeight: '48px',
                maxHeight: '150px',
                lineHeight: '1.5',
                outline: 'none',
                boxSizing: 'border-box',
                overflowY: 'auto'
              }}
            />
          </div>
          
          <button
            type="button"
            onClick={streaming ? handleStopStream : () => handleSendQuery(input)}
            disabled={!selectedCollection || (!input.trim() && !streaming)}
            style={{
              height: '48px',
              width: '48px',
              borderRadius: '12px',
              border: 'none',
              background: streaming
                ? 'linear-gradient(135deg, #EF4444, #B91C1C)'
                : 'linear-gradient(135deg, var(--accent-purple), var(--accent-teal))',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 200ms ease',
              flexShrink: 0
            }}
            title={streaming ? "Stop streaming" : "Send query"}
          >
            {streaming ? (
              <Square size={16} fill="#fff" stroke="none" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </form>
        
        {/* Context Capacity Indicator Pill */}
        {selectedCollection && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: 'var(--text-tertiary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Database size={12} style={{ color: 'var(--accent-teal)' }} />
              <span>RAG Context:</span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                {chunkCount} chunks loaded ({settings.topK} retrieved per query)
              </span>
            </div>
            <div>
              <span>Model: <strong style={{ color: 'var(--accent-purple)' }}>{selectedModel}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
