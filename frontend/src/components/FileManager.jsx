import React, { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { listFiles, deleteFile, clearFiles, resetAllData } from '../services/api';

const scopes = [
  { key: 'uploads', label: 'Uploads' },
  { key: 'results', label: 'Results' }
];

const formatBytes = (bytes) => {
  if (bytes === 0 || bytes == null) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const FileManager = () => {
  const [scope, setScope] = useState('uploads');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inFlightController = useRef(null);

  const loadFiles = async (currentScope = scope) => {
    setLoading(true);
    setError('');
    try {
      // Cancel any previous in-flight request
      if (inFlightController.current) {
        try { inFlightController.current.abort(); } catch { /* ignore */ }
      }
      const controller = new AbortController();
      inFlightController.current = controller;
      const data = await listFiles(currentScope, { signal: controller.signal });
      const list = data.files || (currentScope === 'uploads' ? data.uploads : data.results) || [];
      setFiles(Array.isArray(list) ? list : []);
    } catch (e) {
      // Swallow abort errors as they are expected during unmount/scope changes
      if (e?.name !== 'AbortError') {
        setError(e.message || 'Failed to load files');
      }
    } finally {
      setLoading(false);
    }
  };

  const hasMounted = useRef(false);
  const debounceTimer = useRef(null);
  const isDev = process.env.NODE_ENV === 'development';

  // Initial load once with a slight delay to avoid HMR-induced aborts
  useEffect(() => {
    hasMounted.current = true;
    if (!isDev) {
      debounceTimer.current && clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        loadFiles(scope);
      }, 250);
    }
    return () => {
      debounceTimer.current && clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subsequent loads when scope changes with a small debounce
  useEffect(() => {
    if (!hasMounted.current) return;
    debounceTimer.current && clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      loadFiles(scope);
    }, 150);
    return () => {
      debounceTimer.current && clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  // Cleanup: abort any in-flight request on unmount
  useEffect(() => {
    return () => {
      if (inFlightController.current) {
        try { inFlightController.current.abort(); } catch { /* ignore */ }
      }
    };
  }, []);

  const handleDelete = async (name) => {
    if (!name) return;
    const ok = window.confirm(`Delete file '${name}' from ${scope}?`);
    if (!ok) return;
    try {
      await deleteFile(scope, name);
      await loadFiles();
    } catch (e) {
      alert(e.message || 'Failed to delete file');
    }
  };

  const handleClearAll = async () => {
    const ok = window.confirm(`Delete ALL files in ${scope}?`);
    if (!ok) return;
    try {
      await clearFiles(scope);
      await loadFiles();
    } catch (e) {
      alert(e.message || 'Failed to clear files');
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Manage Files</CardTitle>
            <CardDescription>View and delete uploaded or result files.</CardDescription>
          </div>
          <div className="flex gap-2">
            {scopes.map(s => (
              <Button key={s.key} variant={scope === s.key ? 'default' : 'outline'} onClick={() => setScope(s.key)}>
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isDev && files.length === 0 && !loading && !error && (
          <div className="flex items-center justify-between p-3 mb-3 rounded border bg-accent/20">
            <div className="text-sm text-muted-foreground">Development mode: click Load Files to fetch list and avoid HMR abort noise.</div>
            <Button size="sm" variant="outline" onClick={() => loadFiles(scope)}>Load Files</Button>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 mb-2">
            <div className="text-red-500 text-sm">{error}</div>
            <Button size="sm" variant="outline" onClick={() => loadFiles(scope)}>Retry</Button>
          </div>
        )}
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="text-sm text-muted-foreground">No files found in {scope}.</div>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div key={f.name} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-xs text-muted-foreground">{formatBytes(f.size)} • {f.modified}</div>
                </div>
                <Button variant="destructive" onClick={() => handleDelete(f.name)}>Delete</Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex w-full justify-between">
          <Button variant="outline" onClick={handleClearAll} disabled={loading || files.length === 0}>Delete All in {scope}</Button>
          <Button
            variant="destructive"
            onClick={async () => {
              const ok1 = window.confirm('This will wipe database tables and files. Continue?');
              if (!ok1) return;
              const ok2 = window.confirm('Are you absolutely sure? This action cannot be undone.');
              if (!ok2) return;
              try {
                await resetAllData();
                await loadFiles();
                alert('All data and files have been purged.');
              } catch (e) {
                alert(e.message || 'Failed to reset all data');
              }
            }}
          >
            Reset All Data
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default FileManager;