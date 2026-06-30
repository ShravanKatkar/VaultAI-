import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpload } from '../../hooks/useUpload';

// ─── Inline SVG Icons ───────────────────────────────────────────────────────

const IconUploadCloud = ({ size = 48 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M12 12v9" />
    <path d="m16 16-4-4-4 4" />
  </svg>
);

const IconCheck = ({ size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const IconX = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);

const IconAlertTriangle = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" /><path d="M12 17h.01" />
  </svg>
);

const IconFilePdf = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M10 12h1.5a1.5 1.5 0 0 1 0 3H10v3" />
  </svg>
);

const IconFileTxt = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="12" y2="17" />
  </svg>
);

const IconFileMd = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M7 13h2l2 3 2-3h2" />
  </svg>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeInfo(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return { gradient: '#EF4444', label: 'PDF Document', icon: <IconFilePdf /> };
  if (ext === 'txt') return { gradient: '#3B82F6', label: 'Text File', icon: <IconFileTxt /> };
  if (ext === 'md')  return { gradient: '#8B5CF6', label: 'Markdown File', icon: <IconFileMd /> };
  return { gradient: '#6B7280', label: 'Document', icon: <IconFileTxt /> };
}

function estimateChunks(file, chunkSize = 512) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const avgBytesPerChunk = ext === 'pdf' ? 2000 : chunkSize;
  return Math.max(1, Math.ceil(file.size / avgBytesPerChunk));
}

// ─── Sub-components ──────────────────────────────────────────────────────────

// SVG progress ring with gradient stroke
const ProgressRing = ({ progress, size = 80 }) => {
  const stroke = 4;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <defs>
          <linearGradient id="upload-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-purple)" />
            <stop offset="100%" stopColor="var(--accent-teal)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="url(#upload-ring-grad)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 200ms ease-out' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '14px', fontWeight: 600, color: '#fff',
        fontFamily: 'var(--font-ui)',
      }}>
        {progress}%
      </div>
    </div>
  );
};

// Particle burst on success
const ParticleBurst = () => {
  const particles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * 360 + (Math.random() - 0.5) * 25;
      const rad = (angle * Math.PI) / 180;
      const dist = 55 + Math.random() * 65;
      return {
        tx: Math.cos(rad) * dist,
        ty: Math.sin(rad) * dist,
        size: 3 + Math.random() * 5,
        delay: Math.random() * 0.12,
        color: i % 3 === 0 ? '#10B981' : i % 3 === 1 ? 'var(--accent-purple)' : 'var(--accent-teal)',
      };
    }),
  []);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      {particles.map((p, i) => (
        <div
          key={i}
          className="upload-particle"
          style={{
            position: 'absolute',
            left: '50%', top: '50%',
            width: p.size, height: p.size,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 8px ${p.color}`,
            animationDelay: `${p.delay}s`,
            '--tx': `${p.tx}px`,
            '--ty': `${p.ty}px`,
          }}
        />
      ))}
    </div>
  );
};

// Shockwave ripple animation on upload success
const CanvasRipple = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateSize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 400;
      canvas.height = canvas.parentElement?.clientHeight || 350;
    };
    updateSize();

    let animFrame;
    const startTime = performance.now();
    const duration = 800; // 800ms total animation

    const animate = (time) => {
      const elapsed = time - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Draw 3 staggered circles
      const delays = [0, 150, 300];
      
      delays.forEach((delay) => {
        if (elapsed > delay) {
          const circleElapsed = elapsed - delay;
          const progress = Math.min(1, circleElapsed / (duration - delay)); // 0 to 1
          
          if (progress < 1) {
            const radius = progress * 200; // expand to 200px
            const opacity = 1 - progress; // fade out
            const lineWidth = 3 * (1 - progress); // thin out
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(13, 148, 136, ${opacity * 0.6})`;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
          }
        }
      });

      if (elapsed < duration) {
        animFrame = requestAnimationFrame(animate);
      }
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5
      }}
    />
  );
};

// Animated spinning arc for active stage
const SpinnerArc = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" className="upload-stage-spinner" style={{ position: 'absolute', inset: 0 }}>
    <circle cx="14" cy="14" r="11" fill="none" stroke="var(--accent-blue)" strokeWidth="2.5"
      strokeDasharray="20 49" strokeLinecap="round" />
  </svg>
);

// Stage list for the processing view
const STAGES = [
  { id: 'uploading', label: 'Uploading', sub: 'Transferring file to server...' },
  { id: 'parsing',   label: 'Parsing',   sub: 'Extracting document text...'   },
  { id: 'chunking',  label: 'Chunking',  sub: 'Splitting into semantic chunks...' },
  { id: 'embedding', label: 'Embedding', sub: 'Generating vector embeddings...' },
];

const STAGE_ORDER = ['uploading', 'parsing', 'chunking', 'embedding', 'success'];

// ─── Keyframes (injected once) ───────────────────────────────────────────────

const UPLOAD_STYLES = `
  @keyframes upload-particle-fly {
    0%   { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity: 0; }
  }
  .upload-particle {
    animation: upload-particle-fly 0.75s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  }

  @keyframes upload-shake {
    0%, 100% { transform: translateX(0); }
    10%, 50%, 90% { transform: translateX(-6px); }
    30%, 70% { transform: translateX(6px); }
    40%, 80% { transform: translateX(-3px); }
    60% { transform: translateX(3px); }
  }
  .upload-shake { animation: upload-shake 0.45s ease-in-out; }

  @keyframes upload-border-pulse {
    0%, 100% { border-color: rgba(124, 58, 237, 0.3); }
    50%      { border-color: rgba(124, 58, 237, 0.85); }
  }
  .upload-border-pulse { animation: upload-border-pulse 1.8s ease-in-out infinite; }

  @keyframes upload-spinner-rotate {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .upload-stage-spinner { animation: upload-spinner-rotate 0.9s linear infinite; }

  @keyframes upload-shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes upload-success-pop {
    0%   { transform: scale(0); opacity: 0; }
    60%  { transform: scale(1.15); }
    100% { transform: scale(1); opacity: 1; }
  }

  body.upload-drag-active {
    transform: perspective(1200px) rotateX(1.5deg);
    transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
    transform-origin: center top;
  }
  body:not(.upload-drag-active) {
    transform: perspective(1200px) rotateX(0deg);
    transition: transform 400ms cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

export const UploadModal = ({
  isOpen,
  isDragHovering,
  initialFile,
  chunkSize = 512,
  onClose,
  onUploadComplete,
}) => {
  const {
    phase, file, uploadProgress, overallProgress,
    error, result,
    selectFile, startUpload, reset,
  } = useUpload();

  const browseInputRef = useRef(null);
  const autoDismissRef = useRef(null);

  // When initialFile is provided from App (window drop), pass it to the hook
  useEffect(() => {
    if (initialFile && isOpen) {
      selectFile(initialFile);
    }
  }, [initialFile, isOpen, selectFile]);

  // Reset hook when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay so exit animation plays
      const t = setTimeout(() => reset(), 250);
      return () => clearTimeout(t);
    }
  }, [isOpen, reset]);

  // Auto-dismiss after success
  useEffect(() => {
    if (phase === 'success' && result) {
      autoDismissRef.current = setTimeout(() => {
        onUploadComplete(result);
        onClose();
      }, 2200);
      return () => {
        if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
      };
    }
  }, [phase, result, onUploadComplete, onClose]);

  // Handle internal drop (when modal is showing the drag zone)
  const handleModalDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) selectFile(files[0]);
  };

  const handleBrowseClick = () => browseInputRef.current?.click();

  const handleBrowseChange = (e) => {
    if (e.target.files && e.target.files[0]) selectFile(e.target.files[0]);
  };

  const handleClose = () => {
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    if (phase === 'success' && result) onUploadComplete(result);
    onClose();
  };

  // Compute estimated chunks for preview
  const estChunks = file ? estimateChunks(file, chunkSize) : 0;
  const fileInfo = file ? getFileTypeInfo(file.name) : null;

  // Current stage index for the stage indicator
  const currentIdx = STAGE_ORDER.indexOf(phase);
  const isProcessing = ['uploading', 'parsing', 'chunking', 'embedding'].includes(phase);

  // Progress for embedding sub-label "47 / 142"
  const embeddedCount = phase === 'embedding' || phase === 'success'
    ? (result ? result.chunks_stored : Math.round((overallProgress / 100) * estChunks))
    : 0;

  // Framer-motion variants
  const overlayV = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };
  const cardV = {
    hidden: { opacity: 0, scale: 0.92, y: 24 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 28, stiffness: 340 } },
    exit: { opacity: 0, scale: 0.92, y: 24, transition: { duration: 0.15 } },
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: UPLOAD_STYLES }} />
      <input
        ref={browseInputRef}
        type="file"
        accept=".pdf,.txt,.md"
        style={{ display: 'none' }}
        onChange={handleBrowseChange}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="upload-overlay"
            variants={overlayV}
            initial="hidden" animate="visible" exit="exit"
            transition={{ duration: 0.2 }}
            onClick={phase === 'idle' || isDragHovering ? handleClose : undefined}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleModalDrop}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              style={{
                position: 'absolute', top: 20, right: 24,
                background: 'var(--bg-surface-hover)', border: '1px solid var(--border-default)',
                borderRadius: '10px', padding: '8px',
                color: 'var(--text-secondary)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 200ms ease',
                zIndex: 10,
              }}
              className="upload-close-btn"
            >
              <IconX size={18} />
            </button>

            {/* Stop event propagation so clicking on the card doesn't close the overlay */}
            <motion.div
              key="upload-card-wrapper"
              variants={cardV}
              initial="hidden" animate="visible" exit="exit"
              onClick={(e) => e.stopPropagation()}
              style={{ position: 'relative', maxWidth: 400, width: '90%' }}
            >
              <AnimatePresence mode="wait">

                {/* ───── Drag / Browse Zone ───── */}
                {(phase === 'idle') && (
                  <motion.div
                    key="drag-zone"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      width: '100%', minHeight: 300,
                      background: 'var(--bg-surface)',
                      backdropFilter: 'blur(16px)',
                      border: '2px dashed var(--accent-blue)',
                      borderRadius: '20px',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      gap: 20, padding: 40,
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-md)',
                    }}
                    onClick={handleBrowseClick}
                  >
                    <div style={{
                      color: isDragHovering ? 'var(--accent-blue)' : 'var(--text-tertiary)',
                      transition: 'color 200ms, transform 200ms',
                      transform: isDragHovering ? 'scale(1.15) translateY(-4px)' : 'scale(1)',
                    }}>
                      <IconUploadCloud size={56} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6
                      }}>
                        {isDragHovering ? 'Release to drop file' : 'Drop a file here'}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        or <span style={{ color: 'var(--accent-blue)', fontWeight: 600, cursor: 'pointer' }}>click to browse</span>
                      </div>
                      <div style={{
                        marginTop: 12, fontSize: '11px', color: 'var(--text-tertiary)',
                        display: 'flex', gap: 8, justifyContent: 'center',
                      }}>
                        <span style={{ padding: '2px 8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#EF4444' }}>PDF</span>
                        <span style={{ padding: '2px 8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, color: '#3B82F6' }}>TXT</span>
                        <span style={{ padding: '2px 8px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 6, color: '#8B5CF6' }}>MD</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ───── File Preview Card ───── */}
                {phase === 'preview' && file && fileInfo && (
                  <motion.div
                    key="preview-card"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      width: '100%',
                      background: 'var(--bg-surface)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-lg)',
                    }}
                  >
                    {/* Colored banner */}
                    <div style={{
                      height: 80,
                      background: fileInfo.gradient,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative',
                    }}>
                      {fileInfo.icon}
                      <div style={{
                        position: 'absolute', bottom: 8, right: 12,
                        fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.7)',
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>
                        {fileInfo.label}
                      </div>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '24px 28px' }}>
                      <div style={{
                        fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }} title={file.name}>
                        {file.name}
                      </div>

                      <div style={{
                        display: 'flex', gap: 16, marginTop: 12, marginBottom: 24,
                        fontSize: '12px', color: 'var(--text-secondary)',
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', fontWeight: 700 }}>Size</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatFileSize(file.size)}</span>
                        </div>
                        <div style={{ width: 1, background: 'var(--border-subtle)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-tertiary)', fontWeight: 700 }}>Chunks</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>~{estChunks} estimated</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button
                          onClick={startUpload}
                          className="upload-confirm-btn"
                          style={{
                            flex: 1, padding: '12px 20px',
                            borderRadius: 12, border: 'none',
                            background: 'var(--accent-blue)',
                            color: '#fff', fontSize: '14px', fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'var(--font-ui)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            transition: 'transform 200ms ease, box-shadow 200ms ease',
                          }}
                        >
                          <IconUploadCloud size={16} />
                          Upload & Index
                        </button>
                        <button
                          onClick={handleClose}
                          style={{
                            padding: '12px 20px', borderRadius: 12,
                            background: 'transparent',
                            border: '1px solid var(--border-default)',
                            color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500,
                            cursor: 'pointer', fontFamily: 'var(--font-ui)',
                            transition: 'all 200ms ease',
                          }}
                          className="upload-cancel-btn"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ───── Processing View ───── */}
                {isProcessing && (
                  <motion.div
                    key="processing-view"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      width: '100%',
                      background: 'var(--bg-surface)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '20px',
                      padding: '32px 28px',
                      boxShadow: 'var(--shadow-lg)',
                    }}
                  >
                    <div style={{
                      display: 'flex', gap: 28, alignItems: 'flex-start',
                    }}>
                      {/* Progress ring */}
                      <div style={{ flexShrink: 0 }}>
                        <ProgressRing progress={overallProgress} />
                      </div>

                      {/* Stages */}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px',
                          color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: 16,
                        }}>
                          Processing Pipeline
                        </div>

                        {STAGES.map((stage, i) => {
                          const stageIdx = STAGE_ORDER.indexOf(stage.id);
                          const isDone = currentIdx > stageIdx;
                          const isActive = currentIdx === stageIdx;

                          return (
                            <div key={stage.id}>
                              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                {/* Indicator circle */}
                                <div style={{
                                  width: 28, height: 28, borderRadius: '50%',
                                  border: isDone ? 'none' : isActive ? '2px solid transparent' : '2px dashed var(--border-default)',
                                  background: isDone ? 'var(--accent-teal)' : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  boxShadow: isActive ? '0 0 14px var(--accent-blue-glow)' : 'none',
                                  position: 'relative',
                                  flexShrink: 0,
                                  transition: 'all 300ms ease',
                                }}>
                                  {isDone && <IconCheck size={14} />}
                                  {isActive && <SpinnerArc />}
                                </div>

                                {/* Label */}
                                <div>
                                  <div style={{
                                    fontSize: '13px', fontWeight: 600,
                                    color: isActive || isDone ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                    transition: 'color 300ms ease',
                                  }}>
                                    {stage.label}
                                  </div>
                                  {isActive && (
                                    <div style={{
                                      fontSize: '11px', color: 'var(--text-secondary)', marginTop: 1,
                                    }}>
                                      {stage.id === 'embedding'
                                        ? `Embedding chunks... ${embeddedCount} / ${estChunks}`
                                        : stage.sub
                                      }
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Connecting line */}
                              {i < STAGES.length - 1 && (
                                <div style={{
                                  width: 2, height: 16, marginLeft: 13,
                                  background: isDone
                                    ? 'var(--accent-teal)'
                                    : 'var(--border-subtle)',
                                  transition: 'background 300ms ease',
                                }} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* File name footer */}
                    {file && (
                      <div style={{
                        marginTop: 20, paddingTop: 16,
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: '12px', color: 'var(--text-secondary)',
                      }}>
                        <span style={{
                          padding: '2px 6px', borderRadius: 4, fontSize: '9px', fontWeight: 800,
                          background: 'var(--bg-base)', border: '1px solid var(--border-subtle)',
                          color: 'var(--text-tertiary)',
                        }}>
                          {file.name.split('.').pop()?.toUpperCase()}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ───── Success State ───── */}
                {phase === 'success' && (
                  <motion.div
                    key="success-view"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                    style={{
                      width: '100%',
                      background: 'var(--bg-surface)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid var(--accent-teal)',
                      borderRadius: '20px',
                      padding: '40px 28px',
                      boxShadow: 'var(--shadow-md)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 16, position: 'relative', overflow: 'hidden',
                    }}
                  >
                    <CanvasRipple />
                    <ParticleBurst />

                    {/* Check icon */}
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: 'var(--accent-teal)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: 'var(--accent-teal-glow)',
                      animation: 'upload-success-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                    }}>
                      <IconCheck size={28} />
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                        Successfully Indexed
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {result?.chunks_stored ?? 0} chunks embedded into the vector store
                      </div>
                    </div>

                    {/* Result details */}
                    {result && (
                      <div style={{
                        display: 'flex', gap: 16, marginTop: 8,
                        fontSize: '11px', color: 'var(--text-tertiary)',
                      }}>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Collection: </span>
                          <span style={{ color: 'var(--accent-teal)' }}>{result.collection_name}</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleClose}
                      style={{
                        marginTop: 8, padding: '10px 28px', borderRadius: 10,
                        background: 'var(--accent-teal-glow)',
                        border: '1px solid var(--accent-teal)',
                        color: 'var(--accent-teal)', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'var(--font-ui)',
                        transition: 'all 200ms ease',
                      }}
                      className="upload-dismiss-btn"
                    >
                      Done
                    </button>
                  </motion.div>
                )}

                {/* ───── Error State ───── */}
                {phase === 'error' && (
                  <motion.div
                    key="error-view"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="upload-shake"
                    style={{
                      width: '100%',
                      background: 'var(--bg-surface)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid var(--accent-purple)',
                      borderRadius: '20px',
                      padding: '32px 28px',
                      boxShadow: 'var(--shadow-md)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 16, textAlign: 'center',
                    }}
                  >
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: 'var(--accent-purple-glow)',
                      border: '1px solid var(--accent-purple)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--accent-purple)',
                    }}>
                      <IconAlertTriangle size={24} />
                    </div>

                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                        Upload Failed
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--accent-purple)', lineHeight: 1.5 }}>
                        {error || 'An unknown error occurred.'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                      <button
                        onClick={() => { reset(); }}
                        style={{
                          padding: '10px 20px', borderRadius: 10,
                          background: 'var(--accent-purple-glow)',
                          border: '1px solid var(--accent-purple)',
                          color: 'var(--accent-purple)', fontSize: '13px', fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'var(--font-ui)',
                          transition: 'all 200ms ease',
                        }}
                      >
                        Try Again
                      </button>
                      <button
                        onClick={handleClose}
                        style={{
                          padding: '10px 20px', borderRadius: 10,
                          background: 'transparent',
                          border: '1px solid var(--border-default)',
                          color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500,
                          cursor: 'pointer', fontFamily: 'var(--font-ui)',
                          transition: 'all 200ms ease',
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .upload-confirm-btn:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 20px var(--accent-blue-glow) !important;
        }
        .upload-cancel-btn:hover {
          border-color: var(--border-strong) !important;
          color: var(--text-primary) !important;
        }
        .upload-close-btn:hover {
          background: var(--bg-surface-hover) !important;
          color: var(--text-primary) !important;
        }
        .upload-dismiss-btn:hover {
          background: var(--accent-teal-glow) !important;
        }
      `}} />
    </>
  );
};
