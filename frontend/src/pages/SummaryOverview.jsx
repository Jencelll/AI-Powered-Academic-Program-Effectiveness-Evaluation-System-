import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/NavBar';
import Sidebar from '../components/Sidebar';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { fetchAnalysisByFaculty } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList, ReferenceLine, Label } from 'recharts';
import * as Dialog from '@radix-ui/react-dialog';
import { useAcademicYear } from '../context/AcademicYearContext';
import { getYearFromUpload, sortByAcademicYear, formatAcademicYearRange } from '../utils/academicYear';

const useIsDark = () => {
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains('dark') ||
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setIsDark(document.documentElement.classList.contains('dark') || mq.matches);
    mq.addEventListener?.('change', handler);
    window.addEventListener('themechange', handler);
    return () => {
      mq.removeEventListener?.('change', handler);
      window.removeEventListener('themechange', handler);
    };
  }, []);
  return isDark;
};

const COLORS_LIGHT = ['#007A33', '#D32F2F'];
const COLORS_DARK = ['#007A33', '#D32F2F'];
const GENDER_COLORS_LIGHT = ['#003087', '#FDBF0F'];
const GENDER_COLORS_DARK = ['#003087', '#FDBF0F'];
const INTERVENTION_COLORS = ['#D32F2F', '#FDBF0F'];

// Card for a single student with multiple academic issues
const StudentIssueCard = ({ student, accent }) => {
  const [expanded, setExpanded] = useState(false);
  const issuesLabel = `${student.numSubjects} ${student.numSubjects === 1 ? 'Subject' : 'Subjects'}`;
  const accentBg = accent === 'destructive' ? 'bg-destructive/60' : accent === 'secondary' ? 'bg-secondary/60' : 'bg-primary/60';
  return (
    <motion.div
      layout
      className="group flex items-stretch border rounded-2xl bg-muted/50 shadow-sm overflow-hidden cursor-pointer hover:bg-muted/70"
      onClick={() => setExpanded((v) => !v)}
   >
      <div className={`w-1 ${accentBg}`} />
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-semibold tracking-tight">{student.name}</p>
            <p className="text-xs text-muted-foreground">Issues: {issuesLabel} • {student.trend}</p>
          </div>
          <button
            type="button"
            className="text-xs px-2 py-1 rounded-md border bg-background hover:bg-muted"
          >
            {expanded ? 'Hide breakdown' : 'View subject breakdown'}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18 }}
              className="mt-3 space-y-1"
            >
              {student.subjects.map((subj, idx) => (
                <div key={`${student.name}-${subj.course}-${idx}`} className="px-3 py-2 rounded-xl border bg-background/60">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{subj.course}</span>
                    <span className="text-xs text-muted-foreground">{subj.statuses.join(', ')}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

function formatPercent(n) {
  const v = Number(n || 0);
  if (!isFinite(v)) return '0.00%';
  return `${v.toFixed(2)}%`;
}

// Helpers adapted from Analysis.jsx for consistency
function aggregateSubjectsByName(subjects) {
  const map = new Map();
  for (const s of (subjects || [])) {
    const name = String(s.course || s.name || '').trim().toUpperCase();
    const enrolled = Number(s.enrolled || 0);
    const passed = Number(s.passed || Math.round(enrolled * Number(s.passRate || 0) / 100));
    const failed = Number(s.failed || Math.max(enrolled - passed, 0));
    const deficiencies = Number(s.num_def || s.deficiencies || 0);
    if (!name) continue;
    const prev = map.get(name) || { name, enrolled: 0, passed: 0, failed: 0, deficiencies: 0 };
    prev.enrolled += enrolled;
    prev.passed += passed;
    prev.failed += failed;
    prev.deficiencies += deficiencies;
    map.set(name, prev);
  }
  return Array.from(map.values()).map((x) => ({ ...x, passRate: x.enrolled > 0 ? (x.passed / x.enrolled) * 100 : 0 }));
}

function parseGenderFromText(text) {
  const t = String(text || '');
  const maleMatch = t.match(/Male\s*:\s*(\d+)/i);
  const femaleMatch = t.match(/Female\s*:\s*(\d+)/i);
  const maleRateMatch = t.match(/Male Pass Rate\s*:\s*(\d+(?:\.\d+)?)%/i);
  const femaleRateMatch = t.match(/Female Pass Rate\s*:\s*(\d+(?:\.\d+)?)%/i);
  const male = maleMatch ? Number(maleMatch[1]) : null;
  const female = femaleMatch ? Number(femaleMatch[1]) : null;
  const total = male != null && female != null ? male + female : null;
  const maleRate = maleRateMatch ? Number(maleRateMatch[1]) : null;
  const femaleRate = femaleRateMatch ? Number(femaleRateMatch[1]) : null;
  return { male, female, total, maleRate, femaleRate };
}

const SummaryOverview = () => {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ program: 'All', semester: 'All', year: 'All' });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Theme: compute once per render (avoid calling hooks in callbacks)
  const isDark = useIsDark();
  const PIE_COLORS = isDark ? COLORS_DARK : COLORS_LIGHT;
  const GENDER_COLORS = isDark ? GENDER_COLORS_DARK : GENDER_COLORS_LIGHT;
  const PASS_COLOR = isDark ? '#22C55E' : '#16A34A';
  const FAIL_COLOR = isDark ? '#EF4444' : '#DC2626';

  // Selected IDs persisted in localStorage by Analysis page
  const [selectedIds, setSelectedIds] = useState(() => {
    try {
      const raw = localStorage.getItem('summarySelectedUploads');
      return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Parsers for student lists from detailed output
  const parseFailedFromText = (text) => {
    const afterFailed = (text.split('FAILED STUDENTS')[1] || text.split('FAILED STUDENTS (5.00 or FAILED)')[1] || '');
    const section = (afterFailed.split('INCOMPLETE STUDENTS')[0] || afterFailed.split(' INCOMPLETE STUDENTS')[0] || '').trim();
    const lines = section
      .split('\n')
      .map(l => l.trim())
      .filter(l => /\s-\s/.test(l) && l.split(' - ').length >= 3);
    return lines.map(line => {
      const parts = line.replace(/^\s*/, '').split(' - ');
      return { name: parts[0] || '', course: parts[1] || '', value: (parts[2] || '').toUpperCase() };
    });
  };

  const parseIncompleteFromText = (text) => {
    const afterInc = (text.split('INCOMPLETE STUDENTS')[1] || text.split(' INCOMPLETE STUDENTS')[1] || '');
    const section = (afterInc.split('STUDENTS WITH MULTIPLE ISSUES')[0] || afterInc.split(' STUDENTS WITH MULTIPLE ISSUES')[0] || afterInc.split(' AI PREDICTED HIGH-RISK STUDENTS')[0] || '').trim();
    const lines = section
      .split('\n')
      .map(l => l.trim())
      .filter(l => /\s-\s/.test(l) && l.split(' - ').length >= 3);
    return lines.map(line => {
      const parts = line.replace(/^\s*/, '').split(' - ');
      const name = parts[0] || '';
      const course = parts[1] || '';
      const value = (parts[2] || '').toUpperCase();
      return { name, course, value };
    });
  };

  // Helper: read latest selection from localStorage
  const readSelectedFromStorage = () => {
    try {
      const raw = localStorage.getItem('summarySelectedUploads');
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  };

  // Keep selection in sync if another tab/page updates it
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'summarySelectedUploads') {
        setSelectedIds(readSelectedFromStorage());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const refresh = async () => {
    try {
      setLoading(true);
      setError('');
      // Re-read selection so the overview reflects latest toggles
      setSelectedIds(readSelectedFromStorage());
      const byFaculty = await fetchAnalysisByFaculty();
      setFaculties(byFaculty.faculties || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load summary data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const { sortOrder, selectedYear } = useAcademicYear();

  const facultiesYearScoped = useMemo(() => {
    const base = (faculties || []).filter((f) => {
      if (selectedYear === 'All') return true;
      const y = getYearFromUpload(f);
      return String(y) === String(selectedYear);
    });
    return sortByAcademicYear(base, sortOrder, getYearFromUpload);
  }, [faculties, sortOrder, selectedYear]);

  const filtered = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    const scoped = selectedIds && selectedIds.length > 0
      ? facultiesYearScoped.filter((f) => selectedSet.has(String(f.upload_id)) || selectedSet.has(String(f.id)))
      : facultiesYearScoped;
    return scoped.filter((f) => {
      const program = String(f.program || f.faculty_program || '').trim();
      const semester = String(f.semester || '').trim();
      // Derive year using consistent utility or fall back to properties
      let metaYear = String(getYearFromUpload(f) || f.academic_year || f.year || '').trim();
      if (!metaYear) {
        try {
          const d = new Date(String(f.analysis_date || ''));
          if (!isNaN(d.getTime())) {
            metaYear = String(d.getFullYear());
          }
        } catch {
          // ignore parse errors; leave metaYear empty
        }
      }
      const progOk = filters.program === 'All' || program === filters.program;
      const semOk = filters.semester === 'All' || semester === filters.semester;
      const yearOk = filters.year === 'All' || metaYear === filters.year;
      return progOk && semOk && yearOk;
    });
  }, [facultiesYearScoped, selectedIds, filters]);

  // Dynamic filter options derived from available data
  const programOptions = useMemo(() => {
    const set = new Set();
    (faculties || []).forEach((f) => {
      const p = String(f.program || f.faculty_program || '').trim();
      if (p) set.add(p);
    });
    return ['All', ...Array.from(set).sort()];
  }, [facultiesYearScoped]);

  const semesterOptions = useMemo(() => {
    const set = new Set();
    (faculties || []).forEach((f) => {
      const s = String(f.semester || '').trim();
      if (s) set.add(s);
    });
    return ['All', ...Array.from(set).sort()];
  }, [facultiesYearScoped]);

  const yearOptions = useMemo(() => {
    const set = new Set();
    (faculties || []).forEach((f) => {
      let y = String(getYearFromUpload(f) || f.academic_year || f.year || '').trim();
      if (!y) {
        try {
          const d = new Date(String(f.analysis_date || ''));
          if (!isNaN(d.getTime())) y = String(d.getFullYear());
        } catch {}
      }
      if (y) set.add(y);
    });
    return ['All', ...Array.from(set).sort()];
  }, [facultiesYearScoped]);

  const agg = useMemo(() => {
    const totals = filtered.reduce(
      (acc, f) => {
        const s = f.summary || {};
        acc.enrolled += Number(s.enrolled || 0);
        acc.passed += Number(s.passed || 0);
        acc.failed += Number(s.failed || 0);
        acc.deficiencies += Number(s.deficiencies || 0);
        acc.courses += Number((f.subjects || []).length);
        return acc;
      },
      { enrolled: 0, passed: 0, failed: 0, deficiencies: 0, courses: 0 }
    );
    const overallPassRate = totals.enrolled > 0 ? (totals.passed / totals.enrolled) * 100 : 0;
    const overallFailRate = totals.enrolled > 0 ? (totals.failed / totals.enrolled) * 100 : 0;

    const subjectsAgg = aggregateSubjectsByName(filtered.flatMap((f) => f.subjects || []));
    const topSubjects = subjectsAgg.slice().sort((a, b) => b.passRate - a.passRate).slice(0, Math.min(5, subjectsAgg.length));
    const WEAK_PASSRATE_THRESHOLD = 90;
    let weakSubjects = subjectsAgg
      .slice()
      .filter((s) => Number(s.passRate || 0) <= WEAK_PASSRATE_THRESHOLD)
      .sort((a, b) => a.passRate - b.passRate)
      .slice(0, Math.min(5, subjectsAgg.length));
    if (weakSubjects.length === 0) {
      weakSubjects = subjectsAgg.slice().sort((a, b) => a.passRate - b.passRate).slice(0, Math.min(5, subjectsAgg.length));
    }

    // Gender aggregation
    const genders = filtered.map((f) => parseGenderFromText(String(f.detailed_output || '')));
    const maleRates = genders.map(g => g.maleRate).filter(v => typeof v === 'number');
    const femaleRates = genders.map(g => g.femaleRate).filter(v => typeof v === 'number');
    const maleAvg = maleRates.length ? maleRates.reduce((a,b)=>a+b,0)/maleRates.length : null;
    const femaleAvg = femaleRates.length ? femaleRates.reduce((a,b)=>a+b,0)/femaleRates.length : null;

    return {
      totals,
      overallPassRate,
      overallFailRate,
      topSubjects,
      weakSubjects,
      gender: { maleAvg, femaleAvg },
    };
  }, [filtered]);

  const semesterOrder = useMemo(() => ['1st Semester', '2nd Semester', 'Summer', 'Midyear'], []);
  const [hotspotSubject, setHotspotSubject] = useState(null);

  const failedStudents = useMemo(() => {
    return filtered.flatMap((f) => {
      const items = parseFailedFromText(String(f.detailed_output || ''));
      return items.map((it) => ({ ...it, faculty: f.faculty_name || 'Unknown' }));
    });
  }, [filtered]);

  const incompleteStudents = useMemo(() => {
    return filtered.flatMap((f) => {
      const items = parseIncompleteFromText(String(f.detailed_output || ''));
      return items.map((it) => ({ ...it, faculty: f.faculty_name || 'Unknown' }));
    });
  }, [filtered]);

  const hotspotStudents = useMemo(() => {
    if (!hotspotSubject) return [];
    const all = [];
    failedStudents.forEach((s) => { if (String(s.course).trim() === String(hotspotSubject).trim()) all.push({ name: s.name, status: s.value, faculty: s.faculty }); });
    incompleteStudents.forEach((s) => { if (String(s.course).trim() === String(hotspotSubject).trim()) all.push({ name: s.name, status: s.value, faculty: s.faculty }); });
    return all;
  }, [hotspotSubject, failedStudents, incompleteStudents]);
  const deriveYear = (f) => {
    let y = String(f.year || '').trim();
    if (!y) {
      try {
        const d = new Date(String(f.analysis_date || ''));
        if (!isNaN(d.getTime())) y = String(d.getFullYear());
      } catch {}
    }
    return y;
  };
  const deriveSem = (f) => String(f.semester || '').trim();
  const getScoped = (year, sem) => filtered.filter((f) => {
    const yOk = year === 'All' || deriveYear(f) === year;
    const sOk = sem === 'All' || deriveSem(f) === sem;
    return yOk && sOk;
  });
  const aggregateSet = (set) => {
    const totals = set.reduce((acc, f) => {
      const s = f.summary || {};
      acc.enrolled += Number(s.enrolled || 0);
      acc.passed += Number(s.passed || 0);
      acc.failed += Number(s.failed || 0);
      acc.deficiencies += Number(s.deficiencies || 0);
      return acc;
    }, { enrolled: 0, passed: 0, failed: 0, deficiencies: 0 });
    const pr = totals.enrolled > 0 ? (totals.passed / totals.enrolled) * 100 : 0;
    return { totals, passRate: pr };
  };
  const previousScope = useMemo(() => {
    if (filters.year !== 'All' && filters.semester !== 'All') {
      const years = Array.from(new Set(filtered.map(deriveYear))).filter(Boolean).map(Number).sort((a,b)=>a-b);
      const idxYear = years.indexOf(Number(filters.year));
      const idxSem = semesterOrder.indexOf(filters.semester);
      if (idxSem > 0) return { year: filters.year, semester: semesterOrder[idxSem - 1] };
      if (idxYear > 0) return { year: String(years[idxYear - 1]), semester: semesterOrder.slice().reverse().find((s)=>getScoped(String(years[idxYear - 1]), s).length>0) || 'All' };
    }
    return null;
  }, [filters, filtered, semesterOrder]);
  const currentMetrics = useMemo(() => aggregateSet(getScoped(filters.year, filters.semester)), [filters, filtered]);
  const previousMetrics = useMemo(() => previousScope ? aggregateSet(getScoped(previousScope.year, previousScope.semester)) : null, [previousScope, filtered]);
  const defDelta = useMemo(() => previousMetrics ? (currentMetrics.totals.deficiencies - previousMetrics.totals.deficiencies) : null, [currentMetrics, previousMetrics]);
  const passDelta = useMemo(() => previousMetrics ? (currentMetrics.passRate - previousMetrics.passRate) : null, [currentMetrics, previousMetrics]);

  const passFail = useMemo(() => {
    let enrolled = Number(agg.totals.enrolled || 0);
    let passed = Number(agg.totals.passed || 0);
    let failed = Number(agg.totals.failed || 0);
    if (!Number.isFinite(enrolled) || enrolled < 0) enrolled = 0;
    if (!Number.isFinite(passed) || passed < 0) passed = 0;
    if (!Number.isFinite(failed) || failed < 0) failed = 0;
    if (enrolled === 0) enrolled = passed + failed;
    if (enrolled > 0) {
      const sum = passed + failed;
      if (sum > enrolled && sum > 0) {
        const scale = enrolled / sum;
        passed = Math.round(passed * scale);
        failed = Math.max(enrolled - passed, 0);
      } else if (sum < enrolled) {
        failed = Math.max(enrolled - passed, 0);
      }
    }
    const passRate = enrolled > 0 ? (passed / enrolled) * 100 : 0;
    return { enrolled, passed, failed, passRate, data: [{ name: 'Passed', value: passed }, { name: 'Failed', value: failed }] };
  }, [agg]);

  const genderRateData = useMemo(() => {
    const arr = [];
    if (typeof agg.gender.maleAvg === 'number') arr.push({ name: 'Male', rate: agg.gender.maleAvg });
    if (typeof agg.gender.femaleAvg === 'number') arr.push({ name: 'Female', rate: agg.gender.femaleAvg });
    return arr;
  }, [agg]);

  const narrative = useMemo(() => {
    const facultyCount = filtered.length;
    const totalStudents = agg.totals.enrolled;
    const avgPass = agg.overallPassRate;
    const female = agg.gender.femaleAvg;
    const male = agg.gender.maleAvg;
    const top = agg.topSubjects[0];
    const weak = agg.weakSubjects[0];
    const genderLine = (typeof female === 'number' && typeof male === 'number')
      ? `Female students achieved ${formatPercent(female)}, slightly ${female >= male ? 'higher than' : 'lower than'} males at ${formatPercent(male)}.`
      : 'Gender pass rates are not fully available across selected faculties.';
    const topLine = top ? `Top subjects include ${top.name} (${formatPercent(top.passRate)}).` : 'Top-performing subjects not identified.';
    const weakLine = weak ? `${weak.name} requires targeted remediation (${formatPercent(weak.passRate)}).` : 'No underperforming subjects identified.';
    return `Based on ${facultyCount} faculty datasets, a total of ${totalStudents} students were analyzed. The average pass rate across all courses is ${formatPercent(avgPass)}. ${genderLine} ${topLine} ${weakLine}`;
  }, [filtered, agg]);

  const defHotspotsData = useMemo(() => {
    const counts = new Map();
    const bump = (course) => {
      const key = String(course || '').trim();
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    };
    failedStudents.forEach((s) => bump(s.course));
    incompleteStudents.forEach((s) => bump(s.course));
    const rows = Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
    return rows.sort((a,b)=>b.value-a.value).slice(0,5);
  }, [failedStudents, incompleteStudents]);

  // BSCS vs BSIT comparative stats
  const programStats = useMemo(() => {
    const norm = (p) => String(p || '').toUpperCase();
    const group = (tag) => filtered.filter((f) => norm(f.program || f.faculty_program).includes(tag));
    const summarize = (arr) => {
      const totals = arr.reduce((acc, f) => {
        const s = f.summary || {};
        acc.enrolled += Number(s.enrolled || 0);
        acc.passed += Number(s.passed || 0);
        acc.failed += Number(s.failed || 0);
        acc.deficiencies += Number(s.deficiencies || 0);
        return acc;
      }, { enrolled: 0, passed: 0, failed: 0, deficiencies: 0 });
      const passRate = totals.enrolled > 0 ? (totals.passed / totals.enrolled) * 100 : 0;
      const subjectsAgg = aggregateSubjectsByName(arr.flatMap((f) => f.subjects || []));
      const strongest = subjectsAgg.slice().sort((a,b)=>b.passRate-a.passRate)[0] || null;
      const weakest = subjectsAgg.slice().sort((a,b)=>a.passRate-b.passRate)[0] || null;
      return { faculties: arr.length, totals, passRate, strongest, weakest };
    };
    const bscs = summarize(group('BSCS'));
    const bsit = summarize(group('BSIT'));
    return { BSCS: bscs, BSIT: bsit };
  }, [filtered]);

  const passRateCompareData = useMemo(() => ([
    { name: 'BSCS', value: Number(programStats.BSCS?.passRate || 0) },
    { name: 'BSIT', value: Number(programStats.BSIT?.passRate || 0) },
  ]), [programStats]);

  const defCompareData = useMemo(() => ([
    { name: 'BSCS', value: Number(programStats.BSCS?.totals?.deficiencies || 0) },
    { name: 'BSIT', value: Number(programStats.BSIT?.totals?.deficiencies || 0) },
  ]), [programStats]);

  // Aggregated student lists across selected faculties
  

  // Students with multiple academic issues (2+ distinct subjects across failed/incomplete)
  const multiIssueStudents = useMemo(() => {
    const map = new Map();

    const add = (entry) => {
      const name = String(entry.name || '').trim();
      if (!name) return;
      const course = String(entry.course || '').trim();
      const status = String(entry.value || '').trim();
      const rec = map.get(name) || { name, courses: new Map(), faculties: new Set(), counters: { failed: 0, incomplete: 0 } };
      if (course) {
        const c = rec.courses.get(course) || { course, statuses: new Set() };
        if (status) c.statuses.add(status);
        rec.courses.set(course, c);
      }
      if (/FAIL/i.test(status)) rec.counters.failed += 1;
      if (/INCOMPLETE/i.test(status)) rec.counters.incomplete += 1;
      if (entry.faculty) rec.faculties.add(entry.faculty);
      map.set(name, rec);
    };

    failedStudents.forEach(add);
    incompleteStudents.forEach(add);

    const rows = Array.from(map.values()).map((v) => {
      const subjects = Array.from(v.courses.values()).map((c) => ({ course: c.course, statuses: Array.from(c.statuses) }));
      const numSubjects = subjects.length;
      const trend = v.counters.failed >= v.counters.incomplete ? 'Predominantly failing grades' : 'Predominantly incomplete grades';
      return { name: v.name, subjects, numSubjects, faculties: Array.from(v.faculties), trend };
    }).filter((r) => r.numSubjects >= 2);

    rows.sort((a, b) => b.numSubjects - a.numSubjects || a.name.localeCompare(b.name));
    return rows;
  }, [failedStudents, incompleteStudents]);

  const yearRangeText = useMemo(() => {
    const years = filtered.map((f) => getYearFromUpload(f)).filter((y) => typeof y === 'number' && !Number.isNaN(y));
    if (!years.length) return 'N/A';
    const min = Math.min(...years);
    const max = Math.max(...years);
    return `${min} – ${max}`;
  }, [filtered]);

  // Subjects with most interventions (Failed + Incomplete counts)
  const subjectInterventions = useMemo(() => {
    const map = new Map();
    failedStudents.forEach((s) => {
      const key = String(s.course || '').trim();
      if (!key) return;
      const prev = map.get(key) || { course: key, failed: 0, incomplete: 0 };
      prev.failed += 1;
      map.set(key, prev);
    });
    incompleteStudents.forEach((s) => {
      const key = String(s.course || '').trim();
      if (!key) return;
      const prev = map.get(key) || { course: key, failed: 0, incomplete: 0 };
      prev.incomplete += 1;
      map.set(key, prev);
    });
    const rows = Array.from(map.values()).map((r) => ({ ...r, total: r.failed + r.incomplete }));
    rows.sort((a, b) => b.total - a.total);
    return rows;
  }, [failedStudents, incompleteStudents]);

  const interventionChartData = useMemo(() => {
    const toCode = (str) => {
      const s = String(str || '').trim();
      const m = s.match(/[A-Za-z]{2,}\s*\d{3}/);
      if (m) return m[0].replace(/\s+/g, ' ').toUpperCase();
      const parts = s.split(/\s+/);
      return parts.length >= 2 ? `${parts[0].toUpperCase()} ${parts[1].toUpperCase()}` : s.slice(0, 12);
    };
    const top = subjectInterventions.slice(0, Math.min(8, subjectInterventions.length));
    return top
      .map((r) => {
        const failed = Number(r.failed);
        const incomplete = Number(r.incomplete);
        const valid = Number.isFinite(failed) && Number.isFinite(incomplete) && failed >= 0 && incomplete >= 0;
        if (!valid) return null;
        return { label: toCode(r.course), fullName: r.course, Failed: failed, Incomplete: incomplete };
      })
      .filter(Boolean);
  }, [subjectInterventions]);

  const exportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Students', agg.totals.enrolled],
      ['Overall Pass Rate', `${agg.overallPassRate.toFixed(2)}%`],
      ['Overall Fail Rate', `${agg.overallFailRate.toFixed(2)}%`],
      ['Total Courses Analyzed', agg.totals.courses],
      ['Total Faculty Included', filtered.length],
      ['Narrative', narrative],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'summary_overview.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDoc = () => {
    const content = `\nProgram Summary Overview\n\n${narrative}\n\nTotal Students: ${agg.totals.enrolled}\nOverall Pass Rate: ${agg.overallPassRate.toFixed(2)}%\nOverall Fail Rate: ${agg.overallFailRate.toFixed(2)}%\nTotal Courses: ${agg.totals.courses}\nTotal Faculties: ${filtered.length}`;
    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'summary_overview.doc';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container">
        <div className="flex gap-6">
          <Sidebar />
          <main className="flex-1 py-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Program Summary Overview</h1>
                  <p className="text-sm text-muted-foreground">Aggregated analytics and summary from all selected faculty data.</p>
                  <p className="text-xs text-muted-foreground mt-1">Included Faculties: {filtered.length} • Last updated {lastUpdated ? lastUpdated.toLocaleString() : 'N/A'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={refresh}>Refresh Summary</Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const ids = (faculties || []).map((f) => String(f.upload_id || f.id)).filter(Boolean);
                      setSelectedIds(ids);
                      try { localStorage.setItem('summarySelectedUploads', JSON.stringify(ids)); } catch {}
                      setLastUpdated(new Date());
                    }}
                  >
                    Include All
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedIds([]);
                      try { localStorage.setItem('summarySelectedUploads', JSON.stringify([])); } catch {}
                      setLastUpdated(new Date());
                    }}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>

              {/* BSCS vs BSIT Comparison */}
              <Card className="rounded-xl mt-6">
                <CardHeader>
                  <CardTitle>BSCS vs BSIT Comparison</CardTitle>
                  <CardDescription>Program-level metrics across selected faculties</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left p-2">Program</th>
                          <th className="text-right p-2">Avg Pass Rate</th>
                          <th className="text-right p-2">Total Deficiencies</th>
                          <th className="text-right p-2"># Faculties</th>
                          <th className="text-left p-2">Strongest Subject</th>
                          <th className="text-left p-2">Weakest Subject</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['BSCS','BSIT'].map((prog)=>{
                          const p = programStats[prog] || { totals:{}, passRate:0, faculties:0 };
                          const strong = p.strongest ? `${p.strongest.name} (${formatPercent(p.strongest.passRate)})` : 'N/A';
                          const weak = p.weakest ? `${p.weakest.name} (${formatPercent(p.weakest.passRate)})` : 'N/A';
                          return (
                            <tr key={`prog-${prog}`} className="hover:bg-muted/40">
                              <td className="p-2 font-medium">{prog}</td>
                              <td className="p-2 text-right">{formatPercent(p.passRate)}</td>
                              <td className="p-2 text-right">{Number(p.totals.deficiencies||0)}</td>
                              <td className="p-2 text-right">{p.faculties}</td>
                              <td className="p-2">{strong}</td>
                              <td className="p-2">{weak}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 gap-6 mt-6">
                    <div className="rounded-xl border p-4 bg-white/60 dark:bg-gray-800/50 w-full">
                      <div className="text-sm font-medium mb-2">Average Pass Rate</div>
                      <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer>
                          <BarChart data={passRateCompareData} margin={{ top: 12, right: 20, bottom: 12, left: 4 }} barSize={72}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                            <XAxis dataKey="name" tick={{ fontSize: 13, fontWeight: 600, fill: '#374151' }} />
                            <YAxis domain={[0,100]} ticks={[0,20,40,60,80,100]} tick={{ fontSize: 13, fontWeight: 600, fill: '#374151' }} tickFormatter={(v)=>`${v}%`} />
                            <Tooltip formatter={(v)=>[`${Number(v).toFixed(1)}%`,`Pass Rate`]} contentStyle={{ background:'#ffffff', color:'#111827' }} />
                            <Legend wrapperStyle={{ fontSize: 12, color: '#374151' }} />
                            <Bar dataKey="value" name="Pass Rate (%)" fill="#007A33" radius={[10,10,0,0]} maxBarSize={120}>
                              <LabelList dataKey="value" position="top" formatter={(v)=>`${Number(v).toFixed(1)}%`} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="rounded-xl border p-4 bg-white/60 dark:bg-gray-800/50 w-full mb-6">
                      <div className="text-sm font-medium mb-2">Total Deficiencies</div>
                      <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer>
                          <BarChart data={defCompareData} margin={{ top: 12, right: 20, bottom: 12, left: 4 }} barSize={72}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                            <XAxis dataKey="name" tick={{ fontSize: 13, fontWeight: 600, fill: '#374151' }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 13, fontWeight: 600, fill: '#374151' }} ticks={(() => { const max = Math.max(5, ...defCompareData.map(d=>Number(d.value||0))); const upper = Math.ceil(max/5)*5; return Array.from({length: upper/5+1},(_,i)=>i*5); })()} domain={[0, (() => { const max = Math.max(5, ...defCompareData.map(d=>Number(d.value||0))); return Math.ceil(max/5)*5; })()]} />
                            <Tooltip formatter={(v)=>[Number(v),'Deficiencies']} contentStyle={{ background:'#ffffff', color:'#111827' }} />
                            <Legend wrapperStyle={{ fontSize: 12, color: '#374151' }} />
                            <Bar dataKey="value" name="Deficiencies" fill="#D32F2F" radius={[10,10,0,0]} maxBarSize={120}>
                              <LabelList dataKey="value" position="top" formatter={(v)=>Number(v)} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Empty-state helper when no faculties selected */}
              {filtered.length === 0 && faculties.length > 0 && (
                <Card className="rounded-2xl mt-4 border-dashed">
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">No faculties selected for summary.</p>
                        <p className="text-xs text-muted-foreground">Go to the Analysis page and toggle "Send to Summary Overview" on desired faculty blocks, or use "Include All" above.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => (window.location.href = '/analysis')}>Open Analysis</Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const ids = (faculties || []).map((f) => String(f.upload_id || f.id)).filter(Boolean);
                            setSelectedIds(ids);
                            try { localStorage.setItem('summarySelectedUploads', JSON.stringify(ids)); } catch {}
                            setLastUpdated(new Date());
                          }}
                        >
                          Include All
                        </Button>
                      </div>
                </div>
              </CardContent>
            </Card>

              )}

              {/* Students at Academic Risk */}
              <Card className="rounded-xl mt-6" style={{ borderColor: '#FDBF0F' }}>
                <CardHeader>
                  <CardTitle>Students at Academic Risk</CardTitle>
                  <CardDescription>3+ deficiencies or issues across subjects</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const risky = multiIssueStudents.filter((s)=>s.numSubjects>=3).length;
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">⚠</span>
                          <span className="text-sm">{risky} students have 3 or more deficiencies</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" onClick={() => (window.location.href = '/analysis')}>View list</Button>
                          <Button variant="outline" onClick={exportCSV}>Export for advising</Button>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Filters (mobile drawer) */}
              <div className="mt-4 md:hidden">
                <Button variant="outline" onClick={() => setFiltersOpen((v)=>!v)}>Toggle Filters</Button>
              </div>
              <Card className={`rounded-2xl mt-4 ${filtersOpen ? '' : 'hidden md:block'}`}>
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                  <CardDescription>Select scope for aggregation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {['Program', 'Semester', 'Year'].map((label, i) => {
                      const key = label.toLowerCase();
                      return (
                        <div key={label} className="space-y-1">
                          <label className="text-xs text-muted-foreground">{label}</label>
                          <select
                            className="w-full border rounded-xl p-2 text-sm bg-card"
                            value={filters[key]}
                            onChange={(e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }))}
                          >
                            {(label === 'Program' ? programOptions : label === 'Semester' ? semesterOptions : yearOptions).map((opt) => (
                              <option key={`${label}-${opt}`} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* At-Risk Alert */}
              {(currentMetrics.totals.deficiencies > 30 || (previousMetrics && currentMetrics.passRate < previousMetrics.passRate)) && (
                <Card className="rounded-xl mt-4 border-2" style={{ borderColor: '#D32F2F', background: '#fff0f0' }}>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#D32F2F' }}>
                      <span className="text-lg">⚠</span>
                      <span>
                        {currentMetrics.totals.deficiencies} students have deficiencies
                        {previousMetrics && defDelta != null ? ` — ${defDelta > 0 ? defDelta + ' more' : Math.abs(defDelta) + ' fewer'} than last semester` : ''}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-6">
                {[
                  { label: 'Total Students', value: currentMetrics.totals.enrolled },
                  { label: 'Overall Pass Rate', value: `${Number(currentMetrics.passRate || 0).toFixed(2)}%`, trophy: currentMetrics.passRate >= 98 },
                  { label: 'Overall Fail Rate', value: `${Number(100 - currentMetrics.passRate || 0).toFixed(2)}%` },
                  { label: 'Total Courses Analyzed', value: agg.totals.courses },
                  { label: 'Total Faculty Included', value: filtered.length },
                ].map((m, i) => (
                  <Card key={`metric-${i}`} className="rounded-xl shadow-md">
                    <CardContent>
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-5xl font-bold" style={{ color: i === 1 ? '#007A33' : i === 2 ? '#D32F2F' : '#003087' }}>{m.value}</p>
                        {m.trophy ? <span title="Excellent" className="text-xl" style={{ color: '#FDBF0F' }}>🏆</span> : null}
                      </div>
                      {i === 1 && passDelta != null && (
                        <p className={`text-xs mt-1 ${passDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>{passDelta >= 0 ? '↑' : '↓'} {Math.abs(passDelta).toFixed(2)}% from last sem</p>
                      )}
                      {i === 0 && previousMetrics && defDelta != null && (
                        <p className={`text-xs mt-1 ${defDelta >= 0 ? 'text-red-600' : 'text-green-600'}`}>{defDelta >= 0 ? '↑' : '↓'} {Math.abs(defDelta)} vs last sem</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              

              {/* Subject Performance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card className="rounded-xl shadow-sm">
                  <CardHeader>
                    <CardTitle>Top-Performing Subjects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {agg.topSubjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No subjects available.</p>
                    ) : (
                      <div className="space-y-2">
                        {agg.topSubjects.map((s) => (
                          <div key={`top-${s.name}`} className="p-3 rounded-xl border flex items-center justify-between hover:bg-muted/40">
                            <div>
                              <p className="font-medium">{s.name}</p>
                              <p className="text-xs text-muted-foreground">Deficiencies: {s.deficiencies}</p>
                            </div>
                            <span className="text-sm font-semibold">
                              {formatPercent(s.passRate)}
                              {Number(s.passRate) === 100 ? <span className="ml-2 px-2 py-0.5 text-xs rounded-full" style={{ background:'#E6F4EA', color:'#007A33' }}>Perfect</span> : null}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-xl shadow-sm">
                  <CardHeader>
                    <CardTitle>Underperforming Subjects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {agg.weakSubjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No subjects available.</p>
                    ) : (
                      <div className="space-y-2">
                        {agg.weakSubjects.map((s) => (
                          <div key={`weak-${s.name}`} className="p-3 rounded-xl border flex items-center justify-between hover:bg-muted/40">
                            <div>
                              <p className="font-medium">{s.name}</p>
                              <p className="text-xs text-muted-foreground">Deficiencies: {s.deficiencies}</p>
                            </div>
                            <span className="text-sm font-semibold">{formatPercent(s.passRate)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top 5 Subjects with Most Deficiencies */}
              <div className="mt-6 space-y-6">
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle>Top 5 Subjects with Most Deficiencies</CardTitle>
                    <CardDescription>Based on aggregated deficiencies across selected faculties</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const byDef = aggregateSubjectsByName(filtered.flatMap((f)=>f.subjects||[])).sort((a,b)=>b.deficiencies-a.deficiencies).slice(0,5);
                      if (byDef.length === 0) return <p className="text-sm text-muted-foreground">No deficiencies recorded across selected faculties.</p>;
                      return (
                        <div className="rounded-md border overflow-x-auto">
                          <table className="w-full text-sm table-auto">
                            <thead>
                              <tr>
                                <th className="text-left px-3 py-2 font-bold">Rank</th>
                                <th className="text-left px-3 py-2 font-bold">Subject</th>
                                <th className="text-right px-3 py-2 font-bold"># Deficiencies</th>
                                <th className="text-right px-3 py-2 font-bold">Pass Rate</th>
                              </tr>
                            </thead>
                            <tbody>
                              {byDef.map((r, idx)=> (
                                <tr key={`def-${r.name}-${idx}`} className={`${idx % 2 === 0 ? 'bg-muted/20' : ''} hover:bg-muted/40`}>
                                  <td className="px-3 py-2">{idx+1}</td>
                                  <td className="px-3 py-2">{r.name} {Number(r.passRate) === 100 ? <span className="ml-2 px-2 py-0.5 text-xs rounded-full" style={{ background:'#E6F4EA', color:'#007A33' }}>Perfect</span> : null}</td>
                                  <td className="px-3 py-2 text-right">{r.deficiencies}</td>
                                  <td className="px-3 py-2 text-right">{formatPercent(r.passRate)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle>Interventions by Subject</CardTitle>
                    <CardDescription>Failed vs Incomplete counts (Top 8)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {interventionChartData.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No data available for chart.</p>
                    ) : (
                      <div style={{ width: '100%', height: 340 }}>
                        <ResponsiveContainer>
                          <BarChart data={interventionChartData} margin={{ top: 36, right: 16, bottom: 64, left: 12 }} barCategoryGap="30%" barGap={8}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" interval={0} minTickGap={16} tickMargin={16} dy={12} tick={{ fontSize: 14, fontWeight: 600 }} tickLine={false}>
                              <Label value="Subjects (Top 8)" position="bottom" offset={32} />
                            </XAxis>
                            <YAxis allowDecimals={false} ticks={(() => { const max = Math.max(1, ...interventionChartData.flatMap(r=>[Number(r.Failed||0), Number(r.Incomplete||0)])); return Array.from({length: max+1}, (_,i)=>i); })()} domain={[0, (() => { const max = Math.max(1, ...interventionChartData.flatMap(r=>[Number(r.Failed||0), Number(r.Incomplete||0)])); return Math.max(1, max); })()]} tick={{ fontSize: 14, fontWeight: 600 }} tickLine={false}>
                              <Label value="Students (count)" angle={-90} position="insideLeft" offset={14} />
                            </YAxis>
                            <Tooltip formatter={(v, n, p) => [v, n]} labelFormatter={(lbl, payload) => {
                              const item = (payload && payload[0] && payload[0].payload) || null;
                              return item ? item.fullName : lbl;
                            }} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="Failed" name="Failed" fill={INTERVENTION_COLORS[0]} barSize={28} maxBarSize={32} />
                            <Bar dataKey="Incomplete" name="Incomplete" fill={INTERVENTION_COLORS[1]} barSize={28} maxBarSize={32} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Students With Multiple Academic Issues */}
                <Card className="rounded-xl mt-6">
                <CardHeader>
                  <CardTitle>Students With Multiple Academic Issues</CardTitle>
                  <CardDescription>
                    Total students with multiple issues: {multiIssueStudents.length} • Academic year range detected: {yearRangeText}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {multiIssueStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No students with multiple issues across selected faculties.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {multiIssueStudents.map((stu) => {
                        const accent = stu.numSubjects >= 4 ? 'destructive' : stu.numSubjects >= 3 ? 'secondary' : 'primary';
                        return (
                          <StudentIssueCard key={`mic-${stu.name}`} student={stu} accent={accent} />
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Failed and Incomplete Students */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle>Failed Students</CardTitle>
                    <CardDescription>Total: {failedStudents.length}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {failedStudents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No failed students across the selected faculties.</p>
                    ) : (
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Course</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Faculty</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {failedStudents.map((s, idx) => (
                              <TableRow key={`fail-${idx}`} className={`${idx % 2 === 0 ? 'bg-muted/20' : ''} hover:bg-muted/40`}> 
                                <TableCell className="font-medium sticky left-0 bg-card">{s.name}</TableCell>
                                <TableCell>{s.course}</TableCell>
                                <TableCell>{s.value}</TableCell>
                                <TableCell>{s.faculty}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle>Incomplete Students</CardTitle>
                    <CardDescription>Total: {incompleteStudents.length}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {incompleteStudents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No incomplete students across the selected faculties.</p>
                    ) : (
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Course</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Faculty</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {incompleteStudents.map((s, idx) => (
                              <TableRow key={`inc-${idx}`} className={`${idx % 2 === 0 ? 'bg-muted/20' : ''} hover:bg-muted/40`}> 
                                <TableCell className="font-medium sticky left-0 bg-card">{s.name}</TableCell>
                                <TableCell>{s.course}</TableCell>
                                <TableCell>{s.value}</TableCell>
                                <TableCell>{s.faculty}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Gender Distribution Insight */}
              <Card className="rounded-xl mt-6">
                <CardHeader>
                  <CardTitle>Gender Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {typeof agg.gender.femaleAvg === 'number' && typeof agg.gender.maleAvg === 'number'
                      ? `Across all programs, female students achieved ${formatPercent(agg.gender.femaleAvg)}, slightly ${agg.gender.femaleAvg >= agg.gender.maleAvg ? 'higher than' : 'lower than'} males at ${formatPercent(agg.gender.maleAvg)}.`
                      : 'Gender distribution insights are limited due to missing data.'}
                  </p>
                </CardContent>
              </Card>

              {/* Faculty Summary Table */}
              <Card className="rounded-xl mt-6">
                <CardHeader>
                  <CardTitle>Faculty Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto relative">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Faculty Name</TableHead>
                          <TableHead>Students</TableHead>
                          <TableHead>Avg Pass Rate</TableHead>
                          <TableHead>Deficiencies</TableHead>
                          <TableHead>Performance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((f, idx) => {
                          const s = f.summary || {};
                          const rate = Number(s.pass_rate || 0);
                          let perf = 'Average';
                          let color = 'text-yellow-600';
                          if (rate >= 95) { perf = 'Excellent'; color = 'text-green-600'; }
                          else if (rate < 85) { perf = 'Needs Improvement'; color = 'text-red-600'; }
                          return (
                            <TableRow key={`row-${f.upload_id}`} className={`cursor-pointer h-12 ${idx % 2 === 0 ? 'bg-muted/20' : ''} hover:bg-muted/40`} onClick={() => (window.location.href = '/analysis')}>
                              <TableCell className="font-medium sticky left-0 bg-card">
                                <div className="flex items-center gap-2">
                                  <span>{f.faculty_name || 'Unknown'}</span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                    A.Y. {formatAcademicYearRange(getYearFromUpload(f))}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{Number(s.enrolled || 0)}</TableCell>
                              <TableCell>{formatPercent(rate)}</TableCell>
                              <TableCell>{Number(s.deficiencies || 0)}</TableCell>
                              <TableCell className={color}>{perf}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Charts (stacked vertically) */}
              <div className="grid grid-cols-1 gap-6 mt-6">
                <Card className="rounded-2xl shadow-sm relative p-6 h-[360px] flex flex-col overflow-hidden w-full">
                  <CardHeader>
                    <CardTitle>Pass vs Fail</CardTitle>
                    <CardDescription>Based on total enrolled students</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <defs>
                            <linearGradient id="gradPass" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={PASS_COLOR} stopOpacity={0.9} />
                              <stop offset="100%" stopColor={PASS_COLOR} stopOpacity={1} />
                            </linearGradient>
                            <linearGradient id="gradFail" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={FAIL_COLOR} stopOpacity={0.9} />
                              <stop offset="100%" stopColor={FAIL_COLOR} stopOpacity={1} />
                            </linearGradient>
                          </defs>
                          <Pie data={[{ name: 'Track', value: 1 }]} dataKey="value" cx="50%" cy="50%" innerRadius={110} outerRadius={140} fill="#f3f4f6" stroke="none" isAnimationActive={false} />
                          <Pie data={passFail.data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={110} outerRadius={140} cornerRadius={12} padAngle={3} stroke="#ffffff" strokeWidth={4} labelLine={false} label={false} isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
                            {passFail.data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.name === 'Passed' ? 'url(#gradPass)' : 'url(#gradFail)'} />
                            ))}
                          </Pie>
                          <Tooltip content={({ payload }) => {
                            const p = passFail;
                            if (!p || !payload || !payload.length) return null;
                            return (
                              <div style={{ background:'#fff', color:'#111827', padding:8, borderRadius:8, boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                                <div style={{ fontWeight:700 }}>Totals</div>
                                <div>Passed: {p.passed}</div>
                                <div>Failed: {p.failed}</div>
                                <div>Total: {p.enrolled}</div>
                              </div>
                            );
                          }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <div className="font-bold" style={{ fontSize: '2.25rem', color: '#000000' }}>{Number(passFail.passRate || 0).toFixed(2)}%</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-center"><span className="inline-flex items-center gap-1 mr-3"><span className="h-2 w-2 rounded-full" style={{background:PASS_COLOR}}></span>Passed</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{background:FAIL_COLOR}}></span>Failed</span></div>
                    <div className="mt-3 text-center text-xs text-muted-foreground">Passed ({passFail.passed} of {passFail.enrolled})</div>
                  </CardContent>
                </Card>
                <Card className="rounded-xl shadow-sm p-6 h-[320px] flex flex-col w-full">
                  <CardHeader>
                    <CardTitle>Enrollment</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={[{ name: 'Enrolled', Passed: currentMetrics.totals.passed, Failed: currentMetrics.totals.failed }]} margin={{ top: 16, right: 16, bottom: 0, left: 0 }} barCategoryGap="35%" barGap={8} barSize={80}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#4b5563' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#4b5563' }} domain={[0, Math.ceil(((currentMetrics.totals.enrolled || 0) * 1.2) / 10) * 10]} />
                        <Tooltip />
                        <Bar dataKey="Passed" fill="#007A33" radius={[8,8,0,0]} maxBarSize={150}>
                          <LabelList dataKey="Passed" position="top" formatter={(v)=>v} />
                        </Bar>
                        <Bar dataKey="Failed" fill="#D32F2F" radius={[8,8,0,0]} maxBarSize={150}>
                          <LabelList dataKey="Failed" position="top" formatter={(v)=>v} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-2 text-xs text-center"><span className="inline-flex items-center gap-1 mr-3"><span className="h-2 w-2 rounded-full" style={{background:'#007A33'}}></span>Passed</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{background:'#D32F2F'}}></span>Failed</span></div>
                  </CardContent>
                </Card>
                <Card className="rounded-xl shadow-sm p-6 h-[320px] flex flex-col w-full">
                  <CardHeader>
                    <CardTitle>Deficiency Hotspots</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    {defHotspotsData.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No deficiencies recorded across selected faculties.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={defHotspotsData} layout="vertical" margin={{ top: 8, right: 40, bottom: 0, left: 12 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                          <XAxis type="number" tick={{ fontSize: 12, fill: '#4b5563' }} ticks={(() => { const max = Math.max(10, ...defHotspotsData.map(d=>d.value)); const upper = Math.ceil(max/10)*10; return Array.from({length: upper/10+1},(_,i)=>i*10); })()} domain={[0, (() => { const max = Math.max(10, ...defHotspotsData.map(d=>d.value)); return Math.ceil(max/10)*10; })()]} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#374151' }} width={220} />
                          <Tooltip formatter={(v)=>[`${v} issues`, '']} />
                          <ReferenceLine x={0} stroke="#9ca3af" />
                          <Bar dataKey="value" fill="#D32F2F" radius={[8, 8, 8, 8]} barSize={40} maxBarSize={40} onClick={(d)=> setHotspotSubject(d?.name)}>
                            <LabelList dataKey="value" position="right" formatter={(v)=>v} fill="#374151" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
                <Dialog.Root open={!!hotspotSubject} onOpenChange={(open)=> !open && setHotspotSubject(null)}>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/40" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-3xl max-h-[80vh] overflow-auto rounded-2xl bg-card border shadow-xl">
                      <div className="p-6">
                        <CardTitle>Deficiency Details {hotspotSubject ? `— ${hotspotSubject}` : ''}</CardTitle>
                        {hotspotStudents.length === 0 ? (
                          <p className="text-sm text-muted-foreground mt-2">No students listed for this subject.</p>
                        ) : (
                          <div className="rounded-md border overflow-x-auto mt-4">
                            <table className="w-full text-sm">
                              <thead>
                                <tr>
                                  <th className="text-left p-2">Student</th>
                                  <th className="text-left p-2">Status</th>
                                  <th className="text-left p-2">Faculty</th>
                                </tr>
                              </thead>
                              <tbody>
                                {hotspotStudents.map((s, i)=> (
                                  <tr key={`hs-${i}`} className="hover:bg-muted/40">
                                    <td className="p-2 font-medium">{s.name}</td>
                                    <td className="p-2">{s.status}</td>
                                    <td className="p-2">{s.faculty}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        <div className="mt-4 flex justify-end">
                          <Dialog.Close asChild>
                            <button className="px-3 py-2 text-sm rounded-md border bg-background hover:bg-muted">Close</button>
                          </Dialog.Close>
                        </div>
                      </div>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              </div>

              {/* AI Narrative Summary */}
              <Card className="rounded-xl mt-6">
                <CardHeader className="flex items-center justify-between">
                  <div>
                    <CardTitle>AI Narrative Summary</CardTitle>
                    <CardDescription>Auto-generated based on aggregated metrics</CardDescription>
                  </div>
                  <Button variant="outline" onClick={refresh}>Regenerate Summary</Button>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{narrative}</p>
                </CardContent>
              </Card>

              {/* Export Tools */}
              <div className="flex flex-wrap gap-3 mt-6">
                <Button variant="outline" onClick={exportPDF}>Export to PDF</Button>
                <Button variant="outline" onClick={exportDoc}>Export to Word</Button>
                <Button variant="outline" onClick={exportCSV}>Export to Excel</Button>
              </div>
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SummaryOverview;
