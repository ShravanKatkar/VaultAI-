import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, FileText, Activity, Brain, Sun, Moon } from 'lucide-react';
import ChatTab from './components/ChatTab';
import DocumentsTab from './components/DocumentsTab';
import EvalDashboard from './pages/EvalDashboard';
import { useTheme } from './hooks/useTheme';
import { Landing } from './pages/Landing';
import { Sidebar } from './components/Sidebar/Sidebar';
import { UploadModal } from './components/Upload/UploadModal';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [isLaunched, setIsLaunched] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama3');
  const [settings, setSettings] = useState(() => {
    const stored = localStorage.getItem('vaultai-settings');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (err) {}
    }
    return { temperature: 0.7, chunkSize: 512, topK: 4 };
  });

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDragHovering, setIsDragHovering] = useState(false);
  const [modalInitialFile, setModalInitialFile] = useState(null);
  const dragCounterRef = useRef(0);

  const handleUpdateSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('vaultai-settings', JSON.stringify(newSettings));
  };

  const handleDeleteCollection = async (collectionName) => {
    try {
      const response = await fetch(`http://localhost:8000/documents/${collectionName}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchCollections();
      } else {
        const data = await response.json();
        alert(data.detail || 'Failed to delete collection.');
      }
    } catch (err) {
      alert('Network error when attempting deletion.');
    }
  };

  const fetchCollections = async () => {
    setLoadingCollections(true);
    try {
      const response = await fetch('http://localhost:8000/documents');
      if (response.ok) {
        const data = await response.json();
        setCollections(data);
        
        // If there's an active collection that is no longer in the list, clear it
        if (selectedCollection && !data.some(c => c.collection_name === selectedCollection)) {
          setSelectedCollection('');
        }
        
        // Auto-select the first collection if none is selected and collections exist
        if (!selectedCollection && data.length > 0) {
          setSelectedCollection(data[0].collection_name);
        }
      }
    } catch (err) {
      console.error("Failed to query collections:", err);
    } finally {
      setLoadingCollections(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  // ─── Window-level drag-and-drop for upload modal ───────────────────────────

  useEffect(() => {
    if (!isLaunched) return;

    const handleDragEnter = (e) => {
      e.preventDefault();
      // Only respond to file drags (not text selection drags, etc.)
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        dragCounterRef.current++;
        if (dragCounterRef.current === 1) {
          setIsDragHovering(true);
          setIsUploadModalOpen(true);
          setModalInitialFile(null);
        }
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsDragHovering(false);
        // Only close if still in drag phase (no file selected yet)
        setIsUploadModalOpen((prev) => prev ? false : prev);
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragHovering(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        setModalInitialFile(files[0]);
        setIsUploadModalOpen(true);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [isLaunched]);

  // Body 3D tilt class toggle
  useEffect(() => {
    if (isDragHovering) {
      document.body.classList.add('upload-drag-active');
    } else {
      document.body.classList.remove('upload-drag-active');
    }
    return () => document.body.classList.remove('upload-drag-active');
  }, [isDragHovering]);

  // Upload modal handlers
  const handleUploadModalClose = useCallback(() => {
    setIsUploadModalOpen(false);
    setModalInitialFile(null);
    setIsDragHovering(false);
    dragCounterRef.current = 0;
  }, []);

  const handleUploadComplete = useCallback((result) => {
    fetchCollections();
    if (result?.collection_name) {
      setSelectedCollection(result.collection_name);
    }
  }, []);

  const handleRequestUpload = useCallback(() => {
    setModalInitialFile(null);
    setIsUploadModalOpen(true);
  }, []);

  if (!isLaunched) {
    return <Landing onLaunch={() => setIsLaunched(true)} />;
  }

  return (
    <div style={{ paddingLeft: '280px', minHeight: '100vh', width: '100%', boxSizing: 'border-box' }}>
      <Sidebar 
        collections={collections}
        selectedCollection={selectedCollection}
        setSelectedCollection={setSelectedCollection}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        onDeleteCollection={handleDeleteCollection}
        onRefreshCollections={fetchCollections}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onRequestUpload={handleRequestUpload}
      />

      <div className="app-container">
        {/* Header Bar */}
        <header className="app-header">
          <div className="logo-container">
            <div className="logo-icon">
              <Brain size={24} />
            </div>
            <div>
              <div className="logo-text">VaultAI</div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>OFFLINE RAG SYSTEM</span>
                <span className="logo-tag">v1.0.0</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Tab Navigation */}
            <nav className="nav-tabs">
              <button 
                className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                <MessageSquare size={16} />
                Secure Chat
              </button>
              <button 
                className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
                onClick={() => setActiveTab('documents')}
              >
                <FileText size={16} />
                Documents Vault
              </button>
              <button 
                className={`tab-btn ${activeTab === 'evaluation' ? 'active' : ''}`}
                onClick={() => setActiveTab('evaluation')}
              >
                <Activity size={16} />
                Pipeline Eval
              </button>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="dashboard-content">
          {activeTab === 'chat' && (
            <ChatTab 
              collections={collections}
              selectedCollection={selectedCollection}
              setSelectedCollection={setSelectedCollection}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              settings={settings}
            />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab 
              collections={collections}
              loading={loadingCollections}
              onRefresh={fetchCollections}
            />
          )}
          {activeTab === 'evaluation' && (
            <EvalDashboard 
              collections={collections}
              selectedCollection={selectedCollection}
            />
          )}
        </main>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        isDragHovering={isDragHovering}
        initialFile={modalInitialFile}
        chunkSize={settings.chunkSize}
        onClose={handleUploadModalClose}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}
