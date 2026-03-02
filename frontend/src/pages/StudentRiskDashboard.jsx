import React, { useEffect, useMemo, useState, useRef, useContext } from 'react';
import Navbar from '../components/NavBar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  uploadRiskTracking,
  fetchRiskTrackingOverview,
  fetchRiskTrackingSubjects,
  fetchRiskTrackingSubjectRecords,
  fetchRiskTrackingProfiles,
  fetchRiskTrackingProfile,
  fetchRiskTrackingProfilesInsights,
  fetchRiskTrackingTop5,
  fetchStudentRiskRowsLatest,
  resetAllData,
} from '../services/api';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { UploadCloud, Briefcase, Sparkles, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { AuthContext } from '../context/AuthContext';

const riskColors = {
  'Low Risk': '#10B981',
  'Medium Risk': '#F59E0B',
  'High Risk': '#EF4444',
  'Critical': '#7C3AED',
  'Minor Risk': '#FBBF24',
};

const RiskBadge = ({ level }) => (
  <Badge style={{ backgroundColor: riskColors[level] || '#6B7280', color: 'white' }}>{level}</Badge>
);

const StudentRiskDashboard = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = ((user?.role || '').toLowerCase() === 'admin');
  // Upload states

  // Risk Tracking upload states with labels
  const [rtLabels, setRtLabels] = useState({ subject: '', course: '', year_level: '', semester: '', section: '', faculty_name: '', academic_year: '' });
  const [rtFile, setRtFile] = useState(null);
  const rtFileInputRef = useRef(null);
  const [uploadingRT, setUploadingRT] = useState(false);
  const [uploadErrorRT, setUploadErrorRT] = useState('');
  const [rtOverview, setRtOverview] = useState({ uploads: [], subject_performance: [], risk_distribution: {}, outstanding_count: 0, years: [] });
  const [profiles, setProfiles] = useState([]);
  const [profilesMap, setProfilesMap] = useState({});
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [subjectRecords, setSubjectRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [careerByStudent, setCareerByStudent] = useState({});
  const [showSrStudents, setShowSrStudents] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [activeStudent, setActiveStudent] = useState(null);
  const [activeInsight, setActiveInsight] = useState(null);
  const [activeRecords, setActiveRecords] = useState([]);

  // Filters
  const [filterStudent, setFilterStudent] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('All');
  const [filterRisk, setFilterRisk] = useState('');
  const [srRowsByName, setSrRowsByName] = useState({});
  const [srRtByName, setSrRtByName] = useState({});
  const [top5BySubject, setTop5BySubject] = useState({});
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const rawRowForModal = (map, name) => {
    const rr = map[name || ''];
    return !!(rr && Array.isArray(rr.breakdown) && rr.breakdown.length > 0);
  };
  const normalizeName = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const nameOverlap = (a, b) => {
    const ta = new Set(normalizeName(a).split(' ').filter(Boolean));
    const tb = new Set(normalizeName(b).split(' ').filter(Boolean));
    let hit = 0;
    ta.forEach((t) => { if (tb.has(t)) hit += 1; });
    return hit;
  };
  const findRowForName = (map, name) => {
    const direct = map[name || ''];
    if (direct && Array.isArray(direct.breakdown) && direct.breakdown.length > 0) return direct;
    const keys = Object.keys(map || {});
    let best = null;
    let score = 0;
    keys.forEach((k) => {
      const sc = nameOverlap(k, name || '');
      if (sc > score && Array.isArray(map[k].breakdown) && map[k].breakdown.length > 0) { best = map[k]; score = sc; }
    });
    return best;
  };
  const computeSummary = (br) => {
    const arr = Array.isArray(br) ? br : [];
    const grades = arr.map((b) => Number(b.normalized ?? b.grade ?? 0)).filter((g) => !Number.isNaN(g));
    const avg = grades.length ? Number((grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2)) : 0;
    const st = arr.map((b) => String(b.status || '').toUpperCase());
    const passed = st.filter((x) => x === 'PASSED').length;
    const failed = st.filter((x) => x === 'FAILED').length;
    const inc = st.filter((x) => (x === 'INC' || x === 'INCOMPLETE' || x === 'W' || x === 'WITHDRAWN')).length;
    return { avg, passed, failed, inc };
  };

  const deriveCareersFromBreakdown = (br) => {
    const arr = Array.isArray(br) ? br : [];
    const ranked = arr
      .map((b) => ({ s: String(b.subject || b.header || ''), g: Number(b.normalized ?? b.grade ?? 0), st: String(b.status || '').toUpperCase() }))
      .filter((x) => !Number.isNaN(x.g))
      .sort((a, b) => Number(b.g || 0) - Number(a.g || 0));
    const top = ranked.slice(0, 3);
    const map = (s) => {
      const k = s.toUpperCase();
      if (k.includes('WEB') || k.includes('FRONT')) return ['Frontend Developer','Full-stack Developer'];
      if (k.includes('OOP') || k.includes('PROG') || k.includes('CMSC') || k.includes('CODE')) return ['Software Developer','Backend Engineer'];
      if (k.includes('DATA') || k.includes('DB') || k.includes('DATABASE')) return ['Data Analyst','Database Administrator'];
      if (k.includes('NET') || k.includes('NETWORK')) return ['Network Administrator'];
      if (k.includes('SEC') || k.includes('CYBER')) return ['Security Analyst'];
      if (k.includes('AI') || k.includes('ML')) return ['AI Research Assistant'];
      return ['Programmer'];
    };
    const names = [];
    top.forEach((t) => map(t.s).forEach((n) => { if (!names.includes(n)) names.push(n); }));
    return names.slice(0, 5);
  };

  const loadStudentRisk = async () => {
    try {
      const r = await fetchStudentRiskRowsLatest();
      const rows = Array.isArray(r?.rows) ? r.rows : [];
      const by = {};
      rows.forEach((row) => { by[row.name] = row; });
      setSrRowsByName(by);
    } catch {
      setSrRowsByName({});
    }
  };

  const loadRiskTracking = async () => {
    try {
      const res = await fetchRiskTrackingOverview();
      setRtOverview({
        uploads: res.uploads || [],
        subject_performance: res.subject_performance || [],
        risk_distribution: res.risk_distribution || {},
        outstanding_count: Number(res.outstanding_count || 0),
      });
    } catch (e) {
      setRtOverview({ uploads: [], subject_performance: [], risk_distribution: {}, outstanding_count: 0 });
    }
  };

  const loadProfiles = async () => {
    try {
      const res = await fetchRiskTrackingProfiles();
      const items = res.items || [];
      setProfiles(items);
      const map = {};
      items.forEach((p) => { map[p.student_name] = p; });
      setProfilesMap(map);
    } catch (e) {
      setProfiles([]);
      setProfilesMap({});
    }
  };

  useEffect(() => { loadStudentRisk(); loadRiskTracking(); loadProfiles(); }, []);

  // Upload handlers

  const onUploadStudentRisk = async () => {};

  const onRtFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setRtFile(file);
  };

  const submitRiskTracking = async () => {
    if (!rtFile) { setUploadErrorRT('Select an Excel file'); return; }
    setUploadingRT(true);
    setUploadErrorRT('');
    try {
      const name = (rtFile.name || '').toLowerCase();
      if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) throw new Error('Only Excel files are accepted');
      const resp = await uploadRiskTracking(rtFile, rtLabels);
      setRtFile(null);
      setRtLabels({ subject: '', course: '', year_level: '', semester: '', section: '', faculty_name: '' });
      await loadRiskTracking();
      await loadProfiles();
      if (resp?.subject) {
        onExpandSubject(resp.subject);
      }
    } catch (err) {
      setUploadErrorRT(err?.message || 'Upload failed');
    } finally {
      setUploadingRT(false);
    }
  };

  const onExpandSubject = async (subject) => {
    if (!subject) return;
    setExpandedSubject((prev) => (prev === subject ? null : subject));
    setRecordsLoading(true);
    try {
      setCareerByStudent({});
      const res = await fetchRiskTrackingSubjectRecords(subject);
      setSubjectRecords(res.items || []);
      try {
        const r = await fetchRiskTrackingTop5(subject);
        const arr = Array.isArray(r?.top5) ? r.top5 : [];
        setTop5BySubject((prev) => ({ ...prev, [subject]: arr }));
      } catch {}
      try {
        const names = Array.from(new Set((res.items || []).map((r) => r.student_name))).slice(0, 50);
        const batch = await fetchRiskTrackingProfilesInsights(names);
        const items = Array.isArray(batch?.items) ? batch.items : [];
        const next = {};
        items.forEach((it) => { next[it.student_name] = it.career_insight || {}; });
        setCareerByStudent(next);
      } catch {}
    } catch (e) {
      setSubjectRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  };

  const loadRtForStudent = async (name) => {
    try {
      const data = await fetchRiskTrackingProfile(name);
      const recs = Array.isArray(data.records) ? data.records : [];
      setSrRtByName((prev) => ({ ...prev, [name]: recs }));
    } catch {}
  };

  const showInsightFor = async (name) => {
    if (!name) return;
    setActiveStudent(name);
    setInsightLoading(true);
    try {
      const data = await fetchRiskTrackingProfile(name);
      let ci = data.career_insight || {};
      const recs = Array.isArray(data.records) ? data.records : [];
      setActiveRecords(recs);
      const hasData = ((ci?.strong_skill_clusters || []).length > 0) || ((ci?.recommended_paths || []).length > 0);
      if (!hasData) {
        const cached = careerByStudent[name];
        const cachedHas = ((cached?.strong_skill_clusters || []).length > 0) || ((cached?.recommended_paths || []).length > 0);
        if (cachedHas) ci = cached;
      }
      if (!((ci?.recommended_paths || []).length > 0)) {
        const subj = String(expandedSubject || '').toUpperCase();
        const isCS = subj.includes('CMSC');
        const isIT = subj.includes('IT') || subj.includes('CSST') || subj.includes('ITST') || subj.includes('ITEC');
        const potential = isCS
          ? ['Algorithm Engineer','Software Engineer','Research Assistant','Backend Engineer','Full-stack Developer','Data Analyst','Security Analyst']
          : ['Programmer','Backend Engineer','Systems Developer','Network Administrator','Database Administrator','Frontend Developer','Full-stack Developer','Security Analyst'];
        const nextPaths = potential.map((n) => ({ name: n, score: 1 }));
        const nextSkills = (ci?.strong_skill_clusters && ci.strong_skill_clusters.length) ? ci.strong_skill_clusters : (isCS ? ['Analytical','Programming'] : ['Programming','Web']);
        const defaultWork = isCS ? ['Accenture','IBM','Local SMEs','Research Labs'] : ['Accenture','Local SMEs','Government IT','BPO/IT Services'];
        ci = { ...(ci || {}), strong_skill_clusters: nextSkills, recommended_paths: nextPaths, workplaces: (ci?.workplaces && ci.workplaces.length) ? ci.workplaces : defaultWork };
      }
      if (!((ci?.potential_paths || []).length > 0)) {
        const subj = String(expandedSubject || '').toUpperCase();
        const isCS = subj.includes('CMSC');
        const defaultPot = isCS
          ? ['Algorithm Engineer','Software Engineer','Research Assistant','Backend Engineer','Full-stack Developer','Data Analyst','Security Analyst']
          : ['Programmer','Backend Engineer','Systems Developer','Network Administrator','Database Administrator','Frontend Developer','Full-stack Developer','Security Analyst'];
        ci = { ...(ci || {}), potential_paths: defaultPot.map((n) => ({ name: n, score: 1 })) };
      }
      setActiveInsight(ci);
      setCareerByStudent((prev) => ({ ...prev, [name]: ci }));
    } catch {
      let ci = careerByStudent[name] || {};
      const recs = (subjectRecords || []).filter((r) => String(r.student_name || '') === String(name));
      setActiveRecords(recs);
      if (!((ci?.recommended_paths || []).length > 0)) {
        const subj = String(expandedSubject || '').toUpperCase();
        const isCS = subj.includes('CMSC');
        const potential = isCS
          ? ['Algorithm Engineer','Software Engineer','Research Assistant','Backend Engineer','Full-stack Developer','Data Analyst','Security Analyst']
          : ['Programmer','Backend Engineer','Systems Developer','Network Administrator','Database Administrator','Frontend Developer','Full-stack Developer','Security Analyst'];
        const nextPaths = potential.map((n) => ({ name: n, score: 1 }));
        const nextSkills = (ci?.strong_skill_clusters && ci.strong_skill_clusters.length) ? ci.strong_skill_clusters : (isCS ? ['Analytical','Programming'] : ['Programming','Web']);
        const defaultWork = isCS ? ['Accenture','IBM','Local SMEs','Research Labs'] : ['Accenture','Local SMEs','Government IT','BPO/IT Services'];
        ci = { ...(ci || {}), strong_skill_clusters: nextSkills, recommended_paths: nextPaths, workplaces: (ci?.workplaces && ci.workplaces.length) ? ci.workplaces : defaultWork };
      }
      if (!((ci?.potential_paths || []).length > 0)) {
        const subj = String(expandedSubject || '').toUpperCase();
        const isCS = subj.includes('CMSC');
        const defaultPot = isCS
          ? ['Algorithm Engineer','Software Engineer','Research Assistant','Backend Engineer','Full-stack Developer','Data Analyst','Security Analyst']
          : ['Programmer','Backend Engineer','Systems Developer','Network Administrator','Database Administrator','Frontend Developer','Full-stack Developer','Security Analyst'];
        ci = { ...(ci || {}), potential_paths: defaultPot.map((n) => ({ name: n, score: 1 })) };
      }
      setActiveInsight(ci);
    } finally {
      setInsightOpen(true);
      setInsightLoading(false);
    }
  };

  const riskTagForRecord = (rec) => {
    const prof = profilesMap[rec.student_name];
    const failedCount = Number(prof?.failed_count || 0);
    const status = String(rec.status || '').toUpperCase();
    if (status === 'PASSED') return prof?.risk_level || 'Low Risk';
    if (failedCount >= 2) return 'High Risk';
    return 'Minor Risk';
  };

  const filteredUploads = useMemo(() => {
    const items = rtOverview.uploads || [];
    return items.filter((u) => {
      const subjOk = filterSubject ? String(u.subject || '').toLowerCase().includes(filterSubject.toLowerCase()) : true;
      const yearOk = filterYear ? String(u.year_level || '').toLowerCase().includes(filterYear.toLowerCase()) : true;
      return subjOk && yearOk;
    });
  }, [rtOverview, filterSubject, filterYear]);

  const srDistributionData = useMemo(() => {
    const d = rtOverview.risk_distribution || {};
    return Object.keys(d).map((k) => ({ name: k, value: d[k] }));
  }, [rtOverview]);

  const srFailuresData = useMemo(() => {
    return (profiles || []).map((i) => ({ name: i.student_name, failures: Number(i.failed_count || 0) }));
  }, [profiles]);

  // Removed srCareerClusterData computation (Career Pathway Clustering section deleted)

  const kpi = useMemo(() => {
    const total = (profiles || []).length;
    const sumAvg = (profiles || []).reduce((acc, i) => acc + Number(i.average_grade || 0), 0);
    const avg = total ? (sumAvg / total) : 0;
    const passed = (profiles || []).reduce((acc, i) => acc + Number(i.passed_count || 0), 0);
    const failed = (profiles || []).reduce((acc, i) => acc + Number(i.failed_count || 0), 0);
    const inc = 0;
    const totalSubjects = passed + failed + inc;
    const passRate = totalSubjects ? (passed / totalSubjects) * 100 : 0;
    const highRisk = (profiles || []).filter((i) => String(i.risk_level).toUpperCase().includes('HIGH') || String(i.risk_level).toUpperCase().includes('CRITICAL')).length;
    return { total, avg, passRate, highRisk };
  }, [profiles]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-4">Students</h1>

        <div className="flex items-center gap-2 mb-4">
          <Label className="whitespace-nowrap">Academic Year Filter:</Label>
          <select 
            className="border rounded px-2 py-1" 
            value={filterAcademicYear} 
            onChange={(e) => setFilterAcademicYear(e.target.value)}
          >
            <option value="All">All Years</option>
            {(rtOverview.years || []).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload — Risk Tracking (with Labels)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <Label>Subject</Label>
                  <Input value={rtLabels.subject} onChange={(e) => setRtLabels((p) => ({ ...p, subject: e.target.value }))} placeholder="e.g., ITST 304" />
                </div>
                <div>
                  <Label>Course</Label>
                  <Input value={rtLabels.course} onChange={(e) => setRtLabels((p) => ({ ...p, course: e.target.value }))} placeholder="e.g., BSIT" />
                </div>
                <div>
                  <Label>Year Level</Label>
                  <Input value={rtLabels.year_level} onChange={(e) => setRtLabels((p) => ({ ...p, year_level: e.target.value }))} placeholder="e.g., 3" />
                </div>
                <div>
                  <Label>Semester</Label>
                  <Input value={rtLabels.semester} onChange={(e) => setRtLabels((p) => ({ ...p, semester: e.target.value }))} placeholder="e.g., 1st" />
                </div>
                <div>
                  <Label>Section</Label>
                  <Input value={rtLabels.section} onChange={(e) => setRtLabels((p) => ({ ...p, section: e.target.value }))} placeholder="e.g., 2A" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Faculty Name</Label>
                  <Input value={rtLabels.faculty_name} onChange={(e) => setRtLabels((p) => ({ ...p, faculty_name: e.target.value }))} placeholder="e.g., Juan Dela Cruz" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input ref={rtFileInputRef} type="file" accept=".xlsx,.xls" onChange={onRtFileChange} className="hidden" />
                <Button variant="secondary" onClick={() => rtFileInputRef.current?.click()} disabled={uploadingRT}>
                  <UploadCloud className="mr-2 h-4 w-4" /> {rtFile ? 'Change File' : 'Select Excel File'}
                </Button>
                {rtFile && <Badge>{rtFile.name}</Badge>}
                <Button onClick={submitRiskTracking} disabled={uploadingRT || !rtFile || !String(rtLabels.subject).trim() || !String(rtLabels.course).trim()}>
                  {uploadingRT ? 'Processing…' : 'Upload Labeled Sheet'}
                </Button>
                {uploadErrorRT && <span className="text-red-600 text-sm">{uploadErrorRT}</span>}
                {isAdmin ? (
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="outline" style={{ color: '#EF4444', borderColor: '#EF4444' }}
                    disabled={resetBusy}
                    onClick={async () => {
                      if (!window.confirm('This will delete ALL data and uploaded files. Continue?')) return;
                      setResetBusy(true);
                      setResetMessage('');
                      try {
                        const res = await resetAllData();
                        setResetMessage(res?.message || 'Reset complete');
                        // Clear all dashboard state immediately to avoid showing stale data
                        setRtOverview({ uploads: [], subject_performance: [], risk_distribution: {}, outstanding_count: 0 });
                        setProfiles([]);
                        setProfilesMap({});
                        setSubjectRecords([]);
                        setExpandedSubject(null);
                        setCareerByStudent({});
                        // Attempt to reload fresh (should be empty after reset)
                        await loadRiskTracking();
                        await loadProfiles();
                      } catch (e) {
                        const msg = e?.message || 'Reset failed';
                        setResetMessage(msg.includes('HTTP 403') ? 'Reset requires Admin role' : msg);
                      } finally {
                        setResetBusy(false);
                      }
                    }}>
                    {resetBusy ? 'Resetting…' : 'Reset All Data'}
                  </Button>
                  {resetMessage && <span className="text-xs text-muted-foreground">{resetMessage}</span>}
                </div>
                ) : (
                  <div className="ml-auto text-xs text-muted-foreground">Reset available to Admins</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Students</div>
            <div className="text-2xl font-bold">{kpi.total}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Average Grade</div>
            <div className="text-2xl font-bold">{Number(kpi.avg || 0).toFixed(2)}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Pass Rate</div>
            <div className="text-2xl font-bold">{Number(kpi.passRate || 0).toFixed(1)}%</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">High/Critical Risk</div>
            <div className="text-2xl font-bold">{kpi.highRisk}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Risk Module — Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Risk Distribution</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={srDistributionData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                        {srDistributionData.map((entry, index) => (
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
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={srFailuresData}>
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
                  <div className="text-3xl font-bold">{(profiles || []).filter((p) => Number(p.average_grade || 0) >= 90 && Number(p.failed_count || 0) === 0).length}</div>
                  <ul className="mt-3 space-y-2 max-h-56 overflow-auto">
                    {(profiles || [])
                      .filter((p) => Number(p.average_grade || 0) >= 90 && Number(p.failed_count || 0) === 0)
                      .map((o, idx) => (
                        <li key={idx} className="flex items-center justify-between p-2 rounded-xl border bg-white/60 dark:bg-gray-800">
                          <span className="font-medium">{o.student_name}</span>
                          <Badge>Avg {o.average_grade}</Badge>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>

              {/* Career Pathway Clustering section removed as requested */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Students</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{(profiles || []).length}</Badge>
                    <Button variant="outline" size="sm" onClick={() => setShowSrStudents((v) => !v)}>
                      {showSrStudents ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                </div>
                {showSrStudents && (
                  <div className="overflow-x-auto rounded-2xl border bg-white dark:bg-gray-800">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left sticky top-0 bg-gray-50 dark:bg-gray-900">
                          <th className="p-2">Name</th>
                          <th className="p-2">Average</th>
                          <th className="p-2">Risk</th>
                          <th className="p-2">Failures</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(profiles || []).map((row) => (
                          <tr key={row.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-900">
                            <td className="p-2">{row.student_name}</td>
                            <td className="p-2">{row.average_grade}</td>
                            <td className="p-2"><RiskBadge level={((Number(row.failed_count || 0) >= 2) ? 'High Risk' : (Number(row.failed_count || 0) === 1 ? 'Minor Risk' : (row.risk_level || 'Low Risk')))} /></td>
                            <td className="p-2">{row.failed_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <h4 className="font-medium mb-2">Top Students (by Average)</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="p-2">Name</th>
                        <th className="p-2">Average</th>
                        <th className="p-2">Failures</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(profiles || [])
                        .slice()
                        .sort((a, b) => Number(b.average_grade || 0) - Number(a.average_grade || 0))
                        .slice(0, 10)
                        .map((row, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{row.student_name}</td>
                          <td className="p-2">{row.average_grade}</td>
                          <td className="p-2">{row.failed_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Subject Uploads — Risk Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <Label>Search Subject</Label>
                  <Input value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} placeholder="Subject code/name" />
                </div>
                <div>
                  <Label>Filter Year Level</Label>
                  <Input value={filterYear} onChange={(e) => setFilterYear(e.target.value)} placeholder="e.g., 3" />
                </div>
                <div className="md:col-span-2">
                  <Label>Search Student (in expanded view)</Label>
                  <Input value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)} placeholder="Student name" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(() => {
                  const perfMap = Object.fromEntries((rtOverview.subject_performance || []).map((p) => [p.subject, p]));
                  return (filteredUploads || []).map((u) => {
                    const perf = perfMap[u.subject] || { count: 0, passed: 0, failed: 0 };
                    const total = Number(perf.count || 0);
                    const pass = Number(perf.passed || 0);
                    const fail = Number(perf.failed || 0);
                    return (
                      <div key={u.id} className="p-4 rounded-2xl border bg-white dark:bg-gray-800">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm text-muted-foreground">Subject</div>
                            <div className="font-semibold">{u.subject}</div>
                          </div>
                          <Badge variant="secondary">{u.course || 'N/A'}</Badge>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">Year {u.year_level || '-'}, Section {u.section || '-'}, {u.semester || 'Semester'}</div>
                        <div className="mt-2 text-sm">Faculty: {u.faculty_name || '—'}</div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 rounded-xl border">
                            <div className="text-xs text-muted-foreground">Students</div>
                            <div className="font-semibold">{total}</div>
                          </div>
                          <div className="p-2 rounded-xl border">
                            <div className="text-xs text-green-700">Passed</div>
                            <div className="font-semibold">{pass}</div>
                          </div>
                          <div className="p-2 rounded-xl border">
                            <div className="text-xs text-red-700">Failed</div>
                            <div className="font-semibold">{fail}</div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <Button variant="outline" onClick={() => onExpandSubject(u.subject)}>
                            {expandedSubject === u.subject ? 'Hide Class List' : 'View Class List'}
                          </Button>
                        </div>
                        {expandedSubject === u.subject && (
                          <div className="mt-4">
                            {Array.isArray(top5BySubject[u.subject]) && top5BySubject[u.subject].length > 0 && (
                              <div className="mb-3 p-3 rounded-xl border bg-white dark:bg-gray-800">
                                <div className="text-sm font-medium">Top 5 Students in {u.subject}</div>
                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {top5BySubject[u.subject].map((it) => (
                                    <div key={`${u.subject}-${it.rank}-${it.student_name}`} className="flex items-center justify-between p-2 rounded-lg border">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="secondary">#{it.rank}</Badge>
                                        <span className="text-sm font-semibold">{it.student_name}</span>
                                      </div>
                                      <Badge>Grade {Number(it.grade || 0).toFixed(2)}</Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {recordsLoading ? (
                              <div className="text-sm text-muted-foreground">Loading records…</div>
                            ) : (
                              <div className="overflow-x-auto rounded-xl border">
                                <table className="min-w-full text-sm">
                                  <thead>
                                    <tr className="text-left">
                                      <th className="p-2">Student</th>
                                      <th className="p-2">Grade</th>
                                      <th className="p-2">Status</th>
                                      <th className="p-2">Risk</th>
                                      <th className="p-2">Career</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(subjectRecords || [])
                                      .filter((r) => (filterStudent ? String(r.student_name || '').toLowerCase().includes(filterStudent.toLowerCase()) : true))
                                      .map((r) => (
                                      <tr key={r.id} className="border-t">
                                        <td className="p-2">{r.student_name}</td>
                                        <td className="p-2">{r.grade}</td>
                                        <td className="p-2">{r.status}</td>
                                        <td className="p-2"><RiskBadge level={riskTagForRecord(r)} /></td>
                                        <td className="p-2">
                                          <Button variant="ghost" size="sm" onClick={() => showInsightFor(r.student_name)}>
                                            View
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {Object.keys(careerByStudent).length > 0 && (
                              <div className="mt-3 p-3 rounded-xl border bg-gray-50 dark:bg-gray-900">
                                <div className="text-sm font-medium mb-2">Career Recommendations</div>
                                {Object.entries(careerByStudent).map(([name, ci]) => (
                                  <div key={name} className="mb-2">
                                    <div className="text-sm font-semibold">{name}</div>
                                    <div className="text-xs">Skills: {(ci?.strong_skill_clusters || []).join(', ') || '—'}</div>
                                    <div className="text-xs">Paths: {(ci?.recommended_paths || []).map((p) => p.name).join(', ') || '—'}</div>
                                    <div className="text-xs text-muted-foreground">Reasoning: {((ci?.subjects || []).length > 1) ? `based on high performance in ${ci.subjects.join(', ')}` : '—'}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Multi-Subject Risk Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-2xl border bg-white dark:bg-gray-800">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="p-2">Student</th>
                      <th className="p-2">Avg Grade</th>
                      <th className="p-2">Failures</th>
                      <th className="p-2">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(profiles || [])
                      .filter((p) => {
                        if (filterRisk) {
                          const fr = filterRisk.toLowerCase();
                          if (fr.includes('minor')) return Number(p.failed_count || 0) === 1;
                          if (fr.includes('high')) return Number(p.failed_count || 0) >= 2;
                          return String(p.risk_level || '').toLowerCase().includes(fr);
                        }
                        return true;
                      })
                      .filter((p) => (filterStudent ? String(p.student_name || '').toLowerCase().includes(filterStudent.toLowerCase()) : true))
                      .sort((a, b) => Number(b.failed_count || 0) - Number(a.failed_count || 0))
                      .map((p) => (
                      <tr key={p.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-900">
                        <td className="p-2">{p.student_name}</td>
                        <td className="p-2">{p.average_grade}</td>
                        <td className="p-2">{p.failed_count}</td>
                        <td className="p-2"><RiskBadge level={(Number(p.failed_count || 0) >= 2) ? 'High Risk' : (Number(p.failed_count || 0) === 1 ? 'Minor Risk' : (p.risk_level || 'Low Risk'))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Filter Risk</Label>
                  <Input value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)} placeholder="Minor / High / Low" />
                </div>
                <div>
                  <Label>Filter Student</Label>
                  <Input value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)} placeholder="Name" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Dialog.Root open={insightOpen} onOpenChange={setInsightOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/40" />
              <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-xl max-h-[85vh] overflow-auto rounded-2xl bg-card border shadow-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold">{activeStudent || ''}</div>
                    {activeStudent && (
                      <div className="text-xs text-muted-foreground">{profilesMap[activeStudent]?.risk_level || ''}</div>
                    )}
                  </div>
                  <Dialog.Close asChild>
                    <button className="p-2 rounded-md hover:bg-muted" aria-label="Close"><X className="h-4 w-4" /></button>
                  </Dialog.Close>
                </div>
                <div className="mt-4">
                  {insightLoading ? (
                    <div className="text-sm text-muted-foreground">Loading…</div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                        <div className="text-sm font-medium">Strong Skills</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(activeInsight?.strong_skill_clusters || []).map((s, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs rounded-full border bg-white dark:bg-gray-800">{s}</span>
                        ))}
                        {(!activeInsight?.strong_skill_clusters || activeInsight.strong_skill_clusters.length === 0) && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Briefcase className="h-4 w-4 text-blue-600" />
                        <div className="text-sm font-medium">Recommended Paths</div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(activeInsight?.recommended_paths || []).map((p, idx) => (
                          <div key={idx} className="p-2 rounded-xl border bg-white dark:bg-gray-800">
                            <div className="text-sm font-semibold">{p.name}</div>
                            <div className="text-xs text-muted-foreground">Score {Number(p.score || 0)}</div>
                          </div>
                        ))}
                        {(!activeInsight?.recommended_paths || activeInsight.recommended_paths.length === 0) && (
                          <div className="text-xs text-muted-foreground">—</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Briefcase className="h-4 w-4 text-indigo-600" />
                        <div className="text-sm font-medium">Potential Paths (Overall)</div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(activeInsight?.potential_paths || []).map((p, idx) => (
                          <div key={idx} className="p-2 rounded-xl border bg-white dark:bg-gray-800">
                            <div className="text-sm font-semibold">{p.name}</div>
                            <div className="text-xs text-muted-foreground">Score {Number(p.score || 0)}</div>
                          </div>
                        ))}
                        {(!activeInsight?.potential_paths || activeInsight.potential_paths.length === 0) && (
                          <div className="text-xs text-muted-foreground">—</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Briefcase className="h-4 w-4 text-teal-600" />
                        <div className="text-sm font-medium">Workplaces</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(activeInsight?.workplaces || []).map((w, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs rounded-full border bg-white dark:bg-gray-800">{w}</span>
                        ))}
                        {(!activeInsight?.workplaces || activeInsight.workplaces.length === 0) && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <div className="text-sm font-medium">Subjects & Grades</div>
                      </div>
                      <div className="overflow-x-auto rounded-xl border">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="text-left">
                              <th className="p-2">Subject</th>
                              <th className="p-2">Raw</th>
                              <th className="p-2">Grade</th>
                              <th className="p-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const rawRow = findRowForName(srRowsByName, activeStudent || '');
                              if (rawRow) {
                                const br = Array.isArray(rawRow.breakdown) ? rawRow.breakdown : [];
                                return br.map((b, idx) => (
                                  <tr key={idx} className="border-t">
                                    <td className="p-2">{b.header || b.subject}</td>
                                    <td className="p-2">{String(b.raw)}</td>
                                    <td className="p-2">{b.grade}</td>
                                    <td className="p-2">{b.status}</td>
                                  </tr>
                                ));
                              }
                              return (activeRecords || []).map((r, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="p-2">{r.subject}</td>
                                  <td className="p-2">{''}</td>
                                  <td className="p-2">{r.grade}</td>
                                  <td className="p-2">{r.status}</td>
                                </tr>
                              ));
                            })()}
                            {(!rawRowForModal(srRowsByName, activeStudent) && (!activeRecords || activeRecords.length === 0)) && (
                              <tr className="border-t"><td className="p-2 text-muted-foreground" colSpan={4}>—</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      {(() => {
                        const rawRow = findRowForName(srRowsByName, activeStudent || '');
                        const summary = computeSummary(rawRow ? rawRow.breakdown : activeRecords);
                        return (
                          <div className="mt-3">
                            <div className="text-sm font-medium">Overall Summary</div>
                            <div className="text-xs mt-1">Average: {summary.avg} &nbsp;|&nbsp; Passed: {summary.passed} &nbsp;|&nbsp; Failed: {summary.failed} &nbsp;|&nbsp; Incomplete: {summary.inc}</div>
                          </div>
                        );
                      })()}
                      <div className="flex items-center gap-2 mt-3">
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                        <div className="text-sm font-medium">Reasoning</div>
                      </div>
                      <div className="text-xs">
                        {activeInsight?.reasoning || (((activeInsight?.subjects || []).length > 0) ? `Based on high performance in ${(activeInsight.subjects || []).join(', ')}` : 'Based on overall subject grades and program context')}
                      </div>
                      <div className="text-xs mt-2">{activeInsight?.advice || ''}</div>
                    </div>
                  )}
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </main>
    </div>
  );
};

export default StudentRiskDashboard;
