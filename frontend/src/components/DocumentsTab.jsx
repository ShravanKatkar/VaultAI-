import React, { useState } from 'react';
import { Upload, Trash2, FileText, Calendar, Layers, ShieldCheck, Loader2 } from 'lucide-react';
import { use3DTilt } from '../hooks/use3DTilt';

export default function DocumentsTab({ collections, loading, onRefresh }) {
  const uploadCardRef = use3DTilt();
  const listCardRef = use3DTilt();
  const [file, setFile] = useState(null);
  const [customCollectionName, setCustomCollectionName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // { success: boolean, message: string }

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (['pdf', 'txt', 'md'].includes(ext)) {
      setFile(selectedFile);
      setUploadStatus(null);
    } else {
      setUploadStatus({
        success: false,
        message: 'Unsupported format. Please upload PDF, TXT, or MD files.'
      });
      setFile(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', file);
    if (customCollectionName.trim()) {
      formData.append('collection_name', customCollectionName.trim());
    }

    try {
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus({
          success: true,
          message: `Successfully uploaded ${data.filename}! Stored ${data.chunks_stored} chunks in collection "${data.collection_name}".`
        });
        setFile(null);
        setCustomCollectionName('');
        onRefresh();
      } else {
        setUploadStatus({
          success: false,
          message: data.detail || 'Upload failed. Please check backend logs.'
        });
      }
    } catch (err) {
      setUploadStatus({
        success: false,
        message: 'Unable to connect to the backend server. Is it running?'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (collectionName) => {
    if (!confirm(`Are you sure you want to delete collection "${collectionName}"? This will permanently erase all text chunks.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/documents/${collectionName}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onRefresh();
      } else {
        const data = await response.json();
        alert(data.detail || 'Failed to delete collection.');
      }
    } catch (err) {
      alert('Network error when attempting deletion.');
    }
  };

  return (
    <div className="upload-grid">
      {/* Upload Panel */}
      <div ref={uploadCardRef} className="glass-panel upload-card card-3d">
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: '#fff' }}>Upload Document</h2>
        
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div 
            className={`dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input 
              id="file-input" 
              type="file" 
              accept=".pdf,.txt,.md" 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
            />
            <Upload className="dropzone-icon" size={32} />
            {file ? (
              <div>
                <p style={{ fontWeight: '600', color: '#fff' }}>{file.name}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {(file.size / 1024).toFixed(1)} KB • Click to change
                </p>
              </div>
            ) : (
              <div>
                <p style={{ fontWeight: '600', color: '#fff' }}>Drag & drop file here</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  PDF, TXT, or MD up to 20MB
                </p>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Custom Collection Name (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. quarterly_report_2026"
              className="form-control"
              value={customCollectionName}
              onChange={(e) => setCustomCollectionName(e.target.value)}
              disabled={uploading}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              If left blank, a valid collection name will be generated automatically.
            </span>
          </div>

          <button 
            type="submit" 
            className="btn" 
            disabled={!file || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="loading-spinner" size={16} />
                Ingesting Document...
              </>
            ) : (
              <>
                <Upload size={16} />
                Ingest to Vault
              </>
            )}
          </button>
        </form>

        {uploadStatus && (
          <div className={`status-badge ${uploadStatus.success ? 'success' : 'danger'}`} style={{ marginTop: '12px', width: '100%', justifyContent: 'center', padding: '10px' }}>
            <span style={{ textAlign: 'center', fontSize: '12px' }}>{uploadStatus.message}</span>
          </div>
        )}
      </div>

      {/* Collections List Panel */}
      <div ref={listCardRef} className="glass-panel card-3d" style={{ minHeight: '350px' }}>
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>Secure Knowledge Vaults</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ingested document libraries ready for local intelligence retrieval.</p>
          </div>
          <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '4px 10px', borderRadius: '8px' }}>
            {collections.length} Vaults
          </span>
        </div>

        {loading ? (
          <div className="loading-container">
            <Loader2 className="loading-spinner" size={32} />
            <p>Scanning local vectors...</p>
          </div>
        ) : collections.length === 0 ? (
          <div className="loading-container" style={{ opacity: 0.7 }}>
            <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
            <p style={{ fontWeight: '600' }}>Your Knowledge Vault is empty</p>
            <p style={{ fontSize: '12px' }}>Upload a file on the left to initialize vector databases.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Source Document</th>
                  <th>Collection ID</th>
                  <th>Vector Chunks</th>
                  <th>Ingested At</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {collections.map((col) => (
                  <tr key={col.collection_name}>
                    <td>
                      <div className="doc-name-cell">
                        <FileText size={18} className="doc-icon" />
                        <div>
                          <div style={{ fontWeight: '600', color: '#fff' }}>{col.filename}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="tag tag-indigo">{col.collection_name}</span>
                    </td>
                    <td>
                      <span className="tag tag-cyan">{col.chunk_count} chunks</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={12} />
                        {col.uploaded_at !== 'Unknown' && col.uploaded_at !== 'N/A'
                          ? new Date(col.uploaded_at).toLocaleString() 
                          : 'Prior Ingestion'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="icon-btn" 
                        onClick={() => handleDelete(col.collection_name)}
                        title="Delete Collection"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
