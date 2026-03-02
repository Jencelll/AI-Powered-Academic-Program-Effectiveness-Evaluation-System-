import React, { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { uploadFiles } from '../services/api'; // Import the API function

const UploadForm = ({ onUploadSuccess }) => { // Accept a callback for success
  const [uploadType, setUploadType] = useState('analysis'); // 'analysis' or 'accomplishment'
  
  // State for Class Records Analysis
  const [formData, setFormData] = useState({
    facultyName: '',
    program: '',
    semester: '',
    academicYear: '',
    classProfile: null,
    defReport: null,
    classRecords: []
  });

  // State for Subject Accomplishment
  const [accData, setAccData] = useState({
    subjectCode: '',
    subjectTitle: '',
    academicYear: '',
    semester: '',
    file: null
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileChange = (e, fieldName) => {
    if (fieldName === 'classRecords') {
      setFormData(prev => ({
        ...prev,
        [fieldName]: Array.from(e.target.files) // Convert FileList to Array
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [fieldName]: e.target.files[0]
      }));
    }
  };

  const handleAnalysisSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadError('');

    const apiFormData = new FormData();
    // Generate a unique idempotency key for each distinct upload attempt
    // This ensures that even if the user uploads for the same faculty multiple times in one session,
    // they are treated as separate versions unless the backend explicitly dedupes by content.
    const idemKey = crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    
    apiFormData.append('idempotency_key', idemKey);
    apiFormData.append('faculty_name', formData.facultyName);
    if (formData.program) apiFormData.append('program', formData.program);
    if (formData.semester) apiFormData.append('semester', formData.semester);
    if (formData.academicYear) apiFormData.append('academic_year', formData.academicYear);
    apiFormData.append('class_profile', formData.classProfile);
    apiFormData.append('def_report', formData.defReport);
    formData.classRecords.forEach(file => {
      apiFormData.append('class_records', file);
    });

    try {
      const result = await uploadFiles(apiFormData);
      console.log('Upload successful:', result);
      onUploadSuccess();
      const warnings = Array.isArray(result?.warnings) ? result.warnings.filter(Boolean) : [];
      const report = result?.extraction_report;
      const summary = report ? `\nRows parsed (Profile): ${report.class_profile?.rows_parsed ?? 0}\nRows parsed (Deficiency): ${report.deficiency_report?.rows_parsed ?? 0}` : '';
      const msg = warnings.length
        ? `Upload complete with warnings.\n${warnings.join('\n')}${summary}`
        : `Upload and analysis completed successfully!${summary}`;
      alert(msg);
    } catch (error) {
      console.error('Upload error:', error);
      const msg = (error && error.message) ? String(error.message) : 'Unexpected error during upload';
      const friendly = msg === 'Failed to fetch'
        ? 'Network error contacting backend. Please ensure the server is running and retry.'
        : msg;
      setUploadError(friendly);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAccomplishmentSubmit = async (e) => {
    e.preventDefault();
    if (!accData.file || !accData.subjectCode) {
        setUploadError('Subject Code and File are required.');
        return;
    }
    
    setIsUploading(true);
    setUploadError('');
    
    const apiFormData = new FormData();
    apiFormData.append('subject_accomplishment', accData.file);
    apiFormData.append('subject_code', accData.subjectCode);
    if (accData.subjectTitle) apiFormData.append('subject_title', accData.subjectTitle);
    if (accData.academicYear) apiFormData.append('academic_year', accData.academicYear);
    if (accData.semester) apiFormData.append('semester', accData.semester);
    
    try {
        await uploadFiles(apiFormData);
        alert("Subject Accomplishment Report uploaded successfully!");
        onUploadSuccess();
        // Reset form
        setAccData({
            subjectCode: '',
            subjectTitle: '',
            academicYear: '',
            semester: '',
            file: null
        });
    } catch (error) {
        console.error('Upload error:', error);
        setUploadError(error.message || 'Error uploading accomplishment report');
    } finally {
        setIsUploading(false);
    }
  };

  const handleRetry = async () => {
    if (uploadType === 'analysis') {
        if (!formData.classProfile || !formData.defReport) {
            setUploadError('Please select the required files before retrying.');
            return;
        }
        await handleAnalysisSubmit({ preventDefault: () => {} });
    } else {
        await handleAccomplishmentSubmit({ preventDefault: () => {} });
    }
  };

  const completionPct = useMemo(() => {
    const total = 6; 
    const count = (formData.facultyName ? 1 : 0)
      + (formData.program ? 1 : 0)
      + (formData.semester ? 1 : 0)
      + (formData.academicYear ? 1 : 0)
      + (formData.classProfile ? 1 : 0)
      + (formData.defReport ? 1 : 0);
    return Math.round((count / total) * 100);
  }, [formData.facultyName, formData.program, formData.semester, formData.academicYear, formData.classProfile, formData.defReport]);

  return (
    <div className="space-y-6">
        {/* Type Switcher */}
        <div className="flex justify-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit mx-auto">
            <button
                onClick={() => setUploadType('analysis')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                    uploadType === 'analysis' 
                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
            >
                Class Records Analysis
            </button>
            <button
                onClick={() => setUploadType('accomplishment')}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                    uploadType === 'accomplishment' 
                    ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-300 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
            >
                Subject Accomplishment
            </button>
        </div>

        {uploadType === 'accomplishment' ? (
            <Card className="w-full max-w-2xl mx-auto shadow-lg border-0 dark:bg-gray-800">
                <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-t-lg">
                    <CardTitle>Subject Accomplishment Report</CardTitle>
                    <CardDescription className="text-green-100">
                    Upload Internal Review data (PDF, DOCX, XLSX)
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleAccomplishmentSubmit}>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="subjectCode">Subject Code <span className="text-red-500">*</span></Label>
                                <Input
                                    id="subjectCode"
                                    placeholder="e.g. ITST 301"
                                    value={accData.subjectCode}
                                    onChange={(e) => setAccData({...accData, subjectCode: e.target.value})}
                                    required
                                    className="dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subjectTitle">Subject Title (Optional)</Label>
                                <Input
                                    id="subjectTitle"
                                    placeholder="e.g. Adv. Database Systems"
                                    value={accData.subjectTitle}
                                    onChange={(e) => setAccData({...accData, subjectTitle: e.target.value})}
                                    className="dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="academicYear">Academic Year <span className="text-red-500">*</span></Label>
                                <select
                                    id="academicYear"
                                    value={accData.academicYear}
                                    onChange={(e) => setAccData({...accData, academicYear: e.target.value})}
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">Select Academic Year</option>
                                    {["2020-2021", "2021-2022", "2022-2023", "2023-2024", "2024-2025", "2025-2026", "2026-2027", "2027-2028", "2028-2029", "2029-2030"].map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="accSemester">Semester</Label>
                                <select
                                    id="accSemester"
                                    value={accData.semester}
                                    onChange={(e) => setAccData({...accData, semester: e.target.value})}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">Select Semester</option>
                                    <option value="1st Semester">1st Semester</option>
                                    <option value="2nd Semester">2nd Semester</option>
                                    <option value="Summer">Summer</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="accFile">Accomplishment Report File <span className="text-red-500">*</span></Label>
                            <Input
                                id="accFile"
                                type="file"
                                accept=".pdf,.docx,.xlsx,.xls"
                                onChange={(e) => setAccData({...accData, file: e.target.files[0]})}
                                required
                                className="cursor-pointer dark:bg-gray-700 dark:text-white"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Supported: PDF, Word, Excel. Extracts Weakness, Action, Recommendation.
                            </p>
                        </div>

                        {uploadError && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                                {uploadError}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button 
                            type="submit" 
                            disabled={!accData.file || !accData.subjectCode || isUploading}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isUploading ? 'Uploading...' : 'Upload Report'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        ) : (
            <Card className="w-full max-w-2xl mx-auto shadow-lg border-0 dark:bg-gray-800">
                <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
                    <CardTitle>AI Analysis Upload</CardTitle>
                    <CardDescription className="text-indigo-100">
                    Upload Class Profile, Deficiency Report, and Class Records.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleAnalysisSubmit}>
                    <CardContent className="space-y-6 pt-6">
                    <div>
                        <Label htmlFor="facultyName">Faculty Name</Label>
                        <Input
                        id="facultyName"
                        value={formData.facultyName}
                        onChange={(e) => setFormData(prev => ({ ...prev, facultyName: e.target.value }))}
                        required
                        className="h-11 rounded-xl shadow-inner focus:ring-2 focus:ring-indigo-400 transition"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                        <Label htmlFor="program">Program (optional)</Label>
                        <Input
                            id="program"
                            value={formData.program}
                            onChange={(e) => setFormData(prev => ({ ...prev, program: e.target.value }))}
                            placeholder="e.g., BSIT"
                            className="h-11 rounded-xl shadow-inner focus:ring-2 focus:ring-indigo-400 transition"
                        />
                        </div>
                        <div>
                        <Label htmlFor="semester">Semester</Label>
                        <Input
                            id="semester"
                            value={formData.semester}
                            onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                            placeholder="e.g., 1st"
                            className="h-11 rounded-xl shadow-inner focus:ring-2 focus:ring-indigo-400 transition"
                        />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="academicYear">Academic Year <span className="text-red-500">*</span></Label>
                        <select
                            id="academicYear"
                            value={formData.academicYear}
                            onChange={(e) => setFormData(prev => ({ ...prev, academicYear: e.target.value }))}
                            required
                            className="h-11 w-full rounded-xl shadow-inner focus:ring-2 focus:ring-indigo-400 transition px-3 bg-white dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600"
                        >
                            <option value="">Select Academic Year</option>
                            {["2020-2021", "2021-2022", "2022-2023", "2023-2024", "2024-2025", "2025-2026", "2026-2027", "2027-2028", "2028-2029", "2029-2030"].map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="classProfile">📄 Class Academic Profile</Label>
                        <Input
                        id="classProfile"
                        type="file"
                        accept="*/*"
                        onChange={(e) => handleFileChange(e, 'classProfile')}
                        required
                        className="h-11 rounded-xl transition file:px-4 file:py-2 file:bg-indigo-50 file:text-indigo-700 file:border-0 file:rounded-md"
                        />
                    </div>
                    <div>
                        <Label htmlFor="defReport">Deficiency Report</Label>
                        <Input
                        id="defReport"
                        type="file"
                        accept="*/*"
                        onChange={(e) => handleFileChange(e, 'defReport')}
                        required
                        className="h-11 rounded-xl transition file:px-4 file:py-2 file:bg-indigo-50 file:text-indigo-700 file:border-0 file:rounded-md"
                        />
                    </div>
                    <div>
                        <Label htmlFor="classRecords">Class Record files</Label>
                        <Input
                        id="classRecords"
                        type="file"
                        accept="*/*"
                        onChange={(e) => handleFileChange(e, 'classRecords')}
                        multiple
                        className="h-11 rounded-xl transition file:px-4 file:py-2 file:bg-indigo-50 file:text-indigo-700 file:border-0 file:rounded-md"
                        />
                    </div>

                    <UniversalUploadsSection />

                    <div className="pt-2">
                        <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-2 bg-gradient-to-r from-indigo-600 to-purple-600 transition-all"
                            style={{ width: `${completionPct}%` }}
                        />
                        </div>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{completionPct}% complete</p>
                    </div>

                    {uploadError && (
                        <div className="flex items-center justify-between gap-3 p-3 border border-red-200 bg-red-50 rounded-md">
                        <span className="text-red-600 text-sm">{uploadError}</span>
                        {!isUploading && (
                            <Button type="button" variant="outline" className="text-red-700 border-red-300 hover:bg-red-100" onClick={handleRetry}>
                            Retry Upload
                            </Button>
                        )}
                        </div>
                    )}
                    </CardContent>
                    <CardFooter>
                    <Button
                        type="submit"
                        className={`w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-lg active:scale-95 py-3 px-6 font-semibold ${isUploading ? 'animate-pulse' : ''}`}
                        disabled={isUploading}
                    >
                        {isUploading ? 'Uploading & Analyzing...' : 'Upload and Analyze'}
                    </Button>
                    </CardFooter>
                </form>
            </Card>
        )}
    </div>
  );
};

// Inline universal uploader for any file type with progress & previews
const UniversalUploadsSection = () => {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState({}); // index -> {loaded,total}
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);

  const backendOrigin = (() => {
    const base = (process.env.REACT_APP_API_BASE_URL || '/api').trim();
    if (/^https?:\/\//.test(base)) {
      return base.replace(/\/?api$/, '');
    }
    // Same-origin dev proxy
    return '';
  })();

  const onPick = (e) => {
    setFiles(Array.from(e.target.files || []));
    setResults([]);
    setProgress({});
  };

  const onProgress = (index, loaded, total) => {
    setProgress((p) => ({ ...p, [index]: { loaded, total } }));
  };

  const start = async () => {
    if (!files.length) return;
    setBusy(true);
    try {
      const { uploadAnyFilesXHR } = await import('../services/api');
      const res = await uploadAnyFilesXHR(files, { onProgress });
      setResults(res);
    } catch (e) {
      setResults([{ index: 0, ok: false, error: e?.message || String(e) }]);
    } finally {
      setBusy(false);
    }
  };

  const pct = (p) => {
    if (!p || !p.total) return 0;
    return Math.min(100, Math.round((p.loaded / p.total) * 100));
  };

  const previewUrl = (server) => {
    const url = server?.preview?.url;
    if (!url) return null;
    if (/^https?:\/\//.test(url)) return url;
    return backendOrigin ? `${backendOrigin}${url}` : url;
  };

  return (
    <div className="mt-6 p-4 border rounded-xl bg-indigo-50/40 dark:bg-indigo-900/20">
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Universal Uploads (Any File Type)</Label>
      <div className="mt-2 flex gap-3">
        <Input type="file" multiple accept="*/*" onChange={onPick} className="flex-1" />
        <Button type="button" onClick={start} disabled={busy || !files.length} className="bg-indigo-600 text-white">
          {busy ? 'Uploading...' : 'Upload Files'}
        </Button>
      </div>
      <div className="mt-3 space-y-2">
        {files.map((f, i) => {
          const p = progress[i];
          const r = results.find((x) => x.index === i);
          const ok = r?.ok;
          const server = r?.server;
          const pcent = pct(p);
          const img = previewUrl(server);
          const text = server?.preview?.text_excerpt;
          const status = ok ? (server?.upload_status || 'uploaded') : (r?.error ? `error: ${r.error}` : 'pending');
          return (
            <div key={i} className="p-2 border rounded-md bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{f.name}</span>
                <span className="text-xs text-gray-600">{status}</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded mt-2">
                <div className="h-1.5 bg-indigo-600" style={{ width: `${pcent}%` }} />
              </div>
              {img && (
                <div className="mt-2">
                  <img src={img} alt={f.name} className="max-h-40 rounded" />
                </div>
              )}
              {text && (
                <pre className="mt-2 text-xs whitespace-pre-wrap bg-gray-50 p-2 rounded border">{text}</pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UploadForm;
