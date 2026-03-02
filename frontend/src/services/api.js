// services/api.js
// Prefer relative '/api' to leverage CRA proxy in development.
// Allow overriding via env: REACT_APP_API_BASE_URL
const API_BASE_URL = ((process.env.REACT_APP_API_BASE_URL || '/api').trim().replace(/\/+$/, ''));

// Lightweight retry + timeout wrapper to tolerate transient dev restarts
// Increase timeout to better tolerate backend warm-ups or reloads
const DEFAULT_TIMEOUT_MS = 60000; // Allow more time for heavy analysis
const DEFAULT_RETRIES = 4;

async function getJsonWithRetry(url, options = {}, retries = DEFAULT_RETRIES, timeoutMs = DEFAULT_TIMEOUT_MS) {
  let attempt = 0;
  let backoff = 600;
  while (true) {
    try {
      const controller = new AbortController();
      // Bridge external AbortSignal (if provided) to our internal controller
      const externalSignal = options?.signal;
      const onExternalAbort = () => {
        try { controller.abort(externalSignal?.reason); } catch { /* ignore */ }
      };
      if (externalSignal) {
        if (externalSignal.aborted) {
          onExternalAbort();
        } else {
          externalSignal.addEventListener('abort', onExternalAbort, { once: true });
        }
      }

      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const { signal: _omit, ...rest } = options || {};
      const response = await fetch(url, { ...rest, signal: controller.signal });
      clearTimeout(timer);
      if (externalSignal) {
        externalSignal.removeEventListener?.('abort', onExternalAbort);
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      // Retry on aborted/timeout or other transient errors
      if (attempt >= retries) {
        // Provide clearer message on timeouts to aid debugging
        if (err?.name === 'AbortError') {
          // If this was a deliberate UI abort, surface no loud message
          if (options?.signal?.aborted) {
            err.silent = true;
            throw err; // caller may choose to ignore
          }
          throw new Error('Request timed out contacting the backend');
        }
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, backoff));
      backoff *= 2;
      attempt += 1;
    }
  }
}

export const fetchDashboardData = async () => {
  return getJsonWithRetry(`${API_BASE_URL}/dashboard`);
};

export const fetchSubjects = async () => {
  return getJsonWithRetry(`${API_BASE_URL}/subjects`);
};

export const fetchAnalysis = async () => {
  return getJsonWithRetry(`${API_BASE_URL}/analysis`);
};

// NEW: Fetch the detailed analytics output
export const fetchDetailedAnalytics = async () => {
  const response = await fetch(`${API_BASE_URL}/analysis/detailed-output`);
  // Gracefully handle 404 by returning a friendly message
  if (response.status === 404) {
    return 'No detailed analytics output found.';
  }
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  const data = await response.json();
  return data.detailed_output || data.analytics_output || data.content || 'No output found.';
};

export const uploadFiles = async (formData) => {
  // Use a resilient POST with timeout and limited retries to handle
  // transient dev restarts or proxy hiccups.
  async function postFormWithRetry(url, formData, retries = DEFAULT_RETRIES, timeoutMs = DEFAULT_TIMEOUT_MS) {
    let attempt = 0;
    let backoff = 600;
    while (true) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
          credentials: 'same-origin',
          headers: authHeader(),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!response.ok) {
          // Try to parse JSON error if available
          let message = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            message = errorData?.error || message;
          } catch {/* ignore parse errors */}
          throw new Error(message);
        }
        return await response.json();
      } catch (err) {
        // Retry on network errors and timeouts
        const isAbort = err?.name === 'AbortError';
        const isNetwork = err instanceof TypeError; // fetch throws TypeError on network errors
        if (attempt >= retries || (!isAbort && !isNetwork)) {
          if (isAbort) {
            throw new Error('Upload request timed out contacting the backend');
          }
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, backoff));
        backoff *= 2;
        attempt += 1;
      }
    }
  }

  return postFormWithRetry(`${API_BASE_URL}/upload`, formData);
};

// Universal upload using XHR to support per-file progress callbacks
// files: Array<File>; options: { onProgress?: (index, loaded, total) => void }
export const uploadAnyFilesXHR = async (files, options = {}) => {
  const onProgress = options.onProgress || (() => {});
  const makeUploadPromise = (file, index) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/upload-any`, true);
      // Auth header
      const token = getAuthToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(index, event.loaded, event.total);
        }
      };
      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (e) {
              reject(new Error('Invalid JSON response from server'));
            }
          } else {
            let message = `HTTP ${xhr.status}`;
            try {
              const errData = JSON.parse(xhr.responseText);
              message = errData?.error || message;
            } catch {/* ignore */}
            reject(new Error(message));
          }
        }
      };

      const form = new FormData();
      form.append('files', file);
      xhr.send(form);
    });
  };

  // Upload concurrently; gather per-file results
  const promises = files.map((f, idx) => makeUploadPromise(f, idx));
  // Each resolves to { files: [...] } from the endpoint; normalize
  const results = await Promise.allSettled(promises);
  return results.map((r, idx) => {
    if (r.status === 'fulfilled') {
      const payload = r.value;
      const fileItems = Array.isArray(payload?.files) ? payload.files : [];
      return { index: idx, ok: true, server: fileItems[0] || payload };
    }
    return { index: idx, ok: false, error: r.reason?.message || String(r.reason) };
  });
};

export const listUniversalUploads = async (limit = 50) => {
  return getJsonWithRetry(`${API_BASE_URL}/uploads/universal?limit=${encodeURIComponent(limit)}`, { headers: authHeader() });
};

// List files in uploads/results/all
export const listFiles = async (scope = 'uploads', options = {}) => {
  return getJsonWithRetry(
    `${API_BASE_URL}/admin/list-files?scope=${encodeURIComponent(scope)}`,
    { ...options, headers: authHeader(options?.headers) }
  );
};

// Delete a specific file in given scope
export const deleteFile = async (scope, filename) => {
  const url = `${API_BASE_URL}/admin/clear-files?confirm=1&scope=${encodeURIComponent(scope)}&filename=${encodeURIComponent(filename)}`;
  return getJsonWithRetry(url, { headers: authHeader() });
};

// Delete all files in a scope
export const clearFiles = async (scope) => {
  const url = `${API_BASE_URL}/admin/clear-files?confirm=1&scope=${encodeURIComponent(scope)}`;
  return getJsonWithRetry(url, { headers: authHeader() });
};

// Full reset: purge DB tables and files
export const resetAllData = async () => {
  const url = `${API_BASE_URL}/admin/reset-all?confirm=1`;
  return getJsonWithRetry(url, { headers: authHeader() });
};
// Fetch analysis grouped by faculty
export const fetchAnalysisByFaculty = async () => {
  return getJsonWithRetry(`${API_BASE_URL}/analysis/by-faculty`);
};

export const fetchReports = async () => {
  return getJsonWithRetry(`${API_BASE_URL}/reports/list`);
};

export const fetchReportOptions = async () => {
  return getJsonWithRetry(`${API_BASE_URL}/reports/options`);
};

export const fetchReportPreview = async (year, semester, program, subject, faculty) => {
  const params = new URLSearchParams({ year, semester, program });
  if (subject && subject !== 'All') params.append('subject', subject);
  if (faculty && faculty !== 'All') params.append('faculty', faculty);
  return getJsonWithRetry(`${API_BASE_URL}/reports/preview?${params.toString()}`);
};

export const generateReport = async (type, year) => {
  const response = await fetch(`${API_BASE_URL}/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, year }),
  });
  if (!response.ok) throw new Error('Report generation failed');
  return response.json();
};

// --- Auth helpers and endpoints ---
let AUTH_TOKEN_KEY = 'authToken';

export const setAuthToken = (token) => {
  if (!token) {
    try { localStorage.removeItem(AUTH_TOKEN_KEY); } catch {}
    return;
  }
  try { localStorage.setItem(AUTH_TOKEN_KEY, token); } catch {}
};

export const getAuthToken = () => {
  try { return localStorage.getItem(AUTH_TOKEN_KEY); } catch { return null; }
};

const authHeader = (headers = {}) => {
  const token = getAuthToken();
  if (token) {
    return { ...headers, Authorization: `Bearer ${token}` };
  }
  return headers || {};
};

export const login = async ({ identifier, password, role }) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password, role }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error || 'Invalid credentials');
  }
  const data = await response.json();
  setAuthToken(data?.token);
  return { token: data?.token, user: data?.user };
};

export const fetchMe = async () => {
  const resp = await fetch(`${API_BASE_URL}/auth/me`, { headers: authHeader({}) });
  if (!resp.ok) throw new Error('Failed to fetch user');
  const data = await resp.json();
  return data?.user;
};

export const logout = async () => {
  try { await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', headers: authHeader({}) }); } catch {}
  setAuthToken(null);
  };

export const register = async (payload) => {
  const resp = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.error || 'Registration failed');
  }
  return data;
};

// --- Student Risk Module ---
export const uploadStudentRisk = async (file) => {
  const form = new FormData();
  form.append('grades', file);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const resp = await fetch(`${API_BASE_URL}/student-risk/evaluate`, {
      method: 'POST',
      body: form,
      headers: authHeader(),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error || `HTTP ${resp.status}`);
    }
    return await resp.json();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
};

export const fetchStudentRiskLatest = async () => {
  return getJsonWithRetry(`${API_BASE_URL}/student-risk/latest`, { headers: authHeader() });
};

export const fetchStudentRiskSummary = async () => {
  return getJsonWithRetry(`${API_BASE_URL}/student-risk/summary`, { headers: authHeader() });
};

export const fetchStudentRiskLeaderboard = async () => {
  return getJsonWithRetry(`${API_BASE_URL}/student-risk/leaderboard`, { headers: authHeader() });
};

export const fetchStudentRiskInsights = async () => {
  return getJsonWithRetry(`${API_BASE_URL}/student-risk/insights`, { headers: authHeader() });
};

export const fetchStudentRiskExtractionReportLatest = async () => {
  return getJsonWithRetry(`${API_BASE_URL}/student-risk/extraction-report/latest`, { headers: authHeader() });
};

export const fetchStudentRiskRowsLatest = async () => {
  return getJsonWithRetry(`${API_BASE_URL}/student-risk/rows/latest`, { headers: authHeader() });
};

// --- Risk Tracking Module ---
export const uploadRiskTracking = async (file, labels = {}) => {
  const form = new FormData();
  form.append('file', file);
  const keys = ['subject','course','year_level','semester','section','faculty_name', 'academic_year'];
  keys.forEach((k) => {
    const v = labels?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      form.append(k, String(v).trim());
    }
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const resp = await fetch(`${API_BASE_URL}/risk-tracking/upload`, {
      method: 'POST',
      body: form,
      headers: authHeader(),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error || `HTTP ${resp.status}`);
    }
    return await resp.json();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
};

export const fetchRiskTrackingOverview = async (academicYear) => {
  const url = new URL(`${API_BASE_URL}/risk-tracking/overview`, window.location.origin);
  if (academicYear && academicYear !== 'All') url.searchParams.set('academic_year', academicYear);
  return getJsonWithRetry(url.toString(), { headers: authHeader() });
};

export const fetchRiskTrackingSubjects = async () => {
  return getJsonWithRetry(`${API_BASE_URL}/risk-tracking/subjects`, { headers: authHeader() });
};

export const fetchRiskTrackingSubjectRecords = async (subject) => {
  const url = new URL(`${API_BASE_URL}/risk-tracking/subject-records`, window.location.origin);
  if (subject) url.searchParams.set('subject', subject);
  return getJsonWithRetry(url.toString(), { headers: authHeader() });
};

export const fetchRiskTrackingOutstanding = async (year) => {
  const url = new URL(`${API_BASE_URL}/risk-tracking/outstanding`, window.location.origin);
  if (year) url.searchParams.set('year', year);
  return getJsonWithRetry(url.toString(), { headers: authHeader() });
};

export const fetchRiskTrackingProfiles = async () => {
  return getJsonWithRetry(`${API_BASE_URL}/risk-tracking/profiles`, { headers: authHeader() });
};

export const fetchRiskTrackingProfile = async (name) => {
  return getJsonWithRetry(`${API_BASE_URL}/risk-tracking/profile/${encodeURIComponent(name)}`, { headers: authHeader() });
};

export const fetchRiskTrackingProfilesInsights = async (names) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const resp = await fetch(`${API_BASE_URL}/risk-tracking/profiles-insights`, {
      method: 'POST',
      headers: authHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ names: Array.isArray(names) ? names : [] }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error || `HTTP ${resp.status}`);
    }
    return await resp.json();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
};

export const fetchRiskTrackingTop5 = async (subject) => {
  const url = new URL(`${API_BASE_URL}/risk-tracking/top5`, window.location.origin);
  if (subject) url.searchParams.set('subject', subject);
  return getJsonWithRetry(url.toString(), { headers: authHeader() });
};
