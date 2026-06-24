import { useState, useRef, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export type UploadPhase =
  | 'idle'
  | 'preview'
  | 'uploading'
  | 'parsing'
  | 'chunking'
  | 'embedding'
  | 'success'
  | 'error';

export interface UploadResult {
  filename: string;
  collection_name: string;
  chunks_stored: number;
  status: string;
}

export function useUpload() {
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const serverDoneRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    cleanup();
    serverDoneRef.current = false;
    setPhase('idle');
    setFile(null);
    setUploadProgress(0);
    setOverallProgress(0);
    setError(null);
    setResult(null);
  }, [cleanup]);

  const selectFile = useCallback((f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'txt', 'md'].includes(ext)) {
      setFile(f);
      setPhase('error');
      setError(
        `Unsupported file type ".${ext || 'unknown'}". Only .pdf, .txt, and .md files are accepted.`
      );
      return;
    }
    setFile(f);
    setPhase('preview');
    setError(null);
    setUploadProgress(0);
    setOverallProgress(0);
    setResult(null);
  }, []);

  const startUpload = useCallback(() => {
    if (!file) return;

    serverDoneRef.current = false;
    setPhase('uploading');
    setUploadProgress(0);
    setOverallProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open('POST', `${API_BASE_URL}/upload`, true);

    // Track file transfer progress → maps to 0-40% overall
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(pct);
        setOverallProgress(Math.round(pct * 0.4));
      }
    };

    // File fully transferred → begin simulated processing stages
    xhr.upload.onload = () => {
      setPhase('parsing');
      let sim = 40;

      timerRef.current = setInterval(() => {
        if (serverDoneRef.current) {
          cleanup();
          return;
        }

        if (sim < 55) {
          sim += 1.2 + Math.random() * 1.5;
          setPhase('parsing');
        } else if (sim < 75) {
          sim += 0.9 + Math.random() * 1.2;
          setPhase('chunking');
        } else if (sim < 95) {
          sim += Math.max(0.1, (95 - sim) * 0.06);
          setPhase('embedding');
        }

        setOverallProgress(Math.min(Math.round(sim), 95));
      }, 140);
    };

    // Server response (success or error)
    xhr.onload = () => {
      serverDoneRef.current = true;
      cleanup();

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res: UploadResult = JSON.parse(xhr.responseText);
          setResult(res);
          setOverallProgress(100);
          setPhase('success');
        } catch {
          setPhase('error');
          setError('Failed to parse server response.');
        }
      } else {
        let msg = 'Upload failed.';
        try {
          const errData = JSON.parse(xhr.responseText);
          msg = errData.detail || msg;
        } catch { /* keep default */ }
        setPhase('error');
        setError(msg);
      }
    };

    xhr.onerror = () => {
      serverDoneRef.current = true;
      cleanup();
      setPhase('error');
      setError('Network error. Please verify the backend server is running on port 8000.');
    };

    xhr.send(formData);
  }, [file, cleanup]);

  useEffect(() => {
    return () => {
      if (xhrRef.current) xhrRef.current.abort();
      cleanup();
    };
  }, [cleanup]);

  return {
    phase,
    file,
    uploadProgress,
    overallProgress,
    error,
    result,
    selectFile,
    startUpload,
    reset,
  };
}
