import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/NavBar';
import Sidebar from '../components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { uploadStudentRisk, fetchStudentRiskLatest, fetchStudentRiskSummary, fetchStudentRiskLeaderboard, fetchStudentRiskInsights } from '../services/api';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const riskColors = {
  'Low Risk': '#10B981',
  'Medium Risk': '#F59E0B',
  'High Risk': '#EF4444',
  'Critical': '#7C3AED',
};

const RiskBadge = ({ level }) => (
  <Badge style={{ backgroundColor: riskColors[level] || '#6B7280', color: 'white' }}>{level}</Badge>
);

const StudentRisk = () => {
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ distribution: {}, outstanding: [] });
  const [leaderboard, setLeaderboard] = useState([]);
  const [insights, setInsights] = useState({});
  const [active, setActive] = useState(null);
  const [error, setError] = useState(null);

  const loadAll = async () => {
    try {
      const [latestRes, summaryRes, boardRes, insightRes] = await Promise.all([
        fetchStudentRiskLatest(),
        fetchStudentRiskSummary(),
        fetchStudentRiskLeaderboard(),
        fetchStudentRiskInsights(),
      ]);
      setItems(latestRes.items || []);
      setSummary(summaryRes || { distribution: {}, outstanding: [] });
      setLeaderboard(boardRes.items || []);
      setInsights(insightRes.insights || {});
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadStudentRisk(file);
      await loadAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const distributionData = useMemo(() => {
    const d = summary.distribution || {};
    return Object.keys(d).map((k) => ({ name: k, value: d[k] }));
  }, [summary]);

  const failuresData = useMemo(() => {
    return (items || []).map((i) => ({ name: i.student_name, failures: Number(i.failed_count || 0) }));
  }, [items]);

  const careerClusterData = useMemo(() => {
    const counts = {};
    Object.values(insights || {}).forEach((val) => {
      (val?.recommended_paths || []).forEach((p) => {
        counts[p.name] = (counts[p.name] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [insights]);

  const onView = (row, mode) => {
    setActive({ ...row, mode });
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto">
        <Sidebar />
        <div className="my-4 flex items-center gap-4">
          <input type="file" accept=".xlsx,.xls" onChange={onUpload} />
          <Button disabled={uploading}>{uploading ? 'Processing…' : 'Upload Summary Sheet'}</Button>
          {error && <span className="text-red-600 text-sm">{error}</span>}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Student Risk Module</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-2">Risk Distribution</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={distributionData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                      {distributionData.map((entry, index) => (
                        <Cell key={`c-${index}`} fill={riskColors[entry.name] || '#9CA3AF'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="font-medium mb-2">Failure Frequency</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={failuresData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="failures" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="font-medium mb-2">Outstanding Students</h4>
                <div className="text-3xl font-bold">{(summary.outstanding || []).length}</div>
                <ul className="mt-3 space-y-1 max-h-40 overflow-auto">
                  {(summary.outstanding || []).map((o, idx) => (
                    <li key={idx} className="flex items-center justify-between">
                      <span>{o.name}</span>
                      <Badge>Avg {o.average_grade}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Career Pathway Clustering</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={careerClusterData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="p-2">Name</th>
                    <th className="p-2">Average</th>
                    <th className="p-2">Risk</th>
                    <th className="p-2">Pass/Fail/Inc</th>
                    <th className="p-2">Weakest</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(items || []).map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-2">{row.student_name}</td>
                      <td className="p-2">{row.average_grade}</td>
                      <td className="p-2"><RiskBadge level={row.risk_level} /></td>
                      <td className="p-2">{row.passed_count}/{row.failed_count}/{row.incomplete_count}</td>
                      <td className="p-2">{row.lowest_subject || '-'}</td>
                      <td className="p-2 space-x-2">
                        <Button size="sm" variant="outline" onClick={() => onView(row, 'risk')}>View Risk Profile</Button>
                        <Button size="sm" variant="outline" onClick={() => onView(row, 'career')}>View Career Insight</Button>
                        <Button size="sm" variant="outline" onClick={() => onView(row, 'grades')}>View Grade Breakdown</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {active && (
              <div className="mt-6 p-4 border rounded">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{active.student_name} — {active.mode === 'risk' ? 'Risk Profile' : active.mode === 'career' ? 'Career Insight' : 'Grade Breakdown'}</h4>
                  <Button size="sm" variant="ghost" onClick={() => setActive(null)}>Close</Button>
                </div>
                {active.mode === 'risk' && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div>Average: {active.average_grade}</div>
                    <div>Consistency: {active.consistency_score}</div>
                    <div>Lowest: {active.lowest_subject} ({active.lowest_grade})</div>
                    <div>Highest: {active.highest_subject} ({active.highest_grade})</div>
                    <div className="col-span-2">Recommendation: {active.recommendation}</div>
                  </div>
                )}
                {active.mode === 'career' && (() => {
                  const ci = insights[active.student_name] || {};
                  return (
                    <div className="mt-3 space-y-2">
                      <div className="font-medium">Strongest Skill Clusters</div>
                      <div className="flex flex-wrap gap-2">{(ci.strong_skill_clusters || []).map((s, i) => <Badge key={i}>{s}</Badge>)}</div>
                      <div className="font-medium mt-3">Top Recommended Career Paths</div>
                      <ul className="list-disc ml-6">
                        {(ci.recommended_paths || []).map((p, i) => (
                          <li key={i}>{p.name}</li>
                        ))}
                      </ul>
                      <div className="mt-3 text-sm">Advice: {ci.advice}</div>
                    </div>
                  );
                })()}
                {active.mode === 'grades' && (() => {
                  let breakdown = [];
                  try { breakdown = JSON.parse(active.breakdown || '[]'); } catch { breakdown = []; }
                  return (
                    <div className="mt-3">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr>
                            <th className="p-2">Subject</th>
                            <th className="p-2">Grade</th>
                            <th className="p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {breakdown.map((b, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">{b.subject}</td>
                              <td className="p-2">{b.grade}</td>
                              <td className="p-2">{b.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Outstanding Students Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="p-2">Name</th>
                    <th className="p-2">Average</th>
                    <th className="p-2">Subjects</th>
                  </tr>
                </thead>
                <tbody>
                  {(leaderboard || []).map((row, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">{row.name}</td>
                      <td className="p-2">{row.average_grade}</td>
                      <td className="p-2">{(row.exceptional_subjects || []).join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentRisk;
