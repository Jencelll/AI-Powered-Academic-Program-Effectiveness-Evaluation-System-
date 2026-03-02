// src/pages/Analysis.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/NavBar';
import Sidebar from '../components/Sidebar';
import AnalyticsCharts from '../components/AnalyticsCharts';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { fetchAnalysis, fetchDetailedAnalytics, fetchDashboardData, fetchAnalysisByFaculty } from '../services/api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useAcademicYear } from '../context/AcademicYearContext';
import { formatAcademicYearRange, getYearFromUpload, sortByAcademicYear } from '../utils/academicYear';
import { ChevronDown, ChevronUp } from 'lucide-react';

const useIsDark = () => {
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains('dark') ||
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
  useEffect(() => {
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

const Analysis = () => {
  const [analyticsData, setAnalyticsData] = useState({
    metrics: {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1_weighted: 0,
      f1_macro: 0,
    },
    subjects: [],
    categories: [],
    analytics: [],
  });
  // Theme: compute once per render (avoid calling hooks inside JSX callbacks)
  const isDark = useIsDark();

  // NEW: State for detailed analytics output
  const [detailedAnalytics, setDetailedAnalytics] = useState('');
  const [faculties, setFaculties] = useState([]);
  const [openFaculties, setOpenFaculties] = useState({});
  // Persist selection for Summary Overview page
  const [summarySelection, setSummarySelection] = useState(() => {
    try {
      const raw = localStorage.getItem('summarySelectedUploads');
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Page display toggle: hide global sections and show only faculty blocks
  const showGlobalSections = false;

  // Sanitize AI-generated text for formal, academic tone (remove emojis and raw logs)
  const sanitizeAcademicText = (src) => {
    let out = String(src || '');
    // Remove all emojis/decorative unicode pictographs
    out = out.replace(/[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u2600-\u26FF]/gu, '');
    // Remove undesirable raw system/log lines (match anywhere, not just line start)
    out = out.replace(/(GENERATING VISUALIZATIONS\.{3}|PERFORMANCE BY SUBJECT CATEGORY\.{3}|ADVANCED ANALYTICS AND SPECIFIC VISUALIZATIONS|PRECISION, ACCURACY, F1\-SCORE CALCULATION)/gmi, '');
    out = out.replace(/\bAnalysis\b[^\n]*/gmi, '');
    // Remove boilerplate and analysis narrative phrases wherever they appear
    out = out.replace(/This summary was generated[^\n]*/gmi, '');
    out = out.replace(/Analyzing detailed metrics[^\n]*/gmi, '');
    out = out.replace(/Found\s+\d+\s+students[^\n]*/gmi, '');
    out = out.replace(/After parsing grades[^\n]*/gmi, '');
    out = out.replace(/Error processing[^\n]*/gmi, '');
    out = out.replace(/Cannot generate predictive model[^\n]*/gmi, '');
    out = out.replace(/Reason:[^\.]*\./gmi, '');
    out = out.replace(/Pass Rates by Gender[^\n]*/gmi, '');
    out = out.replace(/Class\-specific Metrics[^\n]*/gmi, '');
    out = out.replace(/Class\s+\d+[^\n]*/gmi, '');
    // Remove inline metrics like Accuracy/Precision/Recall/F1 wherever they appear
    out = out.replace(/\b(Accuracy|Weighted Precision|Weighted Recall|Weighted F1\-Score|Macro F1\-Score|Precision|Recall|F1\-Score)\s*:\s*[\d\.]+\b/gmi, '');
    // Remove enumerated list lines like "1. ..."
    out = out.replace(/^\d+\.\s+.*$/gmi, '');
    // Clean leftover extra spaces created by removals
    out = out.replace(/\s{2,}/g, ' ');
    // Collapse excessive blank lines
    out = out.replace(/\n{3,}/g, '\n\n');
    return out.trim();
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch overall analysis for global charts
        const analysis = await fetchAnalysis();
        // Fetch grouped analytics by faculty
        const byFaculty = await fetchAnalysisByFaculty();
        setFaculties(byFaculty.faculties || []);

        // Dashboard metrics
        const dashboard = await fetchDashboardData();
        const latest = dashboard?.latest_metrics || {};
        const safeMetrics = {
          accuracy: Number(latest.accuracy || 0),
          precision: Number(latest.precision || 0),
          recall: Number(latest.recall || 0),
          f1_weighted: Number(latest.f1_weighted || 0),
          f1_macro: Number(latest.f1_macro || 0),
        };

        // Store combined analytics and metrics for global sections
        setAnalyticsData({
          metrics: safeMetrics,
          subjects: analysis?.subjects || [],
          categories: analysis?.categories || [],
          analytics: analysis?.analytics || [],
        });

        // NEW: Fetch the detailed analytics output
        const detailedData = await fetchDetailedAnalytics();
        setDetailedAnalytics(detailedData);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching analysis data: ', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Academic Year filtering and sorting
  const { sortOrder, setSortOrder, selectedYear, setSelectedYear, availableYears, setAvailableYears, reset } = useAcademicYear();

  // Populate available years now that NavBar no longer manages them
  useEffect(() => {
    let mounted = true;
    fetchAnalysisByFaculty().then((res) => {
      if (!mounted) return;
      const yrs = Array.from(new Set((res?.faculties || []).map((f) => getYearFromUpload(f)).filter(Boolean))).sort((a, b) => b - a);
      setAvailableYears(yrs);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [setAvailableYears]);
  const filteredFaculties = useMemo(() => {
    const base = (faculties || []).filter((f) => {
      if (selectedYear === 'All') return true;
      const y = getYearFromUpload(f);
      return String(y) === String(selectedYear);
    });
    return sortByAcademicYear(base, sortOrder, getYearFromUpload);
  }, [faculties, sortOrder, selectedYear]);

  const isSelected = (id) => summarySelection.includes(String(id));
  const toggleSelect = (id, checked) => {
    const next = new Set(summarySelection.map(String));
    if (checked) next.add(String(id)); else next.delete(String(id));
    const arr = Array.from(next);
    setSummarySelection(arr);
    try { localStorage.setItem('summarySelectedUploads', JSON.stringify(arr)); } catch {}
  };

  // Helper parsers for per-faculty sections
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
      return { name: parts[0] || '', course: parts[1] || '', status: (parts[2] || '').toUpperCase() };
    });
  };

  const parseMultipleIssuesFromText = (text) => {
    const afterHeader = (text.split('STUDENTS WITH MULTIPLE ISSUES')[1] || text.split(' STUDENTS WITH MULTIPLE ISSUES')[1] || '');
    const section = (afterHeader.split(' AI PREDICTED HIGH-RISK STUDENTS')[0] || '').trim();
    const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
    const message = lines.find(l => /No students/i.test(l)) || '';
    const students = [];
    let current = null;
    lines.forEach(l => {
      if (/^•\s*/.test(l) || /subjects with issues/i.test(l)) {
        const cleaned = l.replace(/^•\s*/, '');
        const parts = cleaned.split(' - ');
        const name = (parts[0] || '').trim();
        const countMatch = (parts[1] || '').match(/(\d+)\s*subjects\s*with\s*issues/i);
        current = { name, issueCount: countMatch ? Number(countMatch[1]) : null, issues: [] };
        students.push(current);
      } else if (/^-\s*/.test(l)) {
        if (!current) return;
        const item = l.replace(/^-+\s*/, '');
        const [coursePart, statusPartRaw] = item.split(':');
        const course = (coursePart || '').trim();
        const statusPart = (statusPartRaw || '').trim();
        const m = statusPart.match(/([0-9A-Za-z\.]+)\s*\(([^)]+)\)/);
        const grade = m ? m[1] : statusPart;
        const status = m ? m[2] : '';
        current.issues.push({ course, grade, status });
      }
    });
    return { message, list: students };
  };

  // Utilities for faculty AI summary formatting
  const formatPercent = (val) => `${Number(val || 0).toFixed(2)}%`;
  const aggregateSubjectsByName = (subjects) => {
    const map = new Map();
    (subjects || []).forEach((s) => {
      const key = String(s.name || s.course || '').trim();
      if (!key) return;
      const enrolled = Number(s.enrolled || 0);
      const passed = Number(s.passed || Math.round(enrolled * Number(s.passRate || 0) / 100));
      const failed = Number(s.failed || Math.max(enrolled - passed, 0));
      const deficiencies = Number(s.deficiencies || 0);
      const prev = map.get(key) || { name: key, enrolled: 0, passed: 0, failed: 0, deficiencies: 0 };
      prev.enrolled += enrolled;
      prev.passed += passed;
      prev.failed += failed;
      prev.deficiencies += deficiencies;
      map.set(key, prev);
    });
    return Array.from(map.values()).map((row) => ({
      ...row,
      passRate: row.enrolled > 0 ? (row.passed / row.enrolled) * 100 : 0,
    }));
  };
  const parseGenderFromText = (text) => {
    const maleMatch = text.match(/Male\s+Students:\s*(\d+)/i);
    const femaleMatch = text.match(/Female\s+Students:\s*(\d+)/i);
    const totalMatch = text.match(/Total\s+Students:\s*(\d+)/i);
    const maleRateMatch = text.match(/Male[:\s]+([\d\.]+)%/i);
    const femaleRateMatch = text.match(/Female[:\s]+([\d\.]+)%/i);
    const male = maleMatch ? Number(maleMatch[1]) : null;
    const female = femaleMatch ? Number(femaleMatch[1]) : null;
    const total = totalMatch ? Number(totalMatch[1]) : (male != null && female != null ? male + female : null);
    const maleRate = maleRateMatch ? Number(maleRateMatch[1]) : null;
    const femaleRate = femaleRateMatch ? Number(femaleRateMatch[1]) : null;
    if (male == null && female == null && total == null && maleRate == null && femaleRate == null) return null;
    return { male, female, total, maleRate, femaleRate };
  };

  // Parse gender stats from detailed output
  const genderStats = useMemo(() => {
    const text = detailedAnalytics || '';
    const maleMatch = text.match(/Male Students:\s*(\d+)/i);
    const femaleMatch = text.match(/Female Students:\s*(\d+)/i);
    const totalMatch = text.match(/Total Students:\s*(\d+)/i);
    const expectedMatch = text.match(/Expected Total \(from file\):\s*(\d+)/i);
    const maleRateMatch = text.match(/Male:\s*([\d\.]+)%/i);
    const femaleRateMatch = text.match(/Female:\s*([\d\.]+)%/i);
    return {
      male: maleMatch ? Number(maleMatch[1]) : 0,
      female: femaleMatch ? Number(femaleMatch[1]) : 0,
      total: totalMatch ? Number(totalMatch[1]) : 0,
      expectedTotal: expectedMatch ? Number(expectedMatch[1]) : 0,
      maleRate: maleRateMatch ? Number(maleRateMatch[1]) : 0,
      femaleRate: femaleRateMatch ? Number(femaleRateMatch[1]) : 0,
    };
  }, [detailedAnalytics]);

  // Parse Top Performing Sections by Gender from detailed output
  const topSectionsByGender = useMemo(() => {
    const text = detailedAnalytics || '';
    const parseLines = (sectionText) => {
      return sectionText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith(''))
        .map(line => {
          const m = line.match(/^\s*(.*?)\s*-\s*(.*?):\s*([\d\.]+)%/i);
          if (m) {
            return { section: m[1], course: m[2], rate: Number(m[3]) };
          }
          // Fallback: try without colon percentage
          const m2 = line.match(/^\s*(.*?)\s*-\s*(.*?)\s*-\s*([\d\.]+)%/i);
          if (m2) {
            return { section: m2[1], course: m2[2], rate: Number(m2[3]) };
          }
          return { raw: line };
        })
        .slice(0, 5);
    };
    const maleSection = (text.split('Top Performing Sections for Males:')[1] || '').split('Top Performing Sections for Females:')[0] || '';
    const femaleSection = text.split('Top Performing Sections for Females:')[1] || '';
    return {
      males: parseLines(maleSection),
      females: parseLines(femaleSection),
    };
  }, [detailedAnalytics]);

  // Parse high-risk students (strictly rows only; exclude raw logs and next sections)
  const highRiskStudents = useMemo(() => {
    const text = detailedAnalytics || '';
    let section = (text.split('AI PREDICTED HIGH-RISK STUDENTS:')[1] || text.split(' AI PREDICTED HIGH-RISK STUDENTS:')[1] || '');
    // Stop at the next known section header to avoid including logs
    section = (section.split('FAILED STUDENTS')[0] || section)
      .split('INCOMPLETE STUDENTS')[0]
      .split('STUDENTS WITH MULTIPLE ISSUES')[0]
      .split('Summary of Findings')[0]
      .split('ADVANCED ANALYTICS')[0]
      .split('PRECISION, ACCURACY')[0];

    const lines = section
      .split('\n')
      .map((l) => l.trim())
      // keep only lines that look like: Name - COURSE - Reason
      .filter((l) => /\s-\s/.test(l) && l.split(' - ').length >= 3);

    return lines.map((line) => {
      const parts = line.replace(/^\s*/, '').split(' - ');
      const name = parts[0] || '';
      const course = parts[1] || '';
      const reasonRaw = (parts.slice(2).join(' - ') || '').replace(/High risk due to:\s*/i, '');
      const reason = sanitizeAcademicText(reasonRaw);
      return { name, course, reason };
    });
  }, [detailedAnalytics]);

  // Parse Failed Students
  const failedStudents = useMemo(() => {
    const text = detailedAnalytics || '';
    const afterFailed = (text.split('FAILED STUDENTS')[1] || text.split('FAILED STUDENTS (5.00 or FAILED)')[1] || '');
    const section = (afterFailed.split('INCOMPLETE STUDENTS')[0] || afterFailed.split(' INCOMPLETE STUDENTS')[0] || '').trim();
    const lines = section
      .split('\n')
      .map(l => l.trim())
      .filter(l => /\s-\s/.test(l) && l.split(' - ').length >= 3);
    return lines.map(line => {
      //  Name - COURSE - 5.00 or FAILED
      const parts = line.replace(/^\s*/, '').split(' - ');
      const name = parts[0] || '';
      const course = parts[1] || '';
      const value = (parts[2] || '').toUpperCase();
      return { name, course, value };
    });
  }, [detailedAnalytics]);

  // Parse Incomplete Students
  const incompleteStudents = useMemo(() => {
    const text = detailedAnalytics || '';
    const afterInc = (text.split('INCOMPLETE STUDENTS')[1] || text.split(' INCOMPLETE STUDENTS')[1] || '');
    const section = (afterInc.split('STUDENTS WITH MULTIPLE ISSUES')[0] || afterInc.split(' STUDENTS WITH MULTIPLE ISSUES')[0] || afterInc.split(' AI PREDICTED HIGH-RISK STUDENTS')[0] || '').trim();
    const lines = section
      .split('\n')
      .map(l => l.trim())
      .filter(l => /\s-\s/.test(l) && l.split(' - ').length >= 3);
    return lines.map(line => {
      //  Name - COURSE - INC or INCOMPLETE
      const parts = line.replace(/^\s*/, '').split(' - ');
      const name = parts[0] || '';
      const course = parts[1] || '';
      const status = (parts[2] || '').toUpperCase();
      return { name, course, status };
    });
  }, [detailedAnalytics]);

  // Parse Students with Multiple Issues (may be none)
  const multipleIssues = useMemo(() => {
    const text = detailedAnalytics || '';
    const afterHeader = (text.split('STUDENTS WITH MULTIPLE ISSUES')[1] || text.split(' STUDENTS WITH MULTIPLE ISSUES')[1] || '');
    const section = (afterHeader.split(' AI PREDICTED HIGH-RISK STUDENTS')[0] || '').trim();
    const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
    const message = lines.find(l => /No students/i.test(l)) || '';

    const students = [];
    let current = null;
    lines.forEach(l => {
      // Summary line: • Name - N subjects with issues
      if (/^•\s*/.test(l) || /subjects with issues/i.test(l)) {
        const cleaned = l.replace(/^•\s*/, '');
        const parts = cleaned.split(' - ');
        const name = (parts[0] || '').trim();
        const countMatch = (parts[1] || '').match(/(\d+)\s*subjects\s*with\s*issues/i);
        current = { name, issueCount: countMatch ? Number(countMatch[1]) : null, issues: [] };
        students.push(current);
      } else if (/^-\s*/.test(l)) {
        // Detail line: - COURSE: GRADE (STATUS)
        if (!current) return;
        const item = l.replace(/^-+\s*/, '');
        const [coursePart, statusPartRaw] = item.split(':');
        const course = (coursePart || '').trim();
        const statusPart = (statusPartRaw || '').trim();
        const m = statusPart.match(/([0-9A-Za-z\.]+)\s*\(([^)]+)\)/);
        const grade = m ? m[1] : statusPart;
        const status = m ? m[2] : '';
        current.issues.push({ course, grade, status });
      }
    });

    return { message, list: students };
  }, [detailedAnalytics]);

  // Summary of Findings (AI Generated) with robust fallbacks
  const summaryOfFindings = useMemo(() => {
    const text = detailedAnalytics || '';
    const enrolledMatch =
      text.match(/total of\s*(\d+)\s*students\s*are\s*enrolled/i) ||
      text.match(/Total Students:\s*(\d+)/i);
    const atRiskMatch = text.match(/(\d+)\s*students\s*flagged\s*as\s*'?At Risk'?/i);
    const passRateMatch = text.match(/overall\s+average\s+pass\s+rate\s+is\s*([\d\.]+)%/i);
    const failRateMatch = text.match(/fail\s+rate\s+is\s*([\d\.]+)%/i);
    const deficienciesMatch = text.match(/(\d+)\s*academic\s*deficiencies/i);

    const totals = (analyticsData.subjects || []).reduce(
      (acc, s) => {
        const enrolled = Number(s.enrolled || 0);
        const passed = Number(s.passed || Math.round(enrolled * Number(s.passRate || 0) / 100));
        const failed = Number(s.failed || Math.max(enrolled - passed, 0));
        acc.enrolled += enrolled;
        acc.passed += passed;
        acc.failed += failed;
        acc.deficiencies += Number(s.deficiencies || 0);
        return acc;
      },
      { enrolled: 0, passed: 0, failed: 0, deficiencies: 0 }
    );

    const computedPassRate = totals.enrolled > 0 ? (totals.passed / totals.enrolled) * 100 : 0;
    const computedFailRate = totals.enrolled > 0 ? (totals.failed / totals.enrolled) * 100 : 0;

    return {
      enrolled: enrolledMatch ? Number(enrolledMatch[1]) : totals.enrolled,
      atRisk: atRiskMatch ? Number(atRiskMatch[1]) : totals.failed,
      passRate: passRateMatch ? Number(passRateMatch[1]) : computedPassRate,
      failRate: failRateMatch ? Number(failRateMatch[1]) : computedFailRate,
      deficiencies: deficienciesMatch ? Number(deficienciesMatch[1]) : totals.deficiencies,
    };
  }, [detailedAnalytics, analyticsData.subjects]);

  // Extract or synthesize the Summary of Findings text block
  const summaryText = useMemo(() => {
    const text = detailedAnalytics || '';
    const match = text.match(/Summary of Findings \(AI Generated\):[\s\S]*?(?=\n{2,}|$)/i);
    if (match && match[0]) {
      return match[0].trim();
    }
    // Fallback synthesized text using computed values
    const pass = Number(summaryOfFindings.passRate || 0).toFixed(2);
    const fail = Number(summaryOfFindings.failRate || 0).toFixed(1);
    return (
      `Summary of Findings (AI Generated):\n` +
      `================================================================================\n` +
      `Based on the uploaded class records and the deficiency report, a total of ${summaryOfFindings.enrolled} students are enrolled. ` +
      `There are ${summaryOfFindings.atRisk} students flagged as 'At Risk' (Failed), representing ${fail}% of the cohort. ` +
      `The overall average pass rate is ${pass}%, and the fail rate is ${fail}%. ` +
      `Additionally, ${summaryOfFindings.deficiencies} academic deficiencies were recorded. ` +
      `This summary was generated by processing the Class Academic Profile and Deficiency Report.`
    );
  }, [detailedAnalytics, summaryOfFindings]);

  // Cleaned body text (remove heading and separators for professional display)
  const summaryBodyText = useMemo(() => {
    const src = (summaryText) || '';
    const cleaned = src
      .replace(/Summary of Findings \(AI Generated\):\s*/i, '')
      .replace(/^=+\s*$/gm, '')
      .trim();

    // Exclude non-summary sections by stopping at known markers
    const lines = cleaned.split('\n');
    const stopMarkerRegexes = [
      /^(?:\u{1F680}|Launch)/, // 
      /^(?:\u{1F50D}|Search)/, // 
      /^(?:\u{1F4CA}|Analysis)/, // 
      /^-{3,}\s*$/,
      /^Class-specific Metrics/i,
      /^ADVANCED ANALYTICS AND SPECIFIC VISUALIZATIONS/i,
      /^PRECISION, ACCURACY, F1-SCORE CALCULATION/i,
    ];
    const kept = [];
    for (const line of lines) {
      if (stopMarkerRegexes.some((rx) => rx.test(line))) break;
      kept.push(line);
    }
    let result = kept.join('\n').trim();
    // If technical phrases still appear inline, cut the text at the end of the formal paragraph
    const trunc = result.match(/^[\s\S]*?academic deficiencies were recorded\./i);
    if (trunc && trunc[0]) {
      result = trunc[0];
    }
    return sanitizeAcademicText(result.length > 0 ? result : cleaned);
  }, [summaryText]);

  // Optional: Extract recommendations in plain text if available
  const recommendationsText = useMemo(() => {
    const text = detailedAnalytics || '';
    const match = text.match(/Recommendations:\s*([\s\S]*?)(?=\n{2,}|$)/i);
    if (!match) return '';
    return sanitizeAcademicText(match[1].trim());
  }, [detailedAnalytics]);

  // Performance by Subject Category (computed summary)
  const categoryPerformance = useMemo(() => {
    const subjects = analyticsData.subjects || [];
    const groups = {};
    subjects.forEach((s) => {
      const cat = s.category || 'Uncategorized';
      const enrolled = Number(s.enrolled || 0);
      const passed = Number(s.passed || Math.round(enrolled * Number(s.passRate || 0) / 100));
      const failed = Number(s.failed || Math.max(enrolled - passed, 0));
      const deficiencies = Number(s.deficiencies || 0);
      if (!groups[cat]) {
        groups[cat] = { count: 0, enrolled: 0, passed: 0, failed: 0, deficiencies: 0 };
      }
      groups[cat].count += 1;
      groups[cat].enrolled += enrolled;
      groups[cat].passed += passed;
      groups[cat].failed += failed;
      groups[cat].deficiencies += deficiencies;
    });
    const rows = Object.entries(groups).map(([category, g]) => ({
      category,
      enrolled: g.enrolled,
      avgPassRate: g.enrolled > 0 ? (g.passed / g.enrolled) * 100 : 0,
      deficiencies: g.deficiencies,
    }));
    return rows.sort((a, b) => b.avgPassRate - a.avgPassRate);
  }, [analyticsData.subjects]);

  // Compute Weak/Strong subjects based on pass rates and enrolled
  const subjectStrengths = useMemo(() => {
    const subjects = analyticsData.subjects || [];
    const withCounts = subjects.map((s) => {
      const enrolled = Number(s.enrolled || 0);
      const passRate = Number(s.passRate || 0);
      const passed = Math.round((enrolled * passRate) / 100);
      const failed = Math.max(enrolled - passed, 0);
      return { ...s, enrolled, passRate, passed, failed };
    });
    const sorted = [...withCounts].sort((a, b) => a.passRate - b.passRate);
    const weak = sorted.slice(0, Math.min(3, sorted.length));
    const strong = sorted.slice(Math.max(sorted.length - 3, 0)).sort((a, b) => b.passRate - a.passRate);
    return { weak, strong };
  }, [analyticsData.subjects]);

  // Gender pass rate comparison chart data
  const genderRateData = useMemo(() => {
    const maleRate = Number(genderStats.maleRate || 0);
    const femaleRate = Number(genderStats.femaleRate || 0);
    const totals = (analyticsData.subjects || []).reduce(
      (acc, s) => {
        acc.passed += Number(s.passed || Math.round(Number(s.enrolled || 0) * Number(s.passRate || 0) / 100));
        acc.enrolled += Number(s.enrolled || 0);
        return acc;
      },
      { passed: 0, enrolled: 0 }
    );
    const overallRate = totals.enrolled > 0 ? (totals.passed / totals.enrolled) * 100 : 0;
    return [
      { name: 'Males', rate: maleRate },
      { name: 'Females', rate: femaleRate },
      { name: 'Overall', rate: overallRate },
    ];
  }, [genderStats, analyticsData.subjects]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-destructive">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-indigo-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="flex gap-6">
          <Sidebar />
          <main className="flex-1 py-6 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white p-6 rounded-2xl shadow-md">
            <h1 className="text-2xl font-bold">CCS Academic Analytics Dashboard</h1>
            <p className="text-sm opacity-90">Institutional, trustworthy analytics with clear hierarchy and visuals.</p>
          </div>

          {/* Academic Year Controls (page-level) */}
          <div className="mt-4 mb-2 flex items-center gap-3">
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
              {["All", ...((availableYears || []))].map((y) => (
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

              {/* Metrics Cards with gradient progress bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {[
                  { label: 'Accuracy', value: analyticsData.metrics.accuracy, grad: 'from-indigo-500 to-blue-500 dark:from-indigo-400 dark:to-blue-400' },
                  { label: 'Precision', value: analyticsData.metrics.precision, grad: 'from-sky-500 to-blue-600 dark:from-sky-400 dark:to-blue-500' },
                  { label: 'Recall', value: analyticsData.metrics.recall, grad: 'from-green-500 to-emerald-500 dark:from-green-400 dark:to-emerald-400' },
                  { label: 'F1-Weighted', value: analyticsData.metrics.f1_weighted, grad: 'from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400' },
                  { label: 'F1-Macro', value: analyticsData.metrics.f1_macro, grad: 'from-purple-500 to-violet-600 dark:from-purple-400 dark:to-violet-500' },
                ].map(({ label, value, grad }) => {
                  const pct = Math.max(0, Math.min(100, Number(value) * 100));
                  return (
                    <Card
                      key={label}
                      className="bg-white/90 backdrop-blur-sm shadow-md border border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 rounded-2xl p-5 transition hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]"
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-700 dark:text-gray-300">{label}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pct.toFixed(2)}%</div>
                        <div className="mt-2 h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-2 bg-gradient-to-r ${grad} transition-all duration-700 ease-out`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Charts Section (render once to show all charts) */}
              {showGlobalSections && (
                <Card className="rounded-2xl bg-white/90 backdrop-blur-sm shadow-md border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle>Data Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AnalyticsCharts subjectData={analyticsData.subjects || []} categoryData={analyticsData.categories || []} />
                  </CardContent>
                </Card>
              )}

              {/* Summary of Findings - moved below High-Risk Students */}

              {/* Faculty Analytics (grouped by faculty) */}
              <div className="mt-6 space-y-6 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-6">
                {filteredFaculties.length === 0 ? (
                  <Card className="rounded-2xl bg-white/90 backdrop-blur-sm shadow-md border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader>
                      <CardTitle>Faculty Analytics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-muted-foreground">No faculty uploads found.</div>
                    </CardContent>
                  </Card>
                ) : (
                  filteredFaculties.map((f, idx) => {
                    const failedF = parseFailedFromText(String(f.detailed_output || ''));
                    const incompleteF = parseIncompleteFromText(String(f.detailed_output || ''));
                    const multiF = parseMultipleIssuesFromText(String(f.detailed_output || ''));
                    const summary = f.summary || {};
                    const subjectCount = (f.subjects || []).length;
                    const subjectsAgg = aggregateSubjectsByName(f.subjects || []);
                    const weakSubjectsF = subjectsAgg.slice().sort((a, b) => a.passRate - b.passRate).slice(0, Math.min(3, subjectsAgg.length));
                    const strongSubjectsF = subjectsAgg.slice().sort((a, b) => b.passRate - a.passRate).slice(0, Math.min(3, subjectsAgg.length));
                    const genderF = parseGenderFromText(String(f.detailed_output || ''));
                    const genderRateDataF = genderF
                      ? [
                          { name: 'Males', rate: Number(genderF.maleRate || 0) },
                          { name: 'Females', rate: Number(genderF.femaleRate || 0) },
                          { name: 'Overall', rate: Number(summary.pass_rate || 0) },
                        ]
                      : [];
                    const atRiskCount = (() => {
                      const names = new Set([
                        ...failedF.map(x => String(x.name || '').trim()),
                        ...incompleteF.map(x => String(x.name || '').trim()),
                        ...(multiF.list || []).map(x => String(x.name || '').trim()),
                      ].filter(Boolean));
                      return names.size;
                    })();
                    const metricsItem = (f.analytics || []).find((a) => a.data_type === 'precision_recall_f1');
                    const metricsF = metricsItem && metricsItem.content ? metricsItem.content : {};
                    const isOpen = Boolean(openFaculties[f.upload_id || idx]);
                    const toggleOpen = () => {
                      setOpenFaculties(prev => ({
                        ...prev,
                        [f.upload_id || idx]: !isOpen,
                      }));
                    };
                    return (
                      <motion.div key={f.upload_id || idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                        <Card
                          className="bg-white/70 backdrop-blur-sm border border-white/50 dark:bg-gray-800/60 dark:border-gray-700/50 dark:text-gray-100 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 hover:scale-[1.01]"
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <CardTitle className="text-xl font-bold tracking-tight text-indigo-900 dark:text-white">
                                  {f.faculty_name || 'Unknown'}
                                </CardTitle>
                                <p className="text-xs text-gray-700 dark:text-gray-300">
                                  {subjectCount} subjects analyzed • {atRiskCount} students at risk • Pass rate <span className="font-semibold text-green-600 dark:text-green-400">{Number(summary.pass_rate || 0).toFixed(2)}%</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Collapse/Expand button */}
                                <button
                                  type="button"
                                  onClick={toggleOpen}
                                  aria-label={isOpen ? 'Collapse' : 'Expand'}
                                  className="h-7 w-7 inline-flex items-center justify-center rounded-full border bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 hover:bg-white hover:shadow-sm transition"
                                >
                                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              {/* Stylish toggle */}
                              <label className="flex items-center gap-2 text-xs select-none">
                                <span className="text-gray-700 dark:text-gray-300">Send to Summary Overview</span>
                                <input
                                  type="checkbox"
                                  className="peer sr-only"
                                  checked={isSelected(f.upload_id || idx)}
                                  onChange={(e) => toggleSelect(f.upload_id || idx, e.target.checked)}
                                />
                                <span className="relative inline-flex h-5 w-9 rounded-full bg-gray-300 peer-checked:bg-indigo-600 transition-colors">
                                  <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                                </span>
                              </label>
                              {/* Date */}
                              <span className="text-xs text-gray-700 dark:text-gray-300">
                                {f.analysis_date ? new Date(f.analysis_date).toLocaleString() : ''}
                              </span>
                              {/* Academic Year Badge */}
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700 border border-indigo-200">
                                A.Y. {formatAcademicYearRange(getYearFromUpload(f))}
                              </span>
                            </div>
                            {/* Stats header grid */}
                            <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-4">
                              {[
                                { label: 'Pass Rate', value: `${Number(summary.pass_rate || 0).toFixed(2)}%` },
                                { label: 'Fail Rate', value: `${Number(summary.fail_rate || 0).toFixed(2)}%` },
                                { label: 'Enrolled', value: summary.enrolled },
                                { label: 'Passed', value: summary.passed },
                                { label: 'Failed', value: summary.failed },
                              ].map((m, i) => (
                                <div key={`hdr-${i}`} className="p-3 rounded-xl border border-white/60 dark:border-gray-700/60 bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 transition">
                                  <p className="text-[10px] uppercase text-gray-500 dark:text-gray-300 font-medium tracking-wide">{m.label}</p>
                                  <p className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    {m.value}
                                    {m.label === 'Pass Rate' && (
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${Number(summary.pass_rate || 0) >= 80 ? 'bg-green-100 text-green-700' : Number(summary.pass_rate || 0) >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                        {Number(summary.pass_rate || 0) >= 80 ? 'Excellent' : Number(summary.pass_rate || 0) >= 70 ? 'Average' : 'At Risk'}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </CardHeader>
                        <CardContent>
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                            transition={{ duration: 0.25 }}
                            style={{ overflow: 'hidden' }}
                          >
                          {/* Performance summary */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                            {[
                              { label: 'Enrolled', value: summary.enrolled },
                              { label: 'Passed', value: summary.passed },
                              { label: 'Failed', value: summary.failed },
                              { label: 'Pass Rate', value: `${Number(summary.pass_rate || 0).toFixed(2)}%` },
                              { label: 'Fail Rate', value: `${Number(summary.fail_rate || 0).toFixed(2)}%` },
                            ].map((m, i) => (
                              <div key={`m-${i}`} className="p-3 rounded-xl border">
                                <p className="text-xs text-muted-foreground">{m.label}</p>
                                <p className="text-lg font-semibold">{m.value}</p>
                              </div>
                            ))}
                          </div>

                          {/* Removed Accuracy/Precision/Recall/F1 metrics per design request */}

                          {/* Subjects handled */}
                          <div className="mb-6">
                            <h4 className="text-md font-semibold mb-2">Subjects Handled</h4>
                            {(f.subjects || []).length === 0 ? (
                              <div className="text-muted-foreground">No subjects found for this faculty.</div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {(f.subjects || []).map((s, si) => (
                                  <div key={`sub-${si}`} className="p-3 rounded-xl border">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">{s.name}</span>
                                      <Badge variant={Number(s.passRate || 0) >= 80 ? 'default' : Number(s.passRate || 0) >= 70 ? 'secondary' : 'destructive'}>
                                        {Number(s.passRate || 0).toFixed(2)}%
                                      </Badge>
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      Enrolled: {s.enrolled} • Passed: {s.passed} • Failed: {s.failed}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Charts for this faculty */}
                          <Card className="rounded-2xl mb-6">
                            <CardHeader>
                              <CardTitle>Data Analytics (Faculty)</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <AnalyticsCharts subjectData={f.subjects || []} categoryData={f.categories || []} />
                            </CardContent>
                          </Card>

                          {/* Subject Strengths & Weaknesses (Faculty) */}
                          <div className="grid grid-cols-1 gap-6 mt-2">
                            <Card className="rounded-2xl">
                              <CardHeader>
                                <CardTitle>Weak Subjects (Lowest Pass Rates)</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {weakSubjectsF.length === 0 ? (
                                  <div className="text-muted-foreground">No subjects available.</div>
                                ) : (
                                  <ul className="space-y-3">
                                    {weakSubjectsF.map((s, i) => (
                                      <li key={`weakF-${s.name}-${i}`} className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <span className="font-medium">{s.name}</span>
                                          <span className="text-muted-foreground">  {formatPercent(s.passRate)} pass rate</span>
                                        </div>
                                        <div className="text-sm">
                                          <Badge variant="destructive">{s.failed} failed</Badge>
                                          <span className="text-muted-foreground ml-2">out of {s.enrolled}</span>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                              <CardHeader>
                                <CardTitle>Strong Subjects (Highest Pass Rates)</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {strongSubjectsF.length === 0 ? (
                                  <div className="text-muted-foreground">No subjects available.</div>
                                ) : (
                                  <ul className="space-y-3">
                                    {strongSubjectsF.map((s, i) => (
                                      <li key={`strongF-${s.name}-${i}`} className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <span className="font-medium">{s.name}</span>
                                          <span className="text-muted-foreground">  {formatPercent(s.passRate)} pass rate</span>
                                        </div>
                                        <div className="text-sm">
                                          <Badge variant="default">{s.passed} passed</Badge>
                                          <span className="text-muted-foreground ml-2">out of {s.enrolled}</span>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </CardContent>
                            </Card>
                          </div>

                          {/* Gender Analysis (Faculty) */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                            <Card className="rounded-2xl">
                              <CardHeader>
                                <CardTitle>Gender Distribution</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {!genderF ? (
                                  <div className="text-muted-foreground">No gender data available for this faculty.</div>
                                ) : (
                                  <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                      <p className="text-sm text-muted-foreground">Male</p>
                                      <p className="text-xl font-semibold">{genderF.male ?? 0}</p>
                                      {genderF.maleRate != null && <Badge variant="secondary">{formatPercent(genderF.maleRate)}</Badge>}
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Female</p>
                                      <p className="text-xl font-semibold">{genderF.female ?? 0}</p>
                                      {genderF.femaleRate != null && <Badge>{formatPercent(genderF.femaleRate)}</Badge>}
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Total</p>
                                      <p className="text-xl font-semibold">{genderF.total ?? (Number(summary.passed || 0) + Number(summary.failed || 0))}</p>
                                      {genderF.total != null && <p className="text-xs text-muted-foreground">Expected: {genderF.total}</p>}
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {/* Performance Summary (Faculty) */}
                            <Card className="rounded-2xl">
                              <CardHeader>
                                <CardTitle>Performance Summary</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-1 gap-6">
                                  {(f.subjects || []).slice(0, 6).map((s, idx) => (
                                    <div key={`perfF-${idx}`} className="p-3 rounded-xl border">
                                      <div className="flex justify-between">
                                        <span className="text-sm font-medium">{s.name}</span>
                                        <Badge variant={Number(s.passRate || 0) >= 80 ? 'default' : Number(s.passRate || 0) >= 70 ? 'secondary' : 'destructive'}>
                                          {formatPercent(s.passRate)}
                                        </Badge>
                                      </div>
                                      <Progress value={Number(s.passRate || 0)} />
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Pass Rate Comparison by Gender (Faculty) */}
                          <Card className="rounded-2xl mt-6">
                            <CardHeader>
                              <CardTitle>Pass Rate Comparison by Gender</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {genderRateDataF.length === 0 ? (
                                <div className="text-muted-foreground">No gender pass rate data available.</div>
                              ) : (
                                <ResponsiveContainer width="100%" height={320}>
                                  <BarChart data={genderRateDataF}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={(isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')} />
                                    <XAxis dataKey="name" tick={{ fill: isDark ? '#E5E7EB' : '#374151' }} />
                                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: isDark ? '#E5E7EB' : '#374151' }} />
                                    <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Pass Rate']} contentStyle={{ backgroundColor: isDark ? '#1F2937' : '#ffffff', color: isDark ? '#E5E7EB' : '#111827', boxShadow: '0 10px 15px -3px rgba(99,102,241,0.2)' }} />
                                    <Legend />
                                    <Bar dataKey="rate" name="Pass Rate (%)" fill={(isDark ? '#818CF8' : '#4F46E5')} />
                                  </BarChart>
                                  </ResponsiveContainer>
                                )}
                              </CardContent>
                            </Card>

                          {/* Faculty-specific student lists */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Failed Students */}
                            <Card className="rounded-2xl shadow-sm h-full">
                              <CardHeader className="p-4">
                                <CardTitle>Failed Students</CardTitle>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {failedF.length > 0 ? `${failedF.length} students failed` : 'No failed students'}
                                </div>
                              </CardHeader>
                              <CardContent className="p-4">
                                {failedF.length === 0 ? (
                                  <div className="text-muted-foreground">No failed students detected.</div>
                                ) : (
                                  <ul className="space-y-3">
                                    {failedF.map((fs, idx2) => {
                                      const badgeText = /\d/.test(fs.value) ? `${fs.value} – FAILED` : fs.value;
                                      return (
                                        <li key={`failedF-${idx2}`} className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="font-semibold">{fs.name}</div>
                                            <div className="text-sm italic text-muted-foreground">{fs.course}</div>
                                          </div>
                                          <Badge variant="outline" className="ml-3 rounded-full px-3 py-1 bg-red-50 text-red-700 border-red-200">
                                            {badgeText}
                                          </Badge>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </CardContent>
                            </Card>

                            {/* Incomplete Students */}
                            <Card className="rounded-2xl shadow-sm h-full">
                              <CardHeader className="p-4">
                                <CardTitle>Incomplete Students</CardTitle>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {incompleteF.length > 0 ? `${incompleteF.length} students with incomplete grades` : 'No incomplete students'}
                                </div>
                              </CardHeader>
                              <CardContent className="p-4">
                                {incompleteF.length === 0 ? (
                                  <div className="text-muted-foreground">No incomplete students detected.</div>
                                ) : (
                                  <ul className="space-y-3">
                                    {incompleteF.map((st, idx3) => (
                                      <li key={`incF-${idx3}`} className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="font-semibold">{st.name}</div>
                                          <div className="text-sm italic text-muted-foreground">{st.course}</div>
                                        </div>
                                        <Badge variant="outline" className="ml-3 rounded-full px-3 py-1 bg-amber-50 text-amber-700 border-amber-200">
                                          {st.status}
                                        </Badge>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </CardContent>
                            </Card>

                            {/* Students with Multiple Issues */}
                            <Card className="rounded-2xl shadow-sm h-full">
                              <CardHeader className="p-4">
                                <CardTitle>Students with Multiple Issues</CardTitle>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {multiF.list.length > 0 ? `${multiF.list.length} students with multiple issues` : 'No students with multiple issues'}
                                </div>
                              </CardHeader>
                              <CardContent className="p-4">
                                {multiF.list.length === 0 ? (
                                  <div className="text-muted-foreground">{multiF.message || 'No students with multiple issues found.'}</div>
                                ) : (
                                  <ul className="space-y-4">
                                    {multiF.list.map((st, j) => (
                                      <li key={`multiF-${idx}-${j}`}>
                                        <div className="font-semibold">{st.name}</div>
                                        <div className="text-xs text-muted-foreground mb-2">{(st.issueCount || st.issues.length) + ' subjects with issues'}</div>
                                        <ul className="list-disc pl-5 space-y-2">
                                          {st.issues.map((issue, k) => {
                                            const indicator = (issue.status || issue.grade || '').toUpperCase();
                                            const isInc = /INC|INCOMPLETE/.test(indicator);
                                            const isFail = /FAIL|FAILED|5\.00|5\.?[0-9]*/.test(indicator);
                                            const badgeClass = isInc
                                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                              : isFail
                                              ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
                                            return (
                                              <li key={`issueF-${idx}-${j}-${k}`} className="flex items-center justify-between">
                                                <span className="italic text-sm text-muted-foreground">{issue.course}</span>
                                                <Badge variant="outline" className={`ml-3 rounded-full px-3 py-1 border transition-transform hover:scale-[1.03] ${badgeClass}`}>
                                                  {indicator}
                                                </Badge>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </CardContent>
                            </Card>
                          </div>

                          {/* AI summary for this faculty */}
                          {Boolean(f.detailed_output) && (
                            <Card className="rounded-2xl mt-6">
                              <CardHeader>
                                <CardTitle>AI-Generated Summary</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {(() => {
                                  const summary = f.summary || {};
                                  const subjectsAgg = aggregateSubjectsByName(f.subjects || []);
                                  const weakSubjects = subjectsAgg
                                    .slice()
                                    .sort((a, b) => a.passRate - b.passRate)
                                    .slice(0, Math.min(5, subjectsAgg.length));
                                  const strongSubjects = subjectsAgg
                                    .slice()
                                    .sort((a, b) => b.passRate - a.passRate)
                                    .slice(0, Math.min(5, subjectsAgg.length));
                                  const alarmingSubjects = subjectsAgg
                                    .filter((s) => Number(s.deficiencies || 0) > 0)
                                    .sort((a, b) => Number(b.deficiencies || 0) - Number(a.deficiencies || 0));
                                  const gender = parseGenderFromText(String(f.detailed_output || ''));

                                  const passRateStr = formatPercent(summary.pass_rate);
                                  const failRateStr = formatPercent(summary.fail_rate);

                                  return (
                                    <div className="space-y-4 text-sm">
                                      <div>
                                        <h5 className="font-semibold">Student Performance Analytics</h5>
                                        <p className="mt-1 text-muted-foreground">
                                          Overall pass rate is {passRateStr}; fail rate is {failRateStr}. A total of {Number(summary.enrolled || 0)} students were
                                          analyzed, with {Number(summary.passed || 0)} passing and {Number(summary.failed || 0)} failing. Recorded deficiencies total {Number(summary.deficiencies || 0)}.
                                        </p>
                                      </div>

                                      <div>
                                        <h5 className="font-semibold">Subject Strengths and Weaknesses</h5>
                                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div>
                                            <p className="text-xs font-medium">Weak Subjects (lowest pass rates)</p>
                                            {weakSubjects.length === 0 ? (
                                              <p className="text-xs text-muted-foreground mt-1">No low-performing subjects detected.</p>
                                            ) : (
                                              <ul className="mt-1 space-y-1">
                                                {weakSubjects.map((s) => (
                                                  <li key={`weak-${s.name}`}>
                                                    {s.name} — {formatPercent(s.passRate)} pass rate (Failed: {s.failed} of {s.enrolled})
                                                  </li>
                                                ))}
                                              </ul>
                                            )}
                                          </div>
                                          <div>
                                            <p className="text-xs font-medium">Strong Subjects (highest pass rates)</p>
                                            {strongSubjects.length === 0 ? (
                                              <p className="text-xs text-muted-foreground mt-1">No high-performing subjects detected.</p>
                                            ) : (
                                              <ul className="mt-1 space-y-1">
                                                {strongSubjects.map((s) => (
                                                  <li key={`strong-${s.name}`}>
                                                    {s.name} — {formatPercent(s.passRate)} pass rate (Passed: {s.passed} of {s.enrolled})
                                                  </li>
                                                ))}
                                              </ul>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {gender && (
                                        <div>
                                          <h5 className="font-semibold">Gender Distribution</h5>
                                          <p className="mt-1 text-muted-foreground">
                                            {gender.total != null ? `Out of ${gender.total} students` : 'Gender distribution available'}{gender.male != null ? `, ${gender.male} were male` : ''}{gender.female != null ? ` and ${gender.female} female` : ''}.
                                            {gender.femaleRate != null && gender.maleRate != null
                                              ? ` Female students achieved ${formatPercent(gender.femaleRate)}, slightly ${gender.femaleRate >= gender.maleRate ? 'outperforming' : 'underperforming'} male students (${formatPercent(gender.maleRate)}).`
                                              : ''}
                                          </p>
                                        </div>
                                      )}

                                      <div>
                                        <h5 className="font-semibold">Student Status Overview</h5>
                                        <ul className="mt-1 space-y-1">
                                          <li>Failed students: {failedF.length}</li>
                                          <li>Incomplete grades: {incompleteF.length}</li>
                                          <li>Students with multiple issues: {multiF.list.length}</li>
                                        </ul>
                                      </div>

                                      <div>
                                        <h5 className="font-semibold">Alarming Subjects Identification</h5>
                                        {alarmingSubjects.length === 0 ? (
                                          <p className="text-xs text-muted-foreground mt-1">No subjects with recorded deficiencies.</p>
                                        ) : (
                                          <ul className="mt-1 space-y-1">
                                            {alarmingSubjects.map((s) => (
                                              <li key={`def-${s.name}`}>
                                                {s.name} — {Number(s.deficiencies || 0)} deficiencies
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                        <p className="mt-2 text-xs text-muted-foreground">Subjects with high deficiency rates warrant immediate academic intervention.</p>
                                      </div>

                                      <div>
                                        <h5 className="font-semibold">Summary Conclusion</h5>
                                        <p className="mt-1 text-muted-foreground">
                                          The faculty’s overall academic standing remains strong, with {passRateStr} pass rate and minimal failure cases. Performance is consistent across most subjects; continued monitoring of deficiency-prone subjects is advised.
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </CardContent>
                            </Card>
                          )}
                          {/* Footer timestamp */}
                          <div className="mt-4 text-xs text-muted-foreground">
                            Last updated on {f.analysis_date ? new Date(f.analysis_date).toLocaleString() : 'N/A'}
                          </div>
                          </motion.div>
                        </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {showGlobalSections && (
                <>
                  {/* Performance by Subject Category (textual overview) */}
                  <Card className="rounded-2xl mt-6">
                    <CardHeader>
                      <CardTitle>Performance by Subject Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {categoryPerformance.length === 0 ? (
                        <div className="text-muted-foreground">No category data available.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {categoryPerformance.map((row, idx) => (
                            <div key={`cat-${idx}`} className="p-3 rounded-xl border flex items-center justify-between">
                              <div>
                                <p className="font-medium">{row.category}</p>
                                <p className="text-xs text-muted-foreground">Enrolled: {row.enrolled}</p>
                              </div>
                              <Badge>{Number(row.avgPassRate || 0).toFixed(2)}%</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Subject Strengths & Weaknesses */}
                  <div className="grid grid-cols-1 md-grid-cols-2 gap-6 mt-6">
                  <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle>Weak Subjects (Lowest Pass Rates)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {subjectStrengths.weak.length === 0 ? (
                      <div className="text-muted-foreground">No subjects available.</div>
                    ) : (
                      <ul className="space-y-3">
                        {subjectStrengths.weak.map((s, i) => (
                          <li key={`${s.name}-${i}`} className="flex items-center justify-between">
                            <div className="flex-1">
                              <span className="font-medium">{s.name}</span>
                              <span className="text-muted-foreground">  {s.passRate.toFixed(2)}% pass rate</span>
                            </div>
                            <div className="text-sm">
                              <Badge variant="destructive">{s.failed} failed</Badge>
                              <span className="text-muted-foreground ml-2">out of {s.enrolled}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle>Strong Subjects (Highest Pass Rates)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {subjectStrengths.strong.length === 0 ? (
                      <div className="text-muted-foreground">No subjects available.</div>
                    ) : (
                      <ul className="space-y-3">
                        {subjectStrengths.strong.map((s, i) => (
                          <li key={`${s.name}-${i}`} className="flex items-center justify-between">
                            <div className="flex-1">
                              <span className="font-medium">{s.name}</span>
                              <span className="text-muted-foreground">  {s.passRate.toFixed(2)}% pass rate</span>
                            </div>
                            <div className="text-sm">
                              <Badge variant="default">{s.passed} passed</Badge>
                              <span className="text-muted-foreground ml-2">out of {s.enrolled}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                  </div>

                  {/* Gender Analysis */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle>Gender Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Male</p>
                        <p className="text-xl font-semibold">{genderStats.male}</p>
                        <Badge variant="secondary">{genderStats.maleRate.toFixed(2)}%</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Female</p>
                        <p className="text-xl font-semibold">{genderStats.female}</p>
                        <Badge>{genderStats.femaleRate.toFixed(2)}%</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-xl font-semibold">{genderStats.total}</p>
                        <p className="text-xs text-muted-foreground">Expected: {genderStats.expectedTotal}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Summary */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle>Performance Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-6">
                      {(analyticsData.subjects || []).slice(0, 6).map((s, idx) => (
                        <div key={idx} className="p-3 rounded-xl border">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">{s.name}</span>
                            <Badge variant={s.passRate >= 80 ? 'default' : s.passRate >= 70 ? 'secondary' : 'destructive'}>
                              {Number(s.passRate || 0).toFixed(2)}%
                            </Badge>
                          </div>
                          <Progress value={Number(s.passRate || 0)} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                  </div>

                  {/* Pass Rate Comparison by Gender */}
                  <Card className="rounded-2xl mt-6">
                  <CardHeader>
                    <CardTitle>Pass Rate Comparison by Gender</CardTitle>
                  </CardHeader>
                  <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={genderRateData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Pass Rate']} />
                      <Legend />
                      <Bar dataKey="rate" name="Pass Rate (%)" fill="#a78bfa" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
                  </Card>

                  {/* Gender Performance Callout */}
                  <Card className="rounded-2xl mt-6">
                <CardContent>
                  {genderStats.femaleRate > genderStats.maleRate ? (
                    <div className="flex items-center gap-3">
                      <p className="text-sm md:text-base">
                        Females are performing better with {genderStats.femaleRate.toFixed(2)}% vs {genderStats.maleRate.toFixed(2)}%
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <p className="text-sm md:text-base">
                        Males are performing better with {genderStats.maleRate.toFixed(2)}% vs {genderStats.femaleRate.toFixed(2)}%
                      </p>
                    </div>
                  )}
                </CardContent>
                  </Card>

                  {/* Top Performing Sections by Gender */}
                  <div className="grid grid-cols-1 gap-6 mt-6">
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle>Top Performing Sections for Males</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topSectionsByGender.males.length === 0 ? (
                      <div className="text-muted-foreground">No sections parsed from analysis.</div>
                    ) : (
                      <ul className="space-y-3">
                        {topSectionsByGender.males.map((item, idx) => (
                          <li key={`male-${idx}`} className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{item.section}</span>
                              <span className="text-muted-foreground">  {item.course}</span>
                            </div>
                            <Badge>{Number(item.rate || 0).toFixed(2)}%</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle>Top Performing Sections for Females</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topSectionsByGender.females.length === 0 ? (
                      <div className="text-muted-foreground">No sections parsed from analysis.</div>
                    ) : (
                      <ul className="space-y-3">
                        {topSectionsByGender.females.map((item, idx) => (
                          <li key={`female-${idx}`} className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{item.section}</span>
                              <span className="text-muted-foreground">  {item.course}</span>
                            </div>
                            <Badge variant="secondary">{Number(item.rate || 0).toFixed(2)}%</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                  </div>

                  {/* High-Risk Students */}
                  <Card className="rounded-2xl mt-6 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="text-xl font-semibold text-gray-800">High-Risk Students</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {highRiskStudents.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                        <p className="text-green-700 font-medium">No high-risk students identified in current analysis.</p>
                        <p className="text-green-600 text-sm mt-1">All students are performing within acceptable parameters.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="text-left py-3 px-4 font-semibold text-gray-800 text-sm">Student Name</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-800 text-sm">Course</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-800 text-sm">Risk Factors</th>
                              <th className="text-center py-3 px-4 font-semibold text-gray-800 text-sm">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {highRiskStudents.map((st, i) => (
                              <tr key={`${st.name}-${i}`} className="hover:bg-gray-50 transition-colors duration-150">
                                  <td className="py-3 px-4">
                                  <div className="text-gray-900 font-medium text-sm">{st.name}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-gray-700 font-medium text-sm">{st.course}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-gray-600 text-sm leading-relaxed max-w-md">
                                    {sanitizeAcademicText(st.reason)}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                    At Risk
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
                  </Card>

                  {/* Divider between High-Risk Students and Summary */}
                  <div className="mt-6 border-t border-gray-200" />

                  {/* Summary of Findings (formal paragraph only) */}
                  <Card className="rounded-2xl mt-6 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="text-xl font-semibold text-gray-800">Summary of Findings</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="prose prose-sm max-w-3xl mx-auto">
                    <p className="text-gray-700 leading-relaxed text-justify">
                      {sanitizeAcademicText(summaryBodyText)}
                    </p>
                  </div>
                  {recommendationsText && (
                    <div className="mt-6">
                      <h5 className="text-md font-semibold text-gray-800 mb-2">Recommendations</h5>
                      <p className="text-gray-700 leading-relaxed text-justify">{recommendationsText}</p>
                    </div>
                  )}
                </CardContent>
                  </Card>

                  {/* Specific Student Identification */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {/* Failed Students */}
                <Card className="rounded-2xl shadow-sm h-full">
                  <CardHeader className="p-4">
                    <CardTitle>Failed Students</CardTitle>
                    <div className="text-xs text-muted-foreground mt-1">
                      {failedStudents.length > 0 ? `${failedStudents.length} students failed` : 'No failed students'}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {failedStudents.length === 0 ? (
                      <div className="text-muted-foreground">No failed students detected.</div>
                    ) : (
                      <ul className="space-y-3">
                        {failedStudents.map((fs, idx) => {
                          const badgeText = /\d/.test(fs.value) ? `${fs.value} – FAILED` : fs.value;
                          return (
                            <li key={`failed-${idx}`} className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-semibold">{fs.name}</div>
                                <div className="text-sm italic text-muted-foreground">{fs.course}</div>
                              </div>
                              <Badge
                                variant="outline"
                                className="ml-3 rounded-full px-3 py-1 bg-red-50 text-red-700 border-red-200 transition-transform hover:scale-[1.03] hover:bg-red-100"
                              >
                                {badgeText}
                              </Badge>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {/* Incomplete Students */}
                <Card className="rounded-2xl shadow-sm h-full">
                  <CardHeader className="p-4">
                    <CardTitle>Incomplete Students</CardTitle>
                    <div className="text-xs text-muted-foreground mt-1">
                      {incompleteStudents.length > 0 ? `${incompleteStudents.length} students with incomplete grades` : 'No incomplete students'}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {incompleteStudents.length === 0 ? (
                      <div className="text-muted-foreground">No incomplete students detected.</div>
                    ) : (
                      <ul className="space-y-3">
                        {incompleteStudents.map((st, idx) => (
                          <li key={`inc-${idx}`} className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-semibold">{st.name}</div>
                              <div className="text-sm italic text-muted-foreground">{st.course}</div>
                            </div>
                            <Badge
                              variant="outline"
                              className="ml-3 rounded-full px-3 py-1 bg-amber-50 text-amber-700 border-amber-200 transition-transform hover:scale-[1.03] hover:bg-amber-100"
                            >
                              {st.status}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {/* Students with Multiple Issues */}
                <Card className="rounded-2xl shadow-sm h-full">
                  <CardHeader className="p-4">
                    <CardTitle>Students with Multiple Issues</CardTitle>
                    <div className="text-xs text-muted-foreground mt-1">
                      {multipleIssues.list.length > 0 ? `${multipleIssues.list.length} students with multiple issues` : 'No students with multiple issues'}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {multipleIssues.list.length === 0 ? (
                      <div className="text-muted-foreground">{multipleIssues.message || 'No students with multiple issues found.'}</div>
                    ) : (
                      <ul className="space-y-4">
                        {multipleIssues.list.map((st, idx) => (
                          <li key={`multi-${idx}`} className="">
                            <div className="font-semibold">{st.name}</div>
                            <div className="text-xs text-muted-foreground mb-2">
                              {(st.issueCount || st.issues.length) + ' subjects with issues'}
                            </div>
                            <ul className="list-disc pl-5 space-y-2">
                              {st.issues.map((issue, j) => {
                                const indicator = (issue.status || issue.grade || '').toUpperCase();
                                const isInc = /INC|INCOMPLETE/.test(indicator);
                                const isFail = /FAIL|FAILED|5\.00|5\.?[0-9]*/.test(indicator);
                                const badgeClass = isInc
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                  : isFail
                                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
                                return (
                                  <li key={`issue-${idx}-${j}`} className="flex items-center justify-between">
                                    <span className="italic text-sm text-muted-foreground">{issue.course}</span>
                                    <Badge
                                      variant="outline"
                                      className={`ml-3 rounded-full px-3 py-1 border transition-transform hover:scale-[1.03] ${badgeClass}`}
                                    >
                                      {indicator}
                                    </Badge>
                                  </li>
                                );
                              })}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
                  </div>

                  {/* AI-Generated Insights (Expandable) */}
                  <Card className="rounded-2xl mt-6">
                <CardHeader>
                  <CardTitle>AI-Generated Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <details className="rounded-xl border p-4 bg-muted/40">
                    <summary className="cursor-pointer text-sm font-medium">View full analysis output</summary>
                    <pre className="whitespace-pre-wrap text-sm overflow-x-auto mt-3">{sanitizeAcademicText(detailedAnalytics || 'No detailed analytics available.')}</pre>
                  </details>
                </CardContent>
                  </Card>

                  {/* Stored Analytics Entries */}
                  <Card className="rounded-2xl mt-6">
                <CardHeader>
                  <CardTitle>Stored Analytics Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  {(analyticsData.analytics || []).length === 0 ? (
                    <div className="text-muted-foreground">No analytics entries stored.</div>
                  ) : (
                    <div className="space-y-4">
                      {(analyticsData.analytics || []).slice(0, 10).map((item) => {
                        const isString = typeof item.content === 'string';
                        const contentStr = isString ? item.content : JSON.stringify(item.content, null, 2);
                        const snippetRaw = contentStr.length > 600 ? contentStr.slice(0, 600) + '...\n[truncated]' : contentStr;
                        const snippet = sanitizeAcademicText(snippetRaw);
                        return (
                          <div key={item.id} className="p-4 border rounded-2xl bg-card">
                            <div className="flex justify-between mb-2">
                              <span className="font-medium">{item.data_type}</span>
                              <span className="text-xs text-muted-foreground">{item.analysis_date}</span>
                            </div>
                            <pre className="whitespace-pre-wrap text-sm overflow-x-auto">{snippet}</pre>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
                  </Card>
                </>
              )}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Analysis;
