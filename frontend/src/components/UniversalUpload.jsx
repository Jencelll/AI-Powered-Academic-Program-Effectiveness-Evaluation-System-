import React, { useCallback, useMemo, useState } from 'react';
import { uploadAnyFilesXHR } from '../services/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const bytesToSize = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val > 100 ? 0 : 1)} ${sizes[i]}`;
};

const UniversalUpload = () => {
  const [files, setFiles] = useState([]); // { file, previewUrl?, progress, status, server? }
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const onSelect = useCallback((e) => {
    const list = Array.from(e.target.files || []);
    const next = list.map((f) => ({
      file: f,
      previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
      progress: 0,
      status: 'pending',
      server: null,
    }));
    setFiles(next);
    setError('');
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const list = Array.from(e.dataTransfer.files || []);
    const next = list.map((f) => ({
      file: f,
      previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
      progress: 0,
      status: 'pending',
      server: null,
    }));
    setFiles(next);
    setError('');
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const totalCount = files.length;
  const completedCount = useMemo(() => files.filter((f) => f.status === 'success').length, [files]);

  const handleUpload = async () => {
    if (!files.length) return;
    setIsUploading(true);
    setError('');
    try {
      const updates = [...files];
      const res = await uploadAnyFilesXHR(
        files.map((f) => f.file),
        {
          onProgress: (index, loaded, total) => {
            updates[index] = { ...updates[index], progress: total ? Math.round((loaded / total) * 100) : 0, status: 'uploading' };
            setFiles([...updates]);
          },
        }
      );
      res.forEach((r) => {
        if (r.ok) {
          updates[r.index] = { ...updates[r.index], status: 'success', server: r.server };
        } else {
          updates[r.index] = { ...updates[r.index], status: 'error', server: null };
        }
      });
      setFiles([...updates]);
    } catch (err) {
      setError(err?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="backdrop-blur-md bg-white/70 dark:bg-gray-800/50 border border-indigo-100/60 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Universal Uploads (Any File Type)</span>
          <span className="text-xs text-gray-500">{completedCount}/{totalCount} completed</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="border-2 border-dashed border-indigo-200 rounded-xl p-6 text-center bg-indigo-50/50 hover:bg-indigo-100/60 transition"
        >
          <p className="text-sm text-gray-600 mb-2">Drag & drop files here, or select below</p>
          <input
            type="file"
            multiple
            onChange={onSelect}
            className="hidden"
            id="universal-files"
          />
          <label htmlFor="universal-files" className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer">
            Choose Files
          </label>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        {files.length > 0 && (
          <div className="mt-4 space-y-3">
            {files.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 bg-white/70 dark:bg-gray-900/50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {item.previewUrl ? (
                      <img src={item.previewUrl} alt={item.file.name} className="h-10 w-10 rounded-md object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
                        {item.file.type?.split('/')[1]?.slice(0,3)?.toUpperCase() || 'FILE'}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-800 dark:text-white">{item.file.name}</div>
                      <div className="text-xs text-gray-500">{item.file.type || 'application/octet-stream'} • {bytesToSize(item.file.size)}</div>
                    </div>
                  </div>
                  <div className="text-xs">
                    {item.status === 'success' && <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">Uploaded</span>}
                    {item.status === 'error' && <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">Error</span>}
                    {item.status === 'uploading' && <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">Uploading...</span>}
                    {item.status === 'pending' && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">Pending</span>}
                  </div>
                </div>
                <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-indigo-600 to-purple-600" style={{ width: `${item.progress}%` }} />
                </div>
                {item.server?.preview?.text_excerpt && (
                  <div className="mt-2 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-32 overflow-auto">
                    {item.server.preview.text_excerpt}
                  </div>
                )}
                {item.server?.preview?.url && (
                  <div className="mt-2">
                    <a className="text-xs text-indigo-700 underline" href={item.server.preview.url} target="_blank" rel="noreferrer">Open preview</a>
                  </div>
                )}
                {item.status === 'error' && (
                  <div className="mt-2 text-xs text-red-700">{item.server?.error || 'Upload failed'}</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <Button className={`bg-gradient-to-r from-indigo-600 to-purple-600 text-white ${isUploading ? 'opacity-80' : ''}`} disabled={isUploading || files.length === 0} onClick={handleUpload}>
            {isUploading ? 'Uploading…' : 'Upload Files'}
          </Button>
          {completedCount === totalCount && totalCount > 0 && (
            <span className="text-xs text-green-700 bg-green-100 border border-green-200 px-2 py-1 rounded">All files uploaded</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UniversalUpload;