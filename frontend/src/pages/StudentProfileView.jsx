import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/NavBar';
import { fetchRiskTrackingProfile } from '../services/api';

const StudentProfileView = () => {
  const { name } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    (async () => {
      try {
        const r = await fetchRiskTrackingProfile(name);
        setData(r);
      } catch (e) {
        setError(e?.message || 'Load failed');
      }
    })();
  }, [name]);
  const prof = data?.profile;
  const records = data?.records || [];
  const insight = data?.career_insight || {};
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-4">Student Profile</h1>
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        {prof && (
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border mb-6">
            <div className="flex justify-between">
              <div>
                <div className="text-lg font-semibold">{prof.student_name}</div>
                <div className="text-sm text-muted-foreground">Year Level: {prof.year_level || 'N/A'}</div>
              </div>
              <div className="text-right">
                <div className="text-sm">Subjects: {prof.total_subjects}</div>
                <div className="text-sm">Average Grade: {Number(prof.average_grade || 0).toFixed(2)}</div>
                <div className="text-sm">Risk: {prof.risk_level || 'N/A'}</div>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border">
            <h2 className="font-semibold mb-2">Grades</h2>
            <div className="text-sm max-h-64 overflow-auto">
              {records.map((r) => (
                <div key={r.id} className="flex justify-between py-1">
                  <span>{r.subject}</span>
                  <span className="font-semibold">{Number(r.grade || 0).toFixed(2)} ({r.status})</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border">
            <h2 className="font-semibold mb-2">Career Insight</h2>
            <div className="text-sm">
              <div>Strong Skill Clusters: {(insight.strong_skill_clusters || []).join(', ') || 'N/A'}</div>
              <div className="mt-2">Recommended Paths:</div>
              <ul className="list-disc ml-5">
                {(insight.recommended_paths || []).map((p) => (
                  <li key={p.name}>{p.name}</li>
                ))}
              </ul>
              <div className="mt-2">Strong Subjects: {(insight.subjects || []).join(', ') || 'N/A'}</div>
              <div className="mt-2">Advice: {insight.advice || ''}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentProfileView;

