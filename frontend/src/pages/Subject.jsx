import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/NavBar';
import { useAcademicYear } from '../context/AcademicYearContext';
import { formatAcademicYearRange, getYearFromUpload } from '../utils/academicYear';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { fetchSubjects, fetchAnalysisByFaculty } from '../services/api';
import * as Dialog from '@radix-ui/react-dialog';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, TrendingUp, Search } from 'lucide-react';

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [query, setQuery] = useState('');
  const [openCards, setOpenCards] = useState({});
  const [activeModal, setActiveModal] = useState(null);

  // Hoist academic year hooks to the top-level of the component
  const { sortOrder, setSortOrder, selectedYear, setSelectedYear, availableYears, reset, setAvailableYears } = useAcademicYear();
  const yearOptions = useMemo(() => ['All', ...(availableYears || [])], [availableYears]);

  // Populate available years now that NavBar no longer manages them
  useEffect(() => {
    let mounted = true;
    fetchAnalysisByFaculty()
      .then((res) => {
        if (!mounted) return;
        const yrs = Array.from(
          new Set((res?.faculties || [])
            .map((f) => getYearFromUpload(f))
            .filter(Boolean))
        ).sort((a, b) => b - a);
        setAvailableYears(yrs);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [setAvailableYears]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await fetchSubjects();
        console.log('Fetched Subjects Data:', data); // DEBUG
        if (isMounted) {
          setSubjects(data || []);
        }
      } catch (err) {
        console.error('Failed to load subjects:', err);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map();
    (subjects || []).forEach(s => {
      const key = (s.course || '').trim();
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    });
    const arr = Array.from(map.entries()).map(([course, list]) => {
      const totals = list.reduce((acc, r) => {
        const enrolled = Number(r.enrolled || 0);
        const passed = Number(r.passed || 0);
        const failed = Number(r.failed || Math.max(enrolled - passed, 0));
        const def = Number(r.num_def || 0);
        acc.enrolled += enrolled;
        acc.passed += passed;
        acc.failed += failed;
        acc.deficiencies += def;
        return acc;
      }, { enrolled: 0, passed: 0, failed: 0, deficiencies: 0 });
      const avgPassRate = totals.enrolled > 0 ? (totals.passed / totals.enrolled) * 100 : 0;
      const sortedSections = [...list].sort((a, b) => Number(b.pass_rate || 0) - Number(a.pass_rate || 0));
      
      // Aggregate internal reviews from all sections (which come from API now)
      // Deduplicate by content to avoid showing identical reviews multiple times
      const allReviews = [];
      const seenReviewContent = new Set();
      
      list.forEach(item => {
        if (item.internal_reviews && Array.isArray(item.internal_reviews)) {
            item.internal_reviews.forEach(rev => {
                // Normalize string for better deduplication (lowercase, collapse whitespace)
                const normalize = (str) => (str || '').toLowerCase().replace(/\s+/g, ' ').trim();
                const contentKey = `${normalize(rev.weakness)}|${normalize(rev.action_taken)}|${normalize(rev.recommendation)}`;
                
                if (!seenReviewContent.has(contentKey)) {
                    seenReviewContent.add(contentKey);
                    allReviews.push(rev);
                }
            });
        }
      });
      // Sort reviews by created_at desc
      allReviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      return { course, sections: list, totals, avgPassRate, sortedSections, internalReviews: allReviews };
    });
    return arr.sort((a, b) => a.course.localeCompare(b.course));
  }, [subjects]);

  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase();
    if (!q) return grouped;
    return grouped.filter(g =>
      g.course.toLowerCase().includes(q) ||
      g.sections.some(sec => (sec.program || '').toLowerCase().includes(q))
    );
  }, [grouped, query]);

  const toggleCard = (course) => {
    setOpenCards(prev => ({ ...prev, [course]: !prev[course] }));
  };

  const statusForRate = (rate) => {
    if (rate >= 95) return { label: 'Excellent', className: 'bg-green-600 text-white' };
    if (rate >= 80) return { label: 'Moderate', className: 'bg-yellow-500 text-black' };
    return { label: 'Needs Attention', className: 'bg-red-600 text-white' };
  };

  const colorForRate = (rate) => {
    if (rate >= 95) return 'bg-green-500';
    if (rate >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const sectionName = (program) => {
    const p = String(program || '').trim();
    const match = p.match(/[A-Za-z0-9]+$/);
    return match ? match[0] : p || 'Section';
  };  const sanitizeText = (str) => {
    const s = String(str || '');
    const map = [
      [/\u{1F534}/gu, 'Low'],       // ?? red circle
      [/\u{1F7E2}/gu, 'High'],      // ?? green circle
      [/\u{1F4CA}/gu, 'Analysis'],  // ?? bar chart
      [/\u2705/gu, 'Passed'],       // ? check mark
      [/\u{1F3AF}/gu, 'Target'],    // ?? direct hit
      [/\u{1F947}/gu, 'Top'],       //  1st place
      [/\u{1F3C6}/gu, 'Top'],       //  trophy
      [/\u{1F916}/gu, 'AI'],        //  robot
      [/\u26A0\uFE0F?/gu, 'Warning'], //  warning
    ];
    let out = s;
    map.forEach(([rx, rep]) => { out = out.replace(rx, rep); });
    out = out.replace(/[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u2600-\u26FF]/gu, '');
    return out.trim();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-6">
        {/* Academic Year Controls (page-level) */}
        <div className="mb-4 flex items-center gap-3">
          <label className="text-xs text-muted-foreground">Sort by Academic Year</label>
          <select
            className="text-xs px-2 py-1 rounded-md border bg-white/70 dark:bg-gray-800/80"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="newest">Newest to Oldest</option>
            <option value="oldest">Oldest to Newest</option>
          </select>
          <select
            className="text-xs px-2 py-1 rounded-md border bg-white/70 dark:bg-gray-800/80"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {yearOptions.map((y) => (
              <option key={`ay-${y}`} value={y}>{y === 'All' ? 'All Years' : `A.Y. ${formatAcademicYearRange(y)}`}</option>
            ))}
          </select>
          <button className="text-xs px-2 py-1 rounded-md border" onClick={reset}>Reset</button>
          {selectedYear !== 'All' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
              A.Y. {formatAcademicYearRange(selectedYear)}
            </span>
          )}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Subjects Overview</h1>
            <p className="text-muted-foreground">Professional, organized view with per-section performance and AI insights.</p>
          </div>

          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Find Subjects</CardTitle>
              <CardDescription>Filter by subject name or program/section.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search subjects (e.g., ITST 304) or program (e.g., BSIT 3A)"
                  />
                </div>
                <Button variant="outline" onClick={() => setQuery('')}>Clear</Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map(({ course, sections, totals, avgPassRate, sortedSections, internalReviews }) => {
              const reviews = internalReviews || [];
              const status = statusForRate(avgPassRate);
              const isOpen = !!openCards[course];
              const top = sortedSections[0];
              const bottom = sortedSections[sortedSections.length - 1];
              return (
                <Card key={course} className="rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-900 overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          {course}
                          {status.label === 'Excellent' && <CheckCircle className="w-5 h-5 text-green-500" />}
                          {status.label === 'Needs Attention' && <AlertCircle className="w-5 h-5 text-red-500" />}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {totals.enrolled} Enrolled • {totals.passed} Passed • {totals.failed} Failed
                        </p>
                      </div>
                      <Badge variant="outline" className={`${status.className} px-3 py-1 text-xs font-semibold uppercase tracking-wider border-0`}>
                        {status.label}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between items-end text-sm">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Average Pass Rate</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{avgPassRate.toFixed(1)}%</span>
                      </div>
                      <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(0, Math.min(100, avgPassRate))}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full ${colorForRate(avgPassRate)} shadow-sm`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="text-xs text-gray-500 mb-1">Top Section</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-200">
                          {top ? sectionName(top.program) : '-'}
                        </div>
                        <div className="text-xs text-green-600 font-medium mt-1">
                          {top ? `${Number(top.pass_rate || 0).toFixed(1)}%` : ''}
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="text-xs text-gray-500 mb-1">Needs Attention</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-200">
                          {bottom ? sectionName(bottom.program) : '-'}
                        </div>
                        <div className="text-xs text-red-600 font-medium mt-1">
                          {bottom ? `${Number(bottom.pass_rate || 0).toFixed(1)}%` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button 
                      variant="outline" 
                      type="button"
                      onClick={() => toggleCard(course)} 
                      className="flex-1 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {isOpen ? 'Hide Details' : 'View Details'}
                      </Button>
                      <Button 
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                        onClick={() => setActiveModal(course)}
                      >
                        Full Analysis
                      </Button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50"
                      >
                        <div className="p-6 space-y-8">
                          {/* 1. Sections List (Performance Data) - MOVED TO TOP */}
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" /> Section Performance
                            </h4>
                            <div className="grid grid-cols-1 gap-3">
                              {sections.map((sec, idx) => {
                                const pr = Number(sec.pass_rate || 0);
                                const prog = String(sec.program || '').trim();
                                const progCode = prog.split(' ')[0] || 'Program';
                                const secName = sectionName(sec.program);
                                return (
                                  <div key={`${course}-${idx}`} className="rounded-xl border bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <Badge variant="secondary" className="px-2 py-0.5 text-xs">{progCode}</Badge>
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">Section {secName}</span>
                                      </div>
                                      <span className={`text-sm font-bold ${pr >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                                        {pr.toFixed(1)}% Pass
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-500 dark:text-gray-400">
                                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                                        <div className="block font-bold text-gray-900 dark:text-gray-200 text-sm">{Number(sec.enrolled || 0)}</div>
                                        Students
                                      </div>
                                      <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-2">
                                        <div className="block font-bold text-green-700 dark:text-green-400 text-sm">{Number(sec.passed || 0)}</div>
                                        Passed
                                      </div>
                                      <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-2">
                                        <div className="block font-bold text-red-700 dark:text-red-400 text-sm">{Number(sec.failed || Math.max(Number(sec.enrolled || 0) - Number(sec.passed || 0), 0))}</div>
                                        Failed
                                      </div>
                                    </div>
                                    <div className="mt-3">
                                      <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className={`${colorForRate(pr)} h-full`} style={{ width: `${Math.max(0, Math.min(100, pr))}%` }} />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 2. Internal Review Section - MOVED TO BOTTOM */}
                          <div className="pt-6 border-t border-dashed border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                              <Search className="w-4 h-4" /> Internal Review Findings
                            </h4>
                            
                            {reviews.length > 0 ? (
                              <div className="space-y-4">
                                {reviews.map((review, idx) => (
                                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    {/* Header */}
                                    <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="bg-white text-gray-600 border-gray-300">Finding #{idx + 1}</Badge>
                                        <span className="text-[10px] text-gray-400 uppercase font-medium">
                                          {new Date(review.created_at).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="p-5 flex flex-col gap-5">
                                      {/* Weakness Section */}
                                      <div className="flex gap-4">
                                        <div className="flex-shrink-0 mt-1">
                                          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                          </div>
                                        </div>
                                        <div className="flex-1">
                                          <h5 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wide mb-1">Observation (Weakness)</h5>
                                          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                                            {review.weakness || 'None identified'}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Action Taken Section */}
                                      <div className="flex gap-4">
                                        <div className="flex-shrink-0 mt-1">
                                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                          </div>
                                        </div>
                                        <div className="flex-1">
                                          <h5 className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">Intervention (Action Taken)</h5>
                                          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                                            {review.action_taken || 'None recorded'}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Recommendation Section */}
                                      <div className="flex gap-4">
                                        <div className="flex-shrink-0 mt-1">
                                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                            <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                          </div>
                                        </div>
                                        <div className="flex-1">
                                          <h5 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide mb-1">Path Forward (Recommendation)</h5>
                                          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                                            {review.recommendation || 'None provided'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-8 text-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-full mb-3">
                                  <Search className="w-5 h-5 text-gray-400" />
                                </div>
                                <p className="text-sm text-gray-500 font-medium">No internal review data available.</p>
                                <p className="text-xs text-gray-400 mt-1">Upload a Subject Accomplishment Report to see analysis here.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              );
            })}
          </div>

          <Dialog.Root open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/40" />
              <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-4xl max-h-[85vh] overflow-auto rounded-2xl bg-card border shadow-xl">
                {(() => {
                  const selected = filtered.find(f => f.course === activeModal) || grouped.find(f => f.course === activeModal);
                  if (!selected) return (
                    <div className="p-6">
                      <CardTitle>Subject Analysis</CardTitle>
                      <p className="text-muted-foreground">No data found.</p>
                    </div>
                  );
                  const { course, sections, totals, avgPassRate } = selected;
                  const chartData = sections.map(s => ({ name: sectionName(s.program), rate: Number(s.pass_rate || 0) }));
                  const summary = `Subject ${course} has an average pass rate of ${avgPassRate.toFixed(2)}% across ${sections.length} section(s). Total enrolled ${totals.enrolled}, passed ${totals.passed}, failed ${totals.failed}.`;
                  const recs = Array.from(new Set((sections || []).flatMap(s => String(s.recommendation || '').split(' | ').filter(Boolean))));
                  return (
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>Full Analysis  {course}</CardTitle>
                          <CardDescription>Charts, AI summary and recommendations</CardDescription>
                        </div>
                        <Button variant="outline" onClick={() => window.print()}>
                          Export as PDF
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="rounded-xl">
                          <CardHeader>
                            <CardTitle>Pass Rate by Section</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={260}>
                              <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip formatter={(value) => [`${value}%`, 'Pass Rate']} />
                                <Bar dataKey="rate" name="Pass Rate (%)" fill="#4f46e5" />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                        <Card className="rounded-xl">
                          <CardHeader>
                            <CardTitle>AI Summary</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm leading-6 text-muted-foreground whitespace-pre-wrap">{sanitizeText(summary)}</p>
                          </CardContent>
                        </Card>
                      </div>
                      {/* Recommendations: professional, academic styling with theme-aware background */}
                      {(() => {
                        const classifyRec = (text) => {
                          const t = String(text || '').toLowerCase();
                          if (/excellent|outstanding|strong|commendable|high|improved/.test(t)) return 'positive';
                          if (/improve|optimize|recommend|consider|suggest|review/.test(t)) return 'improve';
                          if (/weak|issue|risk|deficien|problem|concern|low/.test(t)) return 'weakness';
                          return 'neutral';
                        };
                        const extractTitleBody = (text) => {
                          const raw = sanitizeText(text);
                          const idxColon = raw.indexOf(':');
                          const idxDash = raw.indexOf(' - ');
                          const idxDot = raw.indexOf('.');
                          const idx = [idxColon, idxDash, idxDot].filter((x) => x > 0).sort((a,b)=>a-b)[0];
                          if (idx && idx > 0) {
                            return { title: raw.slice(0, idx).trim(), body: raw.slice(idx + 1).trim() };
                          }
                          return { title: raw.trim(), body: '' };
                        };
                        return (
                          <Card className="rounded-xl mt-6 mb-4 border border-gray-300 dark:border-gray-600 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                            <CardHeader>
                              <CardTitle>Recommendations</CardTitle>
                            </CardHeader>
                            <CardContent className="relative">
                              {recs.length === 0 ? (
                                <p className="text-sm text-gray-700 dark:text-gray-300">No recommendations available.</p>
                              ) : (
                                <div className="max-h-[500px] overflow-y-auto pr-2">
                                  <div className="space-y-3">
                                    {recs.slice(0, 12).map((r, i) => {
                                      const { title, body } = extractTitleBody(r);
                                      const type = classifyRec(r);
                                      const leftBorder =
                                        type === 'positive' ? 'border-green-500' :
                                        type === 'improve' ? 'border-yellow-500' :
                                        type === 'weakness' ? 'border-red-500' : 'border-gray-400';
                                      const altBg = i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700';
                                      return (
                                        <div
                                          key={`rec-${i}`}
                                          className={`p-4 rounded-xl border-l-4 ${leftBorder} ${altBg} transition-all duration-200 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800`}
                                        >
                                          <p className="text-indigo-700 dark:text-indigo-300 font-semibold text-base">{title}</p>
                                          {body && (
                                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{body}</p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              {/* bottom fade overlay for long content */}
                              {recs.length > 8 && (
                                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-100 dark:from-gray-800 to-transparent" />
                              )}
                            </CardContent>
                          </Card>
                        );
                      })()}
                      <div className="flex justify-end">
                        <Dialog.Close asChild>
                          <Button variant="ghost">Close</Button>
                        </Dialog.Close>
                      </div>
                    </div>
                  );
                })()}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

        </motion.div>
      </main>
    </div>
  );
};

export default Subjects;
