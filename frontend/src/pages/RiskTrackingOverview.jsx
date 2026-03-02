import React, { useEffect, useState } from 'react';
import Navbar from '../components/NavBar';
import { fetchRiskTrackingOverview, fetchRiskTrackingSubjects, fetchRiskTrackingOutstanding } from '../services/api';

const RiskTrackingOverview = () => {
  const [overview, setOverview] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [yearFilter, setYearFilter] = useState('');
  const [outstanding, setOutstanding] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    (async () => {
      try {
        const o = await fetchRiskTrackingOverview();
        setOverview(o);
        const s = await fetchRiskTrackingSubjects();
        setSubjects(s.items || []);
        const out = await fetchRiskTrackingOutstanding('');
        setOutstanding(out.items || []);
      } catch (e) {
        setError(e?.message || 'Load failed');
      }
    })();
  }, []);
  const onYearChange = async (e) => {
    const y = e.target.value;
    setYearFilter(y);
    try {
      const out = await fetchRiskTrackingOutstanding(y || '');
      setOutstanding(out.items || []);
    } catch {}
  };
  const dist = overview?.risk_distribution || {};
  const perf = overview?.subject_performance || [];
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-4">Student Risk Overview</h1>
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border">
            <h2 className="font-semibold mb-2">Risk Distribution</h2>
            {Object.keys(dist).length === 0 ? <div className="text-sm text-muted-foreground">No data</div> : (
              <ul className="space-y-1 text-sm">
                {Object.entries(dist).map(([k,v]) => (
                  <li key={k} className="flex justify-between"><span>{k}</span><span className="font-semibold">{v}</span></li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border">
            <h2 className="font-semibold mb-2">Outstanding Students</h2>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs">Year</label>
              <select value={yearFilter} onChange={onYearChange} className="text-xs border rounded px-2 py-1">
                <option value="">All</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>
            <div className="text-4xl font-bold">{overview?.outstanding_count || 0}</div>
            <div className="mt-3 max-h-48 overflow-auto text-sm">
              {outstanding.map((o) => (
                <div key={`${o.student_name}-${o.year_level}`} className="flex justify-between py-1">
                  <span>{o.student_name}</span>
                  <span className="font-semibold">{Number(o.average_grade || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border">
            <h2 className="font-semibold mb-2">Upload History</h2>
            <div className="text-sm max-h-64 overflow-auto">
              {(overview?.uploads || []).map((u) => (
                <div key={u.id} className="flex justify-between py-1"><span>{u.subject}</span><span>{u.uploaded_at}</span></div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 p-4 rounded-2xl bg-white dark:bg-gray-800 border">
          <h2 className="font-semibold mb-2">Subject-wise Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {perf.map((p) => (
              <div key={p.subject} className="p-3 rounded-xl border">
                <div className="flex justify-between"><span>{p.subject}</span><span>Total: {p.count}</span></div>
                <div className="flex justify-between mt-1"><span>Passed</span><span className="text-green-700 font-semibold">{p.passed}</span></div>
                <div className="flex justify-between"><span>Failed</span><span className="text-red-700 font-semibold">{p.failed}</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 p-4 rounded-2xl bg-white dark:bg-gray-800 border">
          <h2 className="font-semibold mb-2">Subjects</h2>
          <ul className="text-sm grid grid-cols-2 gap-2">
            {subjects.map((s) => (
              <li key={s.subject} className="p-2 rounded-xl border flex justify-between"><span>{s.subject}</span><span>{s.count}</span></li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
};

export default RiskTrackingOverview;

