import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/NavBar';
import Sidebar from '../components/Sidebar';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { useAcademicYear } from '../context/AcademicYearContext';
import { formatAcademicYearRange } from '../utils/academicYear';
import { fetchReports, generateReport, fetchReportPreview, fetchReportOptions } from '../services/api';
import { FileText, Download, RefreshCw, Loader2, AlertCircle, CheckCircle2, Printer, X, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// --- Report Preview Component ---
const ReportPreview = ({ data, onClose, onExportDocx }) => {
  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  const { header, executive_summary, subject_performance, internal_reviews, program_comparison, faculty_performance, hotspots, student_analysis, narrative } = data;

  const hasData = executive_summary && (executive_summary.total_students > 0 || executive_summary.total_faculty > 0 || executive_summary.total_subjects > 0);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-auto flex justify-center py-8 print:bg-white print:p-0 print:overflow-visible print:absolute print:inset-0">
      <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl p-[20mm] print:shadow-none print:w-full print:max-w-none print:p-0 relative font-sans text-sm leading-relaxed">
        
        {/* Floating Actions (Hidden on Print) */}
        <div className="fixed top-4 right-4 flex gap-2 print:hidden z-50">
          <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 font-medium transition-colors">
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
          <button onClick={onExportDocx} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 font-medium transition-colors">
            <Download className="w-4 h-4" /> Download DOCX
          </button>
          <button onClick={onClose} className="bg-gray-800 hover:bg-gray-900 text-white p-2 rounded-full shadow-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- REPORT HEADER --- */}
        <header className="border-b-2 border-black pb-4 mb-8">
            <div className="flex items-center justify-between px-8 mb-4">
                {/* Left Logo: LSPU */}
                <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
                    <img src="/lspu.jfif" alt="LSPU Logo" className="w-full h-full object-contain" />
                </div>

                {/* Center Text */}
                <div className="text-center flex-1 px-4">
                    <p className="text-sm">Republic of the Philippines</p>
                    <h1 className="text-2xl font-bold my-1 tracking-wide" style={{ fontFamily: '"Old English Text MT", "Times New Roman", serif' }}>
                        Laguna State Polytechnic University
                    </h1>
                    <p className="text-sm">Province of Laguna</p>
                    <h2 className="text-xl font-bold uppercase mt-2 tracking-wider">COLLEGE OF COMPUTER STUDIES</h2>
                </div>

                {/* Right Logo: CCS */}
                <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
                    <img src="/lspui-seal-ccs.jfif" alt="CCS Logo" className="w-full h-full object-contain" />
                </div>
            </div>
            
            <div className="flex justify-center gap-8 text-sm font-semibold mt-2 border-t border-gray-300 pt-2">
                <div>Academic Year: {header.year || '2024-2025'}</div>
                <div>Semester: {header.semester || 'All'}</div>
                <div>Date Generated: {header.generated_at ? new Date(header.generated_at).toLocaleDateString() : new Date().toLocaleDateString()}</div>
            </div>
        </header>

        {!hasData ? (
            <div className="flex flex-col items-center justify-center h-[500px] text-gray-500">
                <AlertCircle className="w-16 h-16 mb-4 text-gray-300" />
                <h3 className="text-xl font-bold mb-2">No Data Available</h3>
                <p>No available data for the selected academic year and semester.</p>
            </div>
        ) : (
            <>
        {/* --- EXECUTIVE SUMMARY --- */}
        <section className="mb-8">
            <h4 className="font-bold text-base mb-1">EXECUTIVE SUMMARY</h4>
            <p className="mb-4 text-gray-700 italic">This section provides an immediate snapshot of the college's standing.</p>
            
            {executive_summary.data_integrity_warning && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                        <span className="font-bold">Data Integrity Warning:</span> {executive_summary.data_integrity_warning}
                    </div>
                </div>
            )}

            <div className="border border-black">
                <div className="grid grid-cols-2">
                    <div className="p-2 border-b border-r border-black font-bold bg-gray-100">Metric</div>
                    <div className="p-2 border-b border-black font-bold bg-gray-100">Value</div>
                    
                    <div className="p-2 border-b border-r border-black">Total Students</div>
                    <div className="p-2 border-b border-black">{executive_summary.total_students || 0}</div>
                    
                    <div className="p-2 border-b border-r border-black">Overall Pass Rate</div>
                    <div className="p-2 border-b border-black">{executive_summary.overall_pass_rate}%</div>
                    
                    <div className="p-2 border-b border-r border-black">Overall Fail Rate</div>
                    <div className="p-2 border-b border-black">{executive_summary.overall_fail_rate}%</div>
                    
                    <div className="p-2 border-b border-r border-black">Analyzed Courses</div>
                    <div className="p-2 border-b border-black">{executive_summary.total_subjects}</div>
                    
                    <div className="p-2 border-r border-black">Faculty Count</div>
                    <div className="p-2">{executive_summary.total_faculty}</div>
                </div>
            </div>
        </section>

        {/* --- PROGRAM PERFORMANCE ANALYSIS --- */}
        <section className="mb-8">
            <h4 className="font-bold text-base mb-1">PROGRAM PERFORMANCE ANALYSIS</h4>
            <p className="mb-4 text-gray-700 italic">A comparative look at the BSCS and BSIT programs.</p>
            
            <h5 className="font-bold mb-2">Program Comparison Table</h5>
            <table className="w-full border-collapse border border-black text-left">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-2">Program</th>
                        <th className="border border-black p-2">Avg. Pass Rate</th>
                        <th className="border border-black p-2">Deficiencies</th>
                        <th className="border border-black p-2">Strongest Subject</th>
                        <th className="border border-black p-2">Weakest Subject</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="border border-black p-2 font-bold">BSCS</td>
                        <td className="border border-black p-2">{program_comparison.bscs.pass_rate}%</td>
                        <td className="border border-black p-2">{program_comparison.bscs.deficiencies}</td>
                        <td className="border border-black p-2 text-green-700">{program_comparison.bscs.strongest}</td>
                        <td className="border border-black p-2 text-red-700">{program_comparison.bscs.weakest}</td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 font-bold">BSIT</td>
                        <td className="border border-black p-2">{program_comparison.bsit.pass_rate}%</td>
                        <td className="border border-black p-2">{program_comparison.bsit.deficiencies}</td>
                        <td className="border border-black p-2 text-green-700">{program_comparison.bsit.strongest}</td>
                        <td className="border border-black p-2 text-red-700">{program_comparison.bsit.weakest}</td>
                    </tr>
                </tbody>
            </table>
        </section>

        {/* --- FACULTY PERFORMANCE OVERVIEW --- */}
        <section className="mb-8">
            <h4 className="font-bold text-base mb-1">FACULTY PERFORMANCE OVERVIEW</h4>
            <p className="mb-4 text-gray-700 italic">Summarizing the performance and workload of the included faculty members.</p>
            
            <div className="space-y-2">
                {faculty_performance && faculty_performance.map((fac, idx) => (
                    <div key={idx} className="flex gap-2">
                        <span className="font-bold min-w-[150px]">{fac.name} :</span>
                        <span>Managed {fac.students} students with a {fac.pass_rate}% pass rate and {fac.deficiencies} recorded deficiencies.</span>
                    </div>
                ))}
                {(!faculty_performance || faculty_performance.length === 0) && <p>No faculty data available.</p>}
            </div>
        </section>

        {/* --- CRITICAL DEFICIENCY HOTSPOTS --- */}
        <section className="mb-8">
            <h4 className="font-bold text-base mb-1">CRITICAL DEFICIENCY HOTSPOTS</h4>
            <p className="mb-4 text-gray-700 italic">These subjects represent the highest volume of academic risk.</p>
            
            <div className="space-y-3">
                {hotspots && hotspots.map((spot, idx) => (
                    <div key={idx} className="flex gap-2">
                        {spot.subject !== 'None' && <span className="font-bold min-w-[100px] text-red-700">{spot.subject} :</span>}
                        <span>{spot.reason}</span>
                    </div>
                ))}
                 {(!hotspots || hotspots.length === 0) && <p>No critical hotspots identified.</p>}
            </div>
        </section>

        {/* --- V. STUDENT INTERVENTION LIST (HIGH RISK) --- */}
        <section className="mb-8 break-inside-avoid">
            <h4 className="font-bold text-base mb-1">V. STUDENT INTERVENTION LIST (HIGH RISK)</h4>
            <p className="mb-4 text-gray-700 italic">Priority list for Academic Advising. Students listed here have multiple deficiencies.</p>
            
            <h5 className="font-bold mb-2">Individual Student Breakdown</h5>
            <div className="space-y-3">
                {student_analysis && student_analysis.intervention_list && student_analysis.intervention_list.slice(0, 10).map((std, idx) => (
                    <div key={idx} className="border-b border-gray-200 pb-2 break-inside-avoid">
                        <div className="flex justify-between items-start mb-1">
                            <div>
                                <span className="font-bold">{std.name}</span>
                                <span className="text-gray-500 text-xs ml-2">(ID: {std.id || 'N/A'})</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                                std.risk === 'High' ? 'bg-red-50 text-red-700 border-red-200' : 
                                std.risk === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                                'bg-gray-50 text-gray-700 border-gray-200'
                            }`}>
                                {std.risk || 'High'} Risk
                            </span>
                        </div>
                        <div className="text-sm text-gray-700 pl-2 border-l-2 border-gray-300">
                            <span className="font-semibold text-xs uppercase tracking-wider text-gray-500 mr-2">{std.program || 'Unknown Program'}</span>
                            {std.details}
                        </div>
                    </div>
                ))}
                {(!student_analysis || !student_analysis.intervention_list || student_analysis.intervention_list.length === 0) && <p>No high-risk students identified.</p>}
            </div>
        </section>

        {/* --- VI. SYSTEM NARRATIVE RECOMMENDATION --- */}
        <section className="mb-12">
            <h4 className="font-bold text-base mb-1">VI. SYSTEM NARRATIVE RECOMMENDATION</h4>
            <p className="text-justify leading-relaxed">
                {narrative}
            </p>
        </section>

        {/* --- VII. SUBJECT PERFORMANCE BREAKDOWN --- */}
        <section className="mb-8 break-before-page">
            <h4 className="font-bold text-base mb-1">VII. SUBJECT PERFORMANCE BREAKDOWN</h4>
            <p className="mb-4 text-gray-700 italic">Detailed performance metrics for all analyzed subjects.</p>
            
            <table className="w-full border-collapse border border-black text-left text-xs">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-1">Subject</th>
                        <th className="border border-black p-1">Program</th>
                        <th className="border border-black p-1">Enrolled</th>
                        <th className="border border-black p-1">Passed</th>
                        <th className="border border-black p-1">Failed</th>
                        <th className="border border-black p-1">Pass Rate</th>
                        <th className="border border-black p-1">Deficiencies</th>
                        <th className="border border-black p-1">Faculty</th>
                    </tr>
                </thead>
                <tbody>
                    {subject_performance && subject_performance.map((sub, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border border-black p-1 font-semibold">{sub.code}</td>
                            <td className="border border-black p-1">{sub.program}</td>
                            <td className="border border-black p-1">{sub.enrolled}</td>
                            <td className="border border-black p-1">{sub.passed}</td>
                            <td className="border border-black p-1">{sub.failed}</td>
                            <td className={`border border-black p-1 font-bold ${
                                sub.pass_rate >= 90 ? 'text-green-700' : 
                                sub.pass_rate < 75 ? 'text-red-700' : ''
                            }`}>
                                {sub.pass_rate}%
                            </td>
                            <td className="border border-black p-1">{sub.deficiencies}</td>
                            <td className="border border-black p-1">{sub.faculty}</td>
                        </tr>
                    ))}
                    {(!subject_performance || subject_performance.length === 0) && (
                        <tr><td colSpan="8" className="border border-black p-2 text-center">No subject data available.</td></tr>
                    )}
                </tbody>
            </table>
        </section>

        {/* --- VIII. INTERNAL QUALITY REVIEWS --- */}
        <section className="mb-8 break-inside-avoid">
            <h4 className="font-bold text-base mb-1">VIII. INTERNAL QUALITY REVIEWS</h4>
            <p className="mb-4 text-gray-700 italic">Insights from Faculty Accomplishment Reports (Weakness, Actions, Recommendations).</p>
            
            <div className="space-y-4">
                {internal_reviews && internal_reviews.map((rev, idx) => (
                    <div key={idx} className="border border-black p-3 rounded-sm break-inside-avoid">
                        <div className="flex justify-between border-b border-gray-300 pb-2 mb-2">
                            <span className="font-bold">{rev.subject}</span>
                            <span className="text-sm text-gray-600">Faculty: {rev.faculty}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-sm">
                            {rev.weakness && (
                                <div>
                                    <span className="font-semibold text-red-700">Weakness/Problem:</span>
                                    <p className="ml-2">{rev.weakness}</p>
                                </div>
                            )}
                            {rev.action && (
                                <div>
                                    <span className="font-semibold text-blue-700">Action Taken:</span>
                                    <p className="ml-2">{rev.action}</p>
                                </div>
                            )}
                            {rev.recommendation && (
                                <div>
                                    <span className="font-semibold text-green-700">Recommendation:</span>
                                    <p className="ml-2">{rev.recommendation}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {(!internal_reviews || internal_reviews.length === 0) && <p>No internal reviews available.</p>}
            </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="mt-auto pt-4 border-t-2 border-black flex justify-between text-sm print-footer">
            <div>
                <span className="font-bold">Report Generated by:</span> AI-Powered CQI System
            </div>
            <div className="flex gap-4">
                <span>
                    <span className="font-bold">Timestamp:</span> {new Date().toLocaleString('en-US', { 
                        month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true 
                    })}
                </span>
                <span className="print:block hidden font-bold page-number"></span>
            </div>
        </footer>
        </>
        )}

      </div>
      
      {/* Print Styles */}
      <style>{`
        @media print {
            @page { 
                size: A4; 
                margin: 10mm; 
                margin-bottom: 20mm; /* Space for fixed footer */
            }
            body * { visibility: hidden; }
            .print\\:absolute { position: absolute !important; left: 0; top: 0; width: 100%; margin: 0; padding: 0; visibility: visible !important; }
            .print\\:absolute * { visibility: visible !important; }
            .print\\:hidden { display: none !important; }
            .print\\:shadow-none { shadow: none !important; box-shadow: none !important; }
            .print\\:bg-white { background: white !important; }
            .print\\:block { display: block !important; }
            
            .break-before-page { page-break-before: always; break-before: page; }
            .break-inside-avoid { page-break-inside: avoid; break-inside: avoid; }

            .print-footer {
                position: fixed;
                bottom: 0;
                left: 0;
                width: 100%;
                visibility: visible !important;
                background: white;
            }
            /* Note: CSS counters for page numbers in HTML are limited in browser support */
        }
      `}</style>
    </div>
  );
};

const Reports = () => {
  const { selectedYear } = useAcademicYear();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState('performance_summary');
  const [message, setMessage] = useState(null);
  
  // Formal Report State (Filters and Options)
  const [formYear, setFormYear] = useState(selectedYear === 'All' ? '' : selectedYear);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [formSemester, setFormSemester] = useState('All');
  const [formProgram, setFormProgram] = useState('All');
  const [formSubject, setFormSubject] = useState('All');
  const [formFaculty, setFormFaculty] = useState('All');
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [facultyOptions, setFacultyOptions] = useState([]);

  useEffect(() => {
    loadReports();
    loadOptions();
  }, []);
useEffect(() => {
    if (selectedYear !== 'All') {
        setFormYear(selectedYear);
    }
  }, [selectedYear]);

  
  const loadOptions = async () => {
    try {
        const data = await fetchReportOptions();
        setSubjectOptions(data.subjects || []);
        setFacultyOptions(data.faculties || []);
    } catch (err) {
        console.error("Failed to load options", err);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await fetchReports();
      setReports(data);
    } catch (err) {
      console.error("Failed to load reports", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      await generateReport(reportType, selectedYear);
      setMessage({ type: 'success', text: 'Report generated successfully!' });
      loadReports();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to generate report.' });
    } finally {
      setGenerating(false);
    }
  };
  
  const handlePreview = async () => {
      setPreviewLoading(true);
      try {
          const data = await fetchReportPreview(selectedYear, formSemester, formProgram, formSubject, formFaculty);
          setPreviewData(data);
          setShowPreview(true);
      } catch (err) {
          console.error(err);
          setMessage({ type: 'error', text: 'Failed to generate preview.' });
      } finally {
          setPreviewLoading(false);
      }
  };

  const handleExportDocx = () => {
      const queryParams = new URLSearchParams({
          year: formYear || 'All',
          semester: formSemester,
          program: formProgram,
          subject: formSubject,
          faculty: formFaculty
      }).toString();
      
      const url = window.location.protocol + '//' + window.location.hostname + ':5000/api/reports/export/docx?' + queryParams;
      window.open(url, '_blank');
  };

  const downloadFile = (path) => {
      const url = path.startsWith('/api') ? path : `${path}`;
      window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navbar />
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row gap-6">
          <Sidebar />
          <main className="flex-1 py-6 space-y-6">
            
            {/* 1. Formal Report Generator (New Feature) */}
            <Card className="rounded-2xl shadow-md border-l-4 border-l-blue-600 bg-card">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Printer className="w-5 h-5 text-blue-600" />
                        Printable Academic Report
                    </CardTitle>
                    <CardDescription>Generate official, formatted reports for printing or PDF export.</CardDescription>
                 </CardHeader>
                 <CardContent>
                         <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                             <div>
                                 <label className="block text-sm font-medium mb-1">Academic Year</label>
                                 <div className="p-2 bg-muted rounded border border-input text-sm font-semibold truncate">
                                     {selectedYear === 'All' ? 'All Years' : `A.Y. ${formatAcademicYearRange(selectedYear)}`}
                                 </div>
                             </div>
                             <div>
                                 <label className="block text-sm font-medium mb-1">Semester</label>
                                 <select 
                                    className="w-full p-2 rounded-md border border-input bg-background"
                                    value={formSemester}
                                    onChange={(e) => setFormSemester(e.target.value)}
                                 >
                                     <option value="All">All Semesters</option>
                                     <option value="1st Semester">1st Semester</option>
                                     <option value="2nd Semester">2nd Semester</option>
                                     <option value="Summer">Summer</option>
                                 </select>
                             </div>
                             <div>
                                 <label className="block text-sm font-medium mb-1">Program</label>
                                 <select 
                                    className="w-full p-2 rounded-md border border-input bg-background"
                                    value={formProgram}
                                    onChange={(e) => setFormProgram(e.target.value)}
                                 >
                                     <option value="All">All Programs</option>
                                     <option value="BSIT">BSIT</option>
                                     <option value="BSCS">BSCS</option>
                                 </select>
                             </div>
                             <div>
                                 <label className="block text-sm font-medium mb-1">Subject</label>
                                 <select 
                                    className="w-full p-2 rounded-md border border-input bg-background"
                                    value={formSubject}
                                    onChange={(e) => setFormSubject(e.target.value)}
                                 >
                                     <option value="All">All Subjects</option>
                                     {subjectOptions.map((sub, i) => (
                                         <option key={i} value={sub}>{sub}</option>
                                     ))}
                                 </select>
                             </div>
                             <div>
                                 <label className="block text-sm font-medium mb-1">Faculty</label>
                                 <select 
                                    className="w-full p-2 rounded-md border border-input bg-background"
                                    value={formFaculty}
                                    onChange={(e) => setFormFaculty(e.target.value)}
                                 >
                                     <option value="All">All Faculty</option>
                                     {facultyOptions.map((fac, i) => (
                                         <option key={i} value={fac}>{fac}</option>
                                     ))}
                                 </select>
                             </div>
                         </div>
                         <div className="mt-4 flex justify-end">
                             <button
                                onClick={handlePreview}
                                disabled={previewLoading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium flex items-center shadow-sm transition-all"
                             >
                                 {previewLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                                 Generate & Preview
                             </button>
                         </div>
                     </CardContent>
            </Card>
            
            {/* 2. Excel Report Generator (Legacy) */}
            <Card className="rounded-2xl shadow-sm border border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold">Quick Excel Export</CardTitle>
                        <CardDescription>Download raw data summaries.</CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-end gap-4">
                  <div className="w-full md:w-1/3">
                    <label className="block text-sm font-medium mb-2 text-muted-foreground">Report Type</label>
                    <select 
                      className="w-full p-2 rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                    >
                      <option value="performance_summary">Performance Summary (Excel)</option>
                      <option value="faculty_evaluation">Faculty Evaluation (Excel)</option>
                    </select>
                  </div>
                  <div className="w-full md:w-auto">
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="flex items-center justify-center px-6 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors font-medium shadow-sm"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Download Excel
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {message && (
                  <div className={`mt-4 p-3 rounded-lg flex items-center text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'}`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <AlertCircle className="w-4 h-4 mr-2" />}
                    {message.text}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reports List */}
            <Card className="rounded-2xl shadow-sm border border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold">Generated Files History</CardTitle>
                  <button 
                    onClick={loadReports}
                    className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Refresh list"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {loading && reports.length === 0 ? (
                  <div className="flex justify-center py-8 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading reports...
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border border-dashed border-border">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No reports generated yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-muted-foreground font-medium">
                        <tr>
                          <th className="px-4 py-3">Report Name</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Date Generated</th>
                          <th className="px-4 py-3 text-right">Size</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card">
                        {reports.map((report, index) => (
                          <tr key={index} className="hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-3 font-medium flex items-center">
                              <FileText className="w-4 h-4 mr-2 text-primary" />
                              {report.filename}
                            </td>
                            <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${report.type === 'AI Result' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                    {report.type}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {new Date(report.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {(report.size / 1024).toFixed(1)} KB
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => downloadFile(report.path)}
                                className="inline-flex items-center justify-center p-2 rounded-md hover:bg-primary/10 text-primary transition-colors"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

          </main>
        </div>
      </div>
      
      {/* Report Preview Modal */}
      {showPreview && (
          <ReportPreview data={previewData} onClose={() => setShowPreview(false)} onExportDocx={handleExportDocx} />
      )}
    </div>
  );
};

export default Reports;
