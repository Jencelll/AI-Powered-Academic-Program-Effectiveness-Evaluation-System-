import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '../components/NavBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { fetchDashboardData } from '../services/api';
import { fetchSubjects } from '../services/api';
import { fetchAnalysisByFaculty } from '../services/api';
import { useAcademicYear } from '../context/AcademicYearContext';
import { getYearFromUpload, sortByAcademicYear, formatAcademicYearRange } from '../utils/academicYear';
import { UploadCloud, BookOpen, CheckCircle2, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, LabelList } from 'recharts';
import * as Dialog from '@radix-ui/react-dialog';
import * as RadixTooltip from '@radix-ui/react-tooltip';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, message: String(error?.message || 'Render error') };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <Navbar />
          <main className="container py-10">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Dashboard Overview</CardTitle>
                <CardDescription>Unable to render dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-red-600">{this.state.message}</div>
                <div className="mt-4">
                  <a href="/" className="px-3 py-2 rounded-md bg-indigo-600 text-white">Refresh</a>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      );
    }
    return this.props.children;
  }
}

const Home = () => {
  const useIsDark = () => {
    const [isDark, setIsDark] = React.useState(
      document.documentElement.classList.contains('dark') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
    React.useEffect(() => {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        setIsDark(document.documentElement.classList.contains('dark') || mq.matches);
      };
      mq.addEventListener?.('change', handler);
      window.addEventListener('themechange', handler);
      return () => {
        mq.removeEventListener?.('change', handler);
        window.removeEventListener('themechange', handler);
      };
    }, []);
    return isDark;
  };
  const isDark = useIsDark();
  const axisColor = isDark ? '#F3F4F6' : '#111827';
  const [dashboardData, setDashboardData] = useState({
    total_uploads: 0,
    total_subjects: 0,
    overall_pass_rate: 0,
    total_deficiencies: 0,
    recent_uploads: []
  });
  const [subjects, setSubjects] = useState([]);
  const [facultiesData, setFacultiesData] = useState([]);
  const [filterYear, setFilterYear] = useState('All');
  const [filterSemester, setFilterSemester] = useState('All');
  const [hotspotSubject, setHotspotSubject] = useState(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await fetchDashboardData();
        if (isMounted) {
          setDashboardData(data);
        }
        // Load subjects for summary extremes
        try {
          const subs = await fetchSubjects();
          if (isMounted && Array.isArray(subs)) setSubjects(subs);
        } catch (e) {
          // Non-blocking: keep page functional without subjects
          console.warn('Subjects fetch failed:', e?.message || e);
        }
        try {
          const byFaculty = await fetchAnalysisByFaculty();
          if (isMounted && Array.isArray(byFaculty?.faculties)) setFacultiesData(byFaculty.faculties);
        } catch (e) {
          console.warn('Analysis by faculty fetch failed:', e?.message || e);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const { sortOrder, selectedYear } = useAcademicYear();
  const recentSorted = React.useMemo(() => {
    const base = (dashboardData.recent_uploads || []).filter((u) => {
      if (selectedYear === 'All') return true;
      const y = getYearFromUpload(u);
      return String(y) === String(selectedYear);
    });
    const deduped = (() => {
      const map = new Map();
      for (const u of base) {
        const key = String(
          u.upload_id ?? u.id ?? `${String(u.faculty_name || '').trim()}|${(() => { try { return new Date(String(u.analysis_date || '')).getTime(); } catch { return 0; } })()}`
        );
        if (!map.has(key)) map.set(key, u);
      }
      return Array.from(map.values());
    })();
    return sortByAcademicYear(deduped, sortOrder, getYearFromUpload);
  }, [dashboardData.recent_uploads, sortOrder, selectedYear]);

  const uniqueSubjectsAggregated = React.useMemo(() => {
    const facs = Array.isArray(facultiesData) ? facultiesData : [];
    const scoped = facs.filter((f) => {
      const y = (() => { try { return new Date(String(f.analysis_date || '')).getFullYear(); } catch { return ''; } })();
      const sem = String(f.semester || '').trim();
      const yOk = filterYear === 'All' || String(y) === String(filterYear);
      const sOk = filterSemester === 'All' || sem === filterSemester;
      return yOk && sOk;
    });
    const map = new Map();
    scoped.forEach((f) => {
      (f.subjects || []).forEach((s) => {
        const course = String(s.name || s.course || '').trim().toUpperCase();
        if (!course) return;
        const passRate = Number(s.passRate || s.pass_rate || 0);
        const enr = Number(s.enrolled || 0);
        const prev = map.get(course) || { course, passSum: 0, passCount: 0, enrolled: 0 };
        prev.passSum += isFinite(passRate) ? passRate : 0;
        prev.passCount += 1;
        prev.enrolled += isFinite(enr) ? enr : 0;
        map.set(course, prev);
      });
    });
    return Array.from(map.values()).map((v) => ({ course: v.course, avgPassRate: v.passCount ? v.passSum / v.passCount : 0, enrolled: v.enrolled }));
  }, [facultiesData, filterSemester, filterYear]);

  const weakestSubject = React.useMemo(() => {
    if (!uniqueSubjectsAggregated.length) return null;
    return uniqueSubjectsAggregated.slice().sort((a, b) => a.avgPassRate - b.avgPassRate)[0];
  }, [uniqueSubjectsAggregated]);

  const strongestSubject = React.useMemo(() => {
    if (!uniqueSubjectsAggregated.length) return null;
    return uniqueSubjectsAggregated.slice().sort((a, b) => b.avgPassRate - a.avgPassRate)[0];
  }, [uniqueSubjectsAggregated]);

  const uniqueSubjectCount = React.useMemo(() => uniqueSubjectsAggregated.length, [uniqueSubjectsAggregated]);

  const semesterOrder = React.useMemo(() => {
    const base = ['1st Semester', '2nd Semester', 'Summer', 'Midyear'];
    const present = Array.from(new Set((facultiesData || []).map((f) => String(f.semester || '').trim()).filter(Boolean)));
    const merged = base.concat(present.filter((x) => !base.includes(x)));
    return merged;
  }, [facultiesData]);

  const getScopedFaculties = React.useCallback((year, semester) => {
    return (facultiesData || []).filter((f) => {
      const y = (() => { try { return new Date(String(f.analysis_date || '')).getFullYear(); } catch { return ''; } })();
      const s = String(f.semester || '').trim();
      const yOk = year === 'All' || String(y) === String(year);
      const sOk = semester === 'All' || s === semester;
      return yOk && sOk;
    });
  }, [facultiesData]);

  const getMetricsFor = React.useCallback((year, semester) => {
    const scoped = getScopedFaculties(year, semester);
    const totals = scoped.reduce((acc, f) => {
      const s = f.summary || {};
      acc.enrolled += Number(s.enrolled || 0);
      acc.passed += Number(s.passed || 0);
      acc.failed += Number(s.failed || 0);
      acc.deficiencies += Number(s.deficiencies || 0);
      return acc;
    }, { enrolled: 0, passed: 0, failed: 0, deficiencies: 0 });
    const passRate = totals.enrolled > 0 ? (totals.passed / totals.enrolled) * 100 : 0;
    return { totals, passRate };
  }, [getScopedFaculties]);

  const previousScope = React.useMemo(() => {
    if (filterYear !== 'All' && filterSemester !== 'All') {
      const years = Array.from(new Set((facultiesData || []).map((f) => { try { return new Date(String(f.analysis_date || '')).getFullYear(); } catch { return null; } }).filter((y) => y != null))).sort((a,b)=>a-b);
      const idxYear = years.indexOf(Number(filterYear));
      const idxSem = semesterOrder.indexOf(filterSemester);
      if (idxSem > 0) {
        return { year: filterYear, semester: semesterOrder[idxSem - 1] };
      }
      if (idxYear > 0) {
        const prevYear = years[idxYear - 1];
        const lastSem = semesterOrder.slice().reverse().find((s) => getScopedFaculties(String(prevYear), s).length > 0) || 'All';
        return { year: String(prevYear), semester: lastSem };
      }
    }
    return null;
  }, [filterYear, filterSemester, facultiesData, semesterOrder, getScopedFaculties]);

  const currentMetrics = React.useMemo(() => getMetricsFor(filterYear, filterSemester), [getMetricsFor, filterYear, filterSemester]);
  const previousMetrics = React.useMemo(() => previousScope ? getMetricsFor(previousScope.year, previousScope.semester) : null, [getMetricsFor, previousScope]);

  const passDelta = React.useMemo(() => {
    if (!previousMetrics) return null;
    return currentMetrics.passRate - previousMetrics.passRate;
  }, [currentMetrics, previousMetrics]);

  const defDeltaPct = React.useMemo(() => {
    if (!previousMetrics) return null;
    const prev = previousMetrics.totals.deficiencies || 0;
    const cur = currentMetrics.totals.deficiencies || 0;
    if (prev === 0) return null;
    return ((cur - prev) / prev) * 100;
  }, [currentMetrics, previousMetrics]);

  const parseFailedFromText = (text) => {
    const afterFailed = (String(text || '').split('FAILED STUDENTS')[1] || String(text || '').split('FAILED STUDENTS (5.00 or FAILED)')[1] || '');
    const section = (afterFailed.split('INCOMPLETE STUDENTS')[0] || afterFailed.split(' INCOMPLETE STUDENTS')[0] || '').trim();
    const lines = section.split('\n').map((l) => l.trim()).filter((l) => /\s-\s/.test(l) && l.split(' - ').length >= 3);
    return lines.map((line) => {
      const parts = line.replace(/^\s*/, '').split(' - ');
      return { name: parts[0] || '', course: parts[1] || '', value: (parts[2] || '').toUpperCase() };
    });
  };

  const parseIncompleteFromText = (text) => {
    const afterInc = (String(text || '').split('INCOMPLETE STUDENTS')[1] || String(text || '').split(' INCOMPLETE STUDENTS')[1] || '');
    const section = (afterInc.split('STUDENTS WITH MULTIPLE ISSUES')[0] || afterInc.split(' STUDENTS WITH MULTIPLE ISSUES')[0] || afterInc.split(' AI PREDICTED HIGH-RISK STUDENTS')[0] || '').trim();
    const lines = section.split('\n').map((l) => l.trim()).filter((l) => /\s-\s/.test(l) && l.split(' - ').length >= 3);
    return lines.map((line) => {
      const parts = line.replace(/^\s*/, '').split(' - ');
      const name = parts[0] || '';
      const course = parts[1] || '';
      const value = (parts[2] || '').toUpperCase();
      return { name, course, value };
    });
  };

  const failedStudentsScoped = React.useMemo(() => {
    const scoped = getScopedFaculties(filterYear, filterSemester);
    return scoped.flatMap((f) => {
      const items = parseFailedFromText(String(f.detailed_output || ''));
      return items.map((it) => ({ ...it, faculty: f.faculty_name || 'Unknown' }));
    });
  }, [getScopedFaculties, filterYear, filterSemester]);

  const incompleteStudentsScoped = React.useMemo(() => {
    const scoped = getScopedFaculties(filterYear, filterSemester);
    return scoped.flatMap((f) => {
      const items = parseIncompleteFromText(String(f.detailed_output || ''));
      return items.map((it) => ({ ...it, faculty: f.faculty_name || 'Unknown' }));
    });
  }, [getScopedFaculties, filterYear, filterSemester]);

  const totalDeficientStudentsScoped = React.useMemo(() => {
    const set = new Set();
    failedStudentsScoped.forEach((s) => {
      const key = String(s.name || '').trim();
      if (key) set.add(key);
    });
    incompleteStudentsScoped.forEach((s) => {
      const key = String(s.name || '').trim();
      if (key) set.add(key);
    });
    return set.size;
  }, [failedStudentsScoped, incompleteStudentsScoped]);

  const totalDeficienciesScoped = React.useMemo(() => {
    const scoped = getScopedFaculties(filterYear, filterSemester);
    return scoped.reduce((acc, f) => acc + Number((f.summary || {}).deficiencies || 0), 0);
  }, [getScopedFaculties, filterYear, filterSemester]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-all duration-500 ease-in-out">
      <Navbar />
      <section className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-indigo-800 dark:to-blue-700 text-white py-10 sm:py-12 shadow-lg">
        <div className="container px-4">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Dashboard Overview</h1>
              <p className="mt-2 text-white/90">Welcome back! Here's the latest summary of faculty analysis.</p>
            </div>
            <div className="hidden md:flex items-end gap-3">
              <div>
                <div className="text-xs text-white/90 mb-1">Academic Year</div>
                <select className="min-w-[140px] border rounded-full px-3 py-1.5 text-sm bg-white text-indigo-700" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                  {['All', ...Array.from(new Set((facultiesData || []).map((f) => { try { return String(new Date(String(f.analysis_date || '')).getFullYear()); } catch { return ''; } }).filter((x) => x))).sort()].map((opt) => (
                    <option key={`year-${opt}`} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-xs text-white/90 mb-1">Semester</div>
                <select className="min-w-[140px] border rounded-full px-3 py-1.5 text-sm bg-white text-indigo-700" value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)}>
                  {['All', ...Array.from(new Set((facultiesData || []).map((f) => String(f.semester || '').trim()).filter((x) => x))).sort()].map((opt) => (
                    <option key={`sem-${opt}`} value={opt}>{opt || 'N/A'}</option>
                  ))}
                </select>
              </div>
              <a href={`/summary?year=${encodeURIComponent(filterYear)}&semester=${encodeURIComponent(filterSemester)}`} className="px-4 py-2 rounded-full bg-white text-indigo-700 font-semibold shadow hover:shadow-md">Open Summary Overview</a>
            </div>
          </div>
        </div>
      </section>
      <main className="container py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="space-y-12">
            
            {/* Mobile Dropdowns */}
            <div className="md:hidden grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div>
                <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">Academic Year</div>
                <select className="w-full border rounded-full px-3 py-2 text-sm bg-white dark:bg-gray-800" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                  {['All', ...Array.from(new Set((facultiesData || []).map((f) => { try { return String(new Date(String(f.analysis_date || '')).getFullYear()); } catch { return ''; } }).filter((x) => x))).sort()].map((opt) => (
                    <option key={`year-${opt}`} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-xs text-gray-700 dark:text-gray-300 mb-1">Semester</div>
                <select className="w-full border rounded-full px-3 py-2 text-sm bg-white dark:bg-gray-800" value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)}>
                  {['All', ...Array.from(new Set((facultiesData || []).map((f) => String(f.semester || '').trim()).filter((x) => x))).sort()].map((opt) => (
                    <option key={`sem-${opt}`} value={opt}>{opt || 'N/A'}</option>
                  ))}
                </select>
              </div>
              <a href={`/summary?year=${encodeURIComponent(filterYear)}&semester=${encodeURIComponent(filterSemester)}`} className="text-center px-3 py-2 rounded-full border bg-white dark:bg-gray-800 text-sm">Open Summary Overview</a>
            </div>

            {/* Academic Performance Summary (Main Dashboard View) */}
            <Card className="rounded-3xl border-0 shadow-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg overflow-hidden ring-1 ring-black/5">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
              <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-8 pt-8 px-8">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-400 dark:to-indigo-400">
                      Academic Performance Summary
                    </CardTitle>
                    <CardDescription className="text-base text-gray-500 mt-1">
                      Aggregate insights across all analyzed programs
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {/* Top Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                  {/* Metric 1: Total Uploads */}
                  <div className="p-6 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 transition-all hover:shadow-lg hover:border-blue-200">
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Faculty Analyzed</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">{dashboardData?.total_uploads ?? 0}</span>
                      <span className="text-sm text-gray-500">records</span>
                    </div>
                  </div>
                  {/* Metric 2: Unique Subjects */}
                  <div className="p-6 rounded-2xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 transition-all hover:shadow-lg hover:border-purple-200">
                    <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Unique Subjects</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">{uniqueSubjectCount}</span>
                      <span className="text-sm text-gray-500">subjects</span>
                    </div>
                  </div>
                  {/* Metric 3: Pass Rate */}
                  <div className="p-6 rounded-2xl bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 transition-all hover:shadow-lg hover:border-green-200">
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Combined Pass Rate</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">{Number(dashboardData?.overall_pass_rate || 0).toFixed(2)}%</span>
                    </div>
                  </div>
                  {/* Metric 4: Deficiencies */}
                  <div className="p-6 rounded-2xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 transition-all hover:shadow-lg hover:border-red-200">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Total Deficiencies</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">{totalDeficientStudentsScoped}</span>
                      <span className="text-sm text-gray-500">students</span>
                    </div>
                  </div>
                </div>

                {/* Weakest/Strongest Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  {/* Strongest */}
                  <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-1 text-white shadow-lg">
                    <div className="absolute inset-0 bg-white/10 group-hover:bg-white/0 transition-colors" />
                    <div className="relative h-full bg-white dark:bg-gray-900 rounded-xl p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                          <ArrowUp size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Strongest Subject</p>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">{strongestSubject ? strongestSubject.course : 'N/A'}</h3>
                          <p className="text-xs text-green-600 font-medium mt-1">Highest Pass Rate</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Weakest */}
                  <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 p-1 text-white shadow-lg">
                    <div className="absolute inset-0 bg-white/10 group-hover:bg-white/0 transition-colors" />
                    <div className="relative h-full bg-white dark:bg-gray-900 rounded-xl p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                          <ArrowDown size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Weakest Subject</p>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">{weakestSubject ? weakestSubject.course : 'N/A'}</h3>
                          <p className="text-xs text-red-600 font-medium mt-1">Lowest Pass Rate</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tables Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                  {/* Top 5 Strongest */}
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 p-6">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      Top Performing Subjects
                    </h4>
                    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Rank</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Subject</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500">Pass Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {uniqueSubjectsAggregated.slice().sort((a,b)=>b.avgPassRate-a.avgPassRate).slice(0,5).map((s, idx)=>(
                            <tr key={`s-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                              <td className="px-4 py-3 text-gray-500">#{idx+1}</td>
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.course}</td>
                              <td className="px-4 py-3 text-right font-bold text-green-600">{Number(s.avgPassRate).toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Top 5 Weakest */}
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 p-6">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      Needs Improvement
                    </h4>
                    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Rank</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Subject</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500">Pass Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {(() => {
                            const base = uniqueSubjectsAggregated.slice().sort((a, b) => a.avgPassRate - b.avgPassRate);
                            return base.slice(0, 5).map((s, idx) => (
                              <tr key={`w-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="px-4 py-3 text-gray-500">#{idx+1}</td>
                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.course}</td>
                                <td className="px-4 py-3 text-right font-bold text-red-600">{Number(s.avgPassRate).toFixed(1)}%</td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Pass vs Fail Chart */}
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-900 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-6 text-center">Pass vs Fail Distribution</h4>
                    <div className="h-[200px] w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            dataKey="value"
                            data={[
                              { name: 'Pass', value: Math.round(dashboardData.overall_pass_rate || 0) },
                              { name: 'Fail', value: 100 - Math.round(dashboardData.overall_pass_rate || 0) },
                            ]}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            cornerRadius={5}
                          >
                            <Cell fill="#22c55e" />
                            <Cell fill="#ef4444" />
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center Text */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{Number(dashboardData?.overall_pass_rate || 0).toFixed(0)}%</p>
                          <p className="text-xs text-gray-500 uppercase">Passed</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enrollment Chart */}
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-900 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-6 text-center">Enrollment Status</h4>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: 'Enrolled', value: dashboardData.total_enrolled || 0 },
                          { name: 'Passed', value: dashboardData.total_passed || 0 },
                          { name: 'Failed', value: dashboardData.total_failed || 0 },
                        ]} barSize={40}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#374151' : '#E5E7EB'} />
                          <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis hide />
                          <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {["#3b82f6", "#22c55e", "#ef4444"].map((c, i) => (
                              <Cell key={`en-${i}`} fill={c} />
                            ))}
                            <LabelList dataKey="value" position="top" fill={axisColor} fontSize={12} fontWeight={600} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Hotspots */}
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-900 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Deficiency Hotspots</h4>
                    {(() => {
                      const scoped = getScopedFaculties(filterYear, filterSemester);
                      const map = new Map();
                      scoped.forEach((f)=>{
                        (f.subjects || []).forEach((s)=>{
                          const key = String(s.name || s.course || '').trim();
                          const def = Number(s.deficiencies || 0);
                          if (!key || !def) return;
                          const prev = map.get(key) || 0;
                          map.set(key, prev + def);
                        });
                      });
                      const counts = new Map();
                      const bump = (course) => {
                        const key = String(course || '').trim();
                        if (!key) return;
                        counts.set(key, (counts.get(key) || 0) + 1);
                      };
                      failedStudentsScoped.forEach((s) => bump(s.course));
                      incompleteStudentsScoped.forEach((s) => bump(s.course));
                      const rows = Array.from(counts.entries());
                      const total = rows.reduce((acc,[,v])=>acc+v,0);
                      const top = rows.sort((a,b)=>b[1]-a[1]).slice(0,5);

                      return (
                        <div className="space-y-3">
                          {top.map(([name, val], i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-xs">
                                  {i+1}
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{name}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-red-600">{val}</div>
                                <div className="text-xs text-gray-400">{total>0 ? ((val/total)*100).toFixed(0) : 0}%</div>
                              </div>
                            </div>
                          ))}
                          {top.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No deficiencies recorded.</p>}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Uploads and System Status (Moved to Bottom) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="rounded-3xl border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg lg:col-span-2 ring-1 ring-black/5">
                <CardHeader className="border-b border-gray-100 dark:border-gray-800">
                  <CardTitle className="text-lg font-bold text-indigo-900 dark:text-white flex items-center gap-2">
                    <UploadCloud className="h-5 w-5 text-indigo-600" /> Recent Uploads
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-700 dark:text-gray-300">Latest faculty data uploads</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(recentSorted || []).map((upload, idx) => (
                      <div
                        key={upload.id || idx}
                        className="flex items-center justify-between p-6 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center text-xs font-semibold shadow-md">
                            {(upload.faculty_name || 'F').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{upload.file_name || upload.faculty_name || 'Uploaded File'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{upload.faculty_name || 'Faculty'} • {new Date(upload.analysis_date || Date.now()).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                            {upload.program ? upload.program : 'General'}
                          </span>
                          <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                            A.Y. {formatAcademicYearRange(getYearFromUpload(upload))}
                          </span>
                          <Link to="/analysis" className="text-xs px-4 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium">View</Link>
                        </div>
                      </div>
                    ))}
                    {(dashboardData.recent_uploads || []).length === 0 ? (
                      <div className="p-8 text-center text-sm text-gray-500">No recent uploads.</div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            
              <Card className="rounded-3xl border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg ring-1 ring-black/5 h-fit">
                <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-indigo-700 dark:to-blue-600" />
                <CardHeader className="border-b border-gray-100 dark:border-gray-800">
                  <CardTitle className="text-lg font-bold text-indigo-900 dark:text-white">System Status</CardTitle>
                  <CardDescription className="text-sm text-gray-700 dark:text-gray-300">Health and activity overview</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" /> Database</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">Connected</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                        <RadixTooltip.Root>
                          <RadixTooltip.Trigger asChild>
                            <span className="cursor-help border-b border-dotted border-gray-400">AI Processor</span>
                          </RadixTooltip.Trigger>
                          <RadixTooltip.Portal>
                            <RadixTooltip.Content className="rounded-lg border bg-popover px-3 py-1.5 text-xs shadow-md z-50 text-popover-foreground">
                              Analyzing sentiment & trends
                              <RadixTooltip.Arrow className="fill-popover"/>
                            </RadixTooltip.Content>
                          </RadixTooltip.Portal>
                        </RadixTooltip.Root>
                      </span>
                      <span className="font-semibold text-green-600 dark:text-green-400">Running</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Last Analysis</span>
                      <span className="font-medium text-gray-900 dark:text-white">2 hours ago</span>
                    </div>
                  </div>
                  {/* Sparkline */}
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                    <div className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">System Activity</div>
                    <svg viewBox="0 0 100 24" className="w-full h-8 drop-shadow-sm">
                      <path
                        fill="none"
                        stroke="currentColor"
                        className="text-indigo-500 dark:text-indigo-400"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M0,12 L10,12 L15,4 L20,20 L25,12 L40,12 L45,8 L50,16 L55,12 L70,12 L75,6 L80,18 L85,12 L100,12"
                      />
                    </svg>
                  </div>
                  {/* AI Processor Pulse */}
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-full w-fit">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
                    </span>
                    <span>AI Engine Active</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Dialog.Root open={!!hotspotSubject} onOpenChange={(open)=> !open && setHotspotSubject(null)}>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-3xl max-h-[80vh] overflow-auto rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl z-50 p-0">
                  {(() => {
                    const scoped = getScopedFaculties(filterYear, filterSemester);
                    const students = [];
                    scoped.forEach((f)=>{
                      (f.subjects || []).forEach((s)=>{
                        const key = String(s.name || s.course || '').trim();
                        if (key === String(hotspotSubject || '')) {
                          (Array.isArray(s.students) ? s.students : []).forEach((st)=>{
                            students.push({ name: st?.name || 'Unknown', status: st?.status || 'Deficient', faculty: f.faculty_name || 'Unknown' });
                          });
                        }
                      });
                    });
                    return (
                      <div>
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                          <div>
                            <CardTitle className="text-lg">Deficiency Details</CardTitle>
                            <CardDescription>{hotspotSubject}</CardDescription>
                          </div>
                          <Dialog.Close asChild>
                            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                              <span className="sr-only">Close</span>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                          </Dialog.Close>
                        </div>
                        <div className="p-6">
                          {students.length === 0 ? (
                            <p className="text-sm text-gray-500">No student-level details available.</p>
                          ) : (
                            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-medium">
                                  <tr>
                                    <th className="p-3">Student</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Faculty</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                  {students.map((s, i)=> (
                                    <tr key={`ds-${i}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                                      <td className="p-3 font-medium text-gray-900 dark:text-white">{s.name}</td>
                                      <td className="p-3 text-red-600 font-medium">{s.status}</td>
                                      <td className="p-3 text-gray-600 dark:text-gray-400">{s.faculty}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </motion.div>
      </main>
      </div>
    </ErrorBoundary>
  );
};

export default Home;
