import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTheme } from '../../hooks/useTheme';
import { use3DTilt } from '../../hooks/use3DTilt';
import { API_BASE_URL } from '../../config';

// Inline Tabler-equivalent SVG Icons
const IconVault = ({ size = 20, color = 'currentColor', className = '' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 9v6M9 12h6" />
    <path d="M18 6h.01M18 18h.01M6 6h.01M6 18h.01" />
  </svg>
);

const IconChevronDown = ({ size = 16, style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const IconChevronUp = ({ size = 14, style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="m18 15-6-6-6 6" />
  </svg>
);

const IconPlus = ({ size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5v14" />
  </svg>
);

const IconTrash = ({ size = 14, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
  </svg>
);

const IconCloudUpload = ({ size = 28, style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M12 12v9M9 15l3-3 3 3" />
  </svg>
);

const IconAdjustments = ({ size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 10V3M6 21v-7M10 14H2M20 14h-8M14 21v-3M14 12V3M20 8h-8M20 14v7M20 3v1M17 8h6M15 18h-4" />
  </svg>
);

const IconSun = ({ size = 14 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const IconMoon = ({ size = 14 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const IconLoader2 = ({ size = 16, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export interface ModelInfo {
  name: string;
  size: string;
  speed: number; // 1 to 3
}

export interface Collection {
  collection_name: string;
  filename: string;
  chunk_count: number;
  uploaded_at?: string;
}

export interface SidebarProps {
  collections: Collection[];
  selectedCollection: string;
  setSelectedCollection: (name: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  onDeleteCollection: (name: string) => void;
  onRefreshCollections: () => void;
  settings: {
    temperature: number;
    chunkSize: number;
    topK: number;
  };
  onUpdateSettings: (newSettings: { temperature: number; chunkSize: number; topK: number }) => void;
  onRequestUpload?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collections,
  selectedCollection,
  setSelectedCollection,
  selectedModel,
  setSelectedModel,
  onDeleteCollection,
  onRefreshCollections,
  settings,
  onUpdateSettings,
  onRequestUpload,
}) => {
  const { theme, toggleTheme } = useTheme();
  const modelSelectorRef = use3DTilt<HTMLDivElement>();
  const [bouncingCollection, setBouncingCollection] = useState<string | null>(null);
  const prevCollectionsRef = useRef<Collection[]>([]);

  useEffect(() => {
    const prev = prevCollectionsRef.current;
    if (collections.length > prev.length && collections.length > 0) {
      const newCol = collections.find(c => !prev.some(p => p.collection_name === c.collection_name));
      if (newCol) {
        setBouncingCollection(newCol.collection_name);
        const timer = setTimeout(() => {
          setBouncingCollection(null);
        }, 850);
        return () => clearTimeout(timer);
      }
    }
    prevCollectionsRef.current = collections;
  }, [collections]);
  
  // Custom model selection state
  const [models, setModels] = useState<ModelInfo[]>([
    { name: 'llama3', size: '8.0B', speed: 3 },
    { name: 'mistral', size: '7.2B', speed: 2 },
    { name: 'gemma', size: '2.5B', speed: 3 },
    { name: 'phi3', size: '3.8B', speed: 3 },
  ]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  
  // Settings expand state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Uploading state
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Ollama status check state
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);
  
  // Hidden input element ref for manual plus button uploads
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch Ollama status & models on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/documents`);
        setIsOllamaConnected(res.ok);
      } catch (err) {
        setIsOllamaConnected(false);
      }
    };

    const fetchModels = async () => {
      setLoadingModels(true);
      try {
        const res = await fetch(`${API_BASE_URL}/models`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setModels(data);
            const exists = data.some((m: ModelInfo) => m.name === selectedModel);
            if (!exists) {
              setSelectedModel(data[0].name);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch models, using default local models fallback.', err);
      } finally {
        setLoadingModels(false);
      }
    };

    checkConnection();
    fetchModels();

    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dropzone file uploader implementation
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const fileToUpload = acceptedFiles[0];
    setUploadingFile(fileToUpload.name);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', fileToUpload);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/upload`, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onRefreshCollections();
        try {
          const res = JSON.parse(xhr.responseText);
          if (res && res.collection_name) {
            setSelectedCollection(res.collection_name);
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        alert('Upload failed: ' + xhr.statusText);
      }
      setUploadingFile(null);
      setUploadProgress(0);
    };

    xhr.onerror = () => {
      alert('Network error occurred during document upload.');
      setUploadingFile(null);
      setUploadProgress(0);
    };

    xhr.send(formData);
  }, [onRefreshCollections, setSelectedCollection]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    },
    multiple: false,
    disabled: uploadingFile !== null
  });

  // Handle manual "+" button click — delegate to upload modal if available
  const handlePlusClick = () => {
    if (onRequestUpload) {
      onRequestUpload();
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleManualFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onDrop([e.target.files[0]]);
    }
  };

  const getFileInfo = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return { color: '#EF4444', label: 'PDF' };
    if (ext === 'txt') return { color: '#3B82F6', label: 'TXT' };
    if (ext === 'md') return { color: '#8B5CF6', label: 'MD' };
    return { color: '#0D9488', label: 'DOC' };
  };

  // SVG circular loader math
  const strokeRadius = 14;
  const strokeCircumference = 2 * Math.PI * strokeRadius;
  const strokeOffset = strokeCircumference - (uploadProgress / 100) * strokeCircumference;

  // Selected model details helper
  const activeModelInfo = models.find(m => m.name === selectedModel) || { name: selectedModel, size: 'Auto', speed: 3 };

  return (
    <aside 
      style={{
        width: '280px',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        background: 'rgba(8, 8, 14, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        color: '#fff',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. Logo Section */}
      <div 
        className="sidebar-logo-container"
        style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          position: 'relative'
        }}
      >
        <div 
          className="vault-logo-icon"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-teal))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(124, 58, 237, 0.2)',
            position: 'relative'
          }}
        >
          <IconVault size={20} color="#fff" />
          
          {/* Pulse connection indicator dot */}
          <span 
            className={isOllamaConnected ? 'dot-pulse-green' : 'dot-pulse-red'}
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isOllamaConnected ? '#10B981' : '#EF4444',
              border: '2px solid #08080E'
            }}
          />
        </div>
        <span style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.3px' }}>
          VaultAI
        </span>
      </div>

      {/* 2. Model Selector */}
      <div 
        ref={dropdownRef}
        style={{
          padding: '16px 20px',
          position: 'relative',
          zIndex: 15
        }}
      >
        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255, 255, 255, 0.3)', marginBottom: '8px', fontWeight: 700 }}>
          Model
        </div>
        
        {/* Custom trigger dropdown button */}
        <div ref={modelSelectorRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{activeModelInfo.name}</span>
              <span 
                style={{ 
                  fontSize: '9px', 
                  padding: '2px 6px', 
                  borderRadius: '6px', 
                  background: 'rgba(124, 58, 237, 0.15)', 
                  color: 'var(--accent-purple)', 
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  fontWeight: 700
                }}
              >
                {activeModelInfo.size}
              </span>
            </div>
            <IconChevronDown size={14} style={{ opacity: 0.6, transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 200ms ease' }} />
          </button>
        </div>

        {/* Dropdown panel */}
        {isDropdownOpen && (
          <div 
            style={{
              position: 'absolute',
              top: '72px',
              left: '20px',
              right: '20px',
              background: 'rgba(15, 15, 22, 0.95)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              padding: '6px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
              zIndex: 20,
              maxHeight: '260px',
              overflowY: 'auto'
            }}
          >
            {loadingModels ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', gap: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                <IconLoader2 className="loading-spinner" size={16} />
                Loading models...
              </div>
            ) : (
              models.map((model) => (
                <div 
                  key={model.name}
                  onClick={() => {
                    setSelectedModel(model.name);
                    setIsDropdownOpen(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    borderLeft: selectedModel === model.name ? '3px solid var(--accent-purple)' : '3px solid transparent',
                    background: selectedModel === model.name ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                    marginBottom: '2px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: selectedModel === model.name ? 600 : 400 }}>{model.name}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{model.size}</span>
                  </div>
                  <span style={{ color: 'var(--accent-teal)', fontSize: '10px', letterSpacing: '1px' }}>
                    {'●'.repeat(model.speed)}{'○'.repeat(3 - model.speed)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 3. Document List */}
      <div 
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          padding: '8px 20px 16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
        }}
      >
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px'
          }}
        >
          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255, 255, 255, 0.3)', fontWeight: 700 }}>
            Documents
          </span>
          <button 
            onClick={handlePlusClick}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <IconPlus size={16} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleManualFileChange} 
            accept=".pdf,.txt,.md"
            style={{ display: 'none' }}
          />
        </div>

        {/* Scrollable list */}
        <div 
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            paddingRight: '4px',
            marginBottom: '16px'
          }}
        >
          {collections.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px', padding: '24px 0' }}>
              No libraries ingested yet.
            </div>
          ) : (
            collections.map((col) => {
              const fileInfo = getFileInfo(col.filename);
              const isActive = selectedCollection === col.collection_name;

              return (
                <div 
                  key={col.collection_name}
                  onClick={() => setSelectedCollection(col.collection_name)}
                  className={`sidebar-doc-card ${isActive ? 'active' : ''} ${col.collection_name === bouncingCollection ? 'sidebar-doc-bounce' : ''}`}
                  style={{
                    padding: '10px 12px',
                    display: 'grid',
                    gridTemplateColumns: '36px 1fr auto',
                    gap: '10px',
                    alignItems: 'center',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Extension icon container */}
                  <div 
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 800,
                      color: fileInfo.color
                    }}
                  >
                    {fileInfo.label}
                  </div>
                  
                  {/* Name and chunks */}
                  <div style={{ minWidth: 0 }}>
                    <div 
                      style={{ 
                        fontSize: '13px', 
                        fontWeight: 500, 
                        color: isActive ? '#fff' : 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={col.filename}
                    >
                      {col.filename}
                    </div>
                    <span 
                      style={{ 
                        fontSize: '9px', 
                        padding: '1px 5px', 
                        borderRadius: '4px', 
                        background: 'rgba(255, 255, 255, 0.05)', 
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                        border: '1px solid var(--border-subtle)',
                        display: 'inline-block',
                        marginTop: '2px'
                      }}
                    >
                      {col.chunk_count} chunks
                    </span>
                  </div>

                  {/* Actions */}
                  <div>
                    <button 
                      className="trash-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete vault library "${col.filename}"?`)) {
                          onDeleteCollection(col.collection_name);
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.4)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'opacity 200ms ease, color 200ms ease'
                      }}
                      title="Delete Vault"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Inline CSS style rules for cards actions on hover */}
          <style dangerouslySetInnerHTML={{__html: `
            .sidebar-doc-card .trash-btn {
              opacity: 0;
            }
            .sidebar-doc-card:hover .trash-btn {
              opacity: 1;
            }
            .sidebar-doc-card:hover .trash-btn:hover {
              color: #EF4444;
            }
            @keyframes doc-bounce {
              0%, 100% { transform: scale(1); }
              20% { transform: scale(1.1); }
              50% { transform: scale(0.95); }
              80% { transform: scale(1.02); }
            }
            .sidebar-doc-bounce {
              animation: doc-bounce 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
          `}} />
        </div>

        {/* 4. Upload Zone */}
        <div 
          {...getRootProps()}
          style={{
            border: isDragActive 
              ? '1.5px dashed var(--accent-purple)' 
              : '1.5px dashed rgba(255,255,255,0.15)',
            background: isDragActive 
              ? 'rgba(124,58,237,0.08)' 
              : 'rgba(255,255,255,0.01)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
            cursor: uploadingFile ? 'not-allowed' : 'pointer',
            transition: 'all 200ms ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            boxSizing: 'border-box'
          }}
        >
          <input {...getInputProps()} />
          
          {uploadingFile ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              {/* Circular animated progress SVG */}
              <div style={{ position: 'relative', width: '36px', height: '36px' }}>
                <svg width="36" height="36" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                  {/* Track */}
                  <circle 
                    cx="18" 
                    cy="18" 
                    r={strokeRadius} 
                    fill="transparent" 
                    stroke="rgba(255, 255, 255, 0.05)" 
                    strokeWidth="3" 
                  />
                  {/* Fill progress indicator */}
                  <circle 
                    cx="18" 
                    cy="18" 
                    r={strokeRadius} 
                    fill="transparent" 
                    stroke="var(--accent-purple)" 
                    strokeWidth="3"
                    strokeDasharray={strokeCircumference}
                    strokeDashoffset={strokeOffset}
                    style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700 }}>
                  {uploadProgress}%
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                Ingesting {uploadingFile}
              </div>
            </div>
          ) : (
            <>
              <IconCloudUpload 
                size={28} 
                style={{ 
                  color: isDragActive ? 'var(--accent-purple)' : 'rgba(255,255,255,0.3)',
                  transform: isDragActive ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform 200ms ease'
                }} 
              />
              <span style={{ fontSize: '12px', color: isDragActive ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 500 }}>
                {isDragActive ? 'Drop file here...' : 'Drop files here or click'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 5. Settings Panel */}
      <div 
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          boxSizing: 'border-box'
        }}
      >
        <button 
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          style={{
            width: '100%',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
            <IconAdjustments size={16} />
            Settings
          </div>
          <IconChevronUp 
            size={14} 
            style={{ 
              transform: isSettingsOpen ? 'rotate(0)' : 'rotate(180deg)', 
              transition: 'transform 200ms ease' 
            }} 
          />
        </button>

        {isSettingsOpen && (
          <div 
            style={{
              padding: '0 20px 20px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              background: 'rgba(0,0,0,0.1)'
            }}
          >
            {/* Slider 1: Temperature */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span>Temperature</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)' }}>{settings.temperature.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                className="custom-range-slider"
                value={settings.temperature}
                onChange={(e) => onUpdateSettings({ ...settings, temperature: parseFloat(e.target.value) })}
              />
            </div>

            {/* Slider 2: Chunk Size */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span>Chunk Size</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)' }}>{settings.chunkSize} tokens</span>
              </div>
              <input 
                type="range" 
                min="256" 
                max="1024" 
                step="64"
                className="custom-range-slider"
                value={settings.chunkSize}
                onChange={(e) => onUpdateSettings({ ...settings, chunkSize: parseInt(e.target.value, 10) })}
              />
            </div>

            {/* Slider 3: Top-k Results */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span>Top-k Contexts</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)' }}>{settings.topK} chunks</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="8" 
                step="1"
                className="custom-range-slider"
                value={settings.topK}
                onChange={(e) => onUpdateSettings({ ...settings, topK: parseInt(e.target.value, 10) })}
              />
            </div>
          </div>
        )}
      </div>

      {/* 6. Bottom Status Bar */}
      <div 
        style={{
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          background: 'rgba(0, 0, 0, 0.15)',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span 
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isOllamaConnected ? '#10B981' : '#EF4444',
              display: 'inline-block'
            }}
          />
          <span>{isOllamaConnected ? 'Ollama Online' : 'Ollama Offline'}</span>
        </div>
        
        <span style={{ fontSize: '10px', opacity: 0.5, fontFamily: 'var(--font-mono)' }}>
          v1.0
        </span>

        <button 
          onClick={toggleTheme}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <IconSun size={14} /> : <IconMoon size={14} />}
        </button>
      </div>
    </aside>
  );
};
