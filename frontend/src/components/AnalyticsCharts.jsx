import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, ReferenceLine, LabelList, ComposedChart, Line, ZAxis } from 'recharts';
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

const AnalyticsCharts = ({ subjectData, categoryData }) => {
  const isDark = useIsDark();
  const gridStroke = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)';
  const axisColor = isDark ? '#F3F4F6' : '#333333';
  const labelColor = axisColor;
  const tickFont = { fill: axisColor, fontSize: 13, fontWeight: 700 };
  const primary = isDark ? '#818CF8' : '#4F46E5';
  const secondary = isDark ? '#38BDF8' : '#60A5FA';
  const highlight = isDark ? '#FCD34D' : '#FACC15';
  const tooltipBg = isDark ? '#1F2937' : '#ffffff';
  const tooltipColor = isDark ? '#E5E7EB' : '#111827';
  const BAR_PALETTE = isDark
    ? ['#818CF8']
    : ['#4F46E5'];
  const DANGER = isDark ? '#F87171' : '#DC2626';
  const PASS_COLOR = isDark ? '#818CF8' : '#4F46E5';
  const FAIL_COLOR = isDark ? '#EF4444' : '#DC2626';
  const renderPercentLabel = (props) => {
    const { x, y, value } = props;
    const v = Number(value);
    const text = `${Number.isFinite(v) ? v.toFixed(1) : '0.0'}%`;
    return (
      <text
        x={x}
        y={y}
        dy={-6}
        textAnchor="middle"
        fill={axisColor}
        fontSize={13}
        fontWeight={700}
        style={{ paintOrder: 'stroke fill', stroke: isDark ? '#111827' : '#ffffff', strokeWidth: 1.2 }}
      >
        {text}
      </text>
    );
  };
  const renderNumberLabel = (props) => {
    const { x, y, value } = props;
    const v = Number(value);
    const text = Number.isFinite(v) ? String(v) : '0';
    return (
      <text
        x={x}
        y={y}
        dy={-6}
        textAnchor="middle"
        fill={axisColor}
        fontSize={13}
        fontWeight={700}
        style={{ paintOrder: 'stroke fill', stroke: isDark ? '#111827' : '#ffffff', strokeWidth: 1.2 }}
      >
        {text}
      </text>
    );
  };
  // Example data for pass rate by subject
  const passRateData = (subjectData || []).map(subject => {
    const enrolled = Number(subject.enrolled || 0);
    const passed = subject.passed != null ? Number(subject.passed) : Math.round(enrolled * Number(subject.passRate || 0) / 100);
    const computedRate = enrolled > 0 ? (passed / enrolled) * 100 : Number(subject.passRate || 0) || 0;
    const safeRate = Math.max(0, Math.min(100, Number.isFinite(computedRate) ? computedRate : 0));
    return {
      name: subject.name || subject.course || 'Unknown Subject',
      passRate: safeRate,
      enrolled,
    };
  }).filter(row => row.enrolled >= 0);

  const chartHeightPR = Math.max(260, passRateData.length * 50);

  const minPassRate = passRateData.length ? Math.min(...passRateData.map(r => r.passRate)) : 0;
  const yStartPass = minPassRate >= 75 ? 50 : 0;
  const labelTick = { ...tickFont, fontSize: 12 };

  // Example data for performance by category
  const categoryPerformanceData = categoryData.map(cat => ({
    name: cat.name,
    passRate: cat.avg_pass_rate,
  }));

  // Example data for performance distribution
  const performanceDistData = (() => {
    const totals = (subjectData || []).reduce(
      (acc, s) => {
        const enrolled = Number(s.enrolled || 0);
        const passRate = Math.max(0, Math.min(100, Number(s.passRate || 0)));
        const passed = s.passed != null ? Number(s.passed) : Math.round((enrolled * passRate) / 100);
        const failed = s.failed != null ? Number(s.failed) : Math.max(enrolled - passed, 0);
        acc.passed += passed;
        acc.failed += failed;
        return acc;
      },
      { passed: 0, failed: 0 }
    );
    return [
      { name: 'Passed', value: totals.passed },
      { name: 'Failed', value: totals.failed },
    ];
  })();

  // Scatter data: Enrollment vs Pass Rate
  const enrollmentVsPassRate = (subjectData || []).map((s) => {
    const enrolled = Number(s.enrolled || 0);
    const passed = s.passed != null ? Number(s.passed) : Math.round(enrolled * Number(s.passRate || 0) / 100);
    const rateRaw = enrolled > 0 ? (passed / enrolled) * 100 : Number(s.passRate || 0) || 0;
    const rate = Math.max(0, Math.min(100, Number.isFinite(rateRaw) ? rateRaw : 0));
    return { x: enrolled, y: rate, name: s.name || s.course || 'Subject' };
  }).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));

  // Simple k-means (k=3) clustering for effectiveness (enrollment vs pass rate)
  const kMeans2D = (points, k = 3, maxIter = 25) => {
    if (points.length === 0) return { assignments: [], centroids: [] };
    const pts = points.map(p => ({ x: p.x, y: p.y }));
    // Initialize centroids using spread across sorted by y (pass rate)
    const sortedByY = [...pts].sort((a, b) => a.y - b.y);
    const initIdx = [0, Math.floor(sortedByY.length / 2), sortedByY.length - 1];
    let centroids = initIdx.slice(0, k).map(i => ({ ...sortedByY[i] }));
    let assignments = new Array(pts.length).fill(0);

    const dist2 = (a, b) => {
      const dx = a.x - b.x; const dy = a.y - b.y; return dx * dx + dy * dy;
    };

    for (let iter = 0; iter < maxIter; iter++) {
      // Assign step
      let changed = false;
      for (let i = 0; i < pts.length; i++) {
        let best = 0; let bestD = Infinity;
        for (let c = 0; c < k; c++) {
          const d = dist2(pts[i], centroids[c]);
          if (d < bestD) { bestD = d; best = c; }
        }
        if (assignments[i] !== best) { assignments[i] = best; changed = true; }
      }
      // If no change, stop
      if (!changed) break;
      // Update step
      const sums = Array.from({ length: k }, () => ({ x: 0, y: 0, n: 0 }));
      for (let i = 0; i < pts.length; i++) {
        const c = assignments[i];
        sums[c].x += pts[i].x; sums[c].y += pts[i].y; sums[c].n += 1;
      }
      for (let c = 0; c < k; c++) {
        if (sums[c].n > 0) {
          centroids[c] = { x: sums[c].x / sums[c].n, y: sums[c].y / sums[c].n };
        }
      }
    }
    return { assignments, centroids };
  };

  // Compute clusters and label them by centroid pass rate (High/Medium/Low)
  const { assignments, centroids } = kMeans2D(enrollmentVsPassRate, 3);
  const centroidOrder = centroids
    .map((c, idx) => ({ idx, y: c?.y ?? -Infinity }))
    .sort((a, b) => b.y - a.y) // highest pass rate first
    .map((item, rank) => ({ old: item.idx, rank }));
  const idxMap = new Map(centroidOrder.map(m => [m.old, m.rank]));
  const clusterNames = ['High Effectiveness', 'Medium Effectiveness', 'Low Effectiveness'];
  const clusterColors = ['#16A34A', '#F59E0B', '#DC2626'];
  const clusteredSeries = [[], [], []];
  enrollmentVsPassRate.forEach((p, i) => {
    const normalizedIdx = idxMap.has(assignments[i]) ? idxMap.get(assignments[i]) : 0;
    clusteredSeries[normalizedIdx].push({ ...p });
  });

  // Deficiencies by Subject
  const deficienciesData = subjectData.map((s) => ({
    name: s.name,
    deficiencies: Number(s.deficiencies ?? s.num_def ?? 0),
  }));

  // Compute overall summary metrics (enrolled, passed, failed, pass/fail rates)
  const summaryTotals = subjectData.reduce(
    (acc, s) => {
      const enrolled = Number(s.enrolled || 0);
      const passRate = Number(s.passRate || 0);
      const passed = s.passed != null ? Number(s.passed) : Math.round((enrolled * passRate) / 100);
      const failed = s.failed != null ? Number(s.failed) : Math.max(enrolled - passed, 0);
      acc.enrolled += enrolled;
      acc.passed += passed;
      acc.failed += failed;
      return acc;
    },
    { enrolled: 0, passed: 0, failed: 0 }
  );

  const deficienciesTotal = subjectData.reduce(
    (acc, s) => acc + Number(s.deficiencies ?? s.num_def ?? 0),
    0
  );

  const passRateOverall = summaryTotals.enrolled > 0 ? (summaryTotals.passed / summaryTotals.enrolled) * 100 : 0;
  const failRateOverall = Math.max(0, Math.min(100, 100 - passRateOverall));

  return (
    <div className="space-y-6">
      {/* Summary of Findings  clean, formal card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-800">Summary of Findings</h3>
        <h4 className="text-sm text-muted-foreground mb-4">Overview</h4>
        <p className="text-gray-700 leading-relaxed">
          Based on current records, a total of <span className="font-semibold">{summaryTotals.enrolled}</span> students are enrolled. There are
          {' '}<span className="font-semibold">{summaryTotals.failed}</span> students flagged as at risk (failed), representing
          {' '}<span className="font-semibold">{failRateOverall.toFixed(2)}%</span> of the cohort. The overall pass rate is
          {' '}<span className="font-semibold">{passRateOverall.toFixed(2)}%</span>, and the fail rate is
          {' '}<span className="font-semibold">{failRateOverall.toFixed(2)}%</span>. Additionally, <span className="font-semibold">{deficienciesTotal}</span>
          {' '}academic deficiencies were recorded.
        </p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Enrolled</p>
            <p className="text-lg font-semibold text-gray-900">{summaryTotals.enrolled}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">At Risk</p>
            <p className="text-lg font-semibold text-gray-900">{summaryTotals.failed}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pass Rate</p>
            <p className="text-lg font-semibold text-gray-900">{passRateOverall.toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fail Rate</p>
            <p className="text-lg font-semibold text-gray-900">{failRateOverall.toFixed(2)}%</p>
          </div>
        </div>
      </div>

      {/* Charts stack single-column */}
      <div className="flex flex-col gap-6 w-full">
        <div className="bg-card p-5 rounded-lg shadow relative flex flex-col overflow-hidden" style={{ height: chartHeightPR }}>
          <h3 className="text-lg font-semibold mb-4">Pass Rate by Subject</h3>
          <ResponsiveContainer width="100%" height={Math.max(220, chartHeightPR - 60)}>
            <BarChart data={passRateData} layout="vertical" barCategoryGap="26%" margin={{ top: 8, right: 40, bottom: 8, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis type="number" domain={[0, 100]} tick={labelTick} />
              <YAxis type="category" dataKey="name" tick={labelTick} width={260} interval={0} />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Pass Rate']} contentStyle={{ backgroundColor: tooltipBg, color: tooltipColor, boxShadow: '0 10px 15px -3px rgba(99,102,241,0.2)' }} />
              <Legend wrapperStyle={{ color: axisColor, fontSize: 12 }} />
              <Bar dataKey="passRate" name="Pass Rate (%)" radius={[8,8,8,8]} barSize={22}>
                {passRateData.map((row, i) => (
                  <Cell key={`pr-${i}`} fill={row.passRate < 95 ? DANGER : BAR_PALETTE[0]} />
                ))}
                <LabelList dataKey="passRate" position="right" offset={10} formatter={(v) => `${Number(v).toFixed(1)}%`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card p-5 rounded-lg shadow relative h-[340px] flex flex-col overflow-hidden">
          <h3 className="text-lg font-semibold mb-4">Enrollment vs Pass Rate</h3>
          <ResponsiveContainer width="100%" height={280}>
            {(() => {
              const xMin = enrollmentVsPassRate.length ? Math.min(...enrollmentVsPassRate.map(p => p.x)) : 0;
              const xMax = enrollmentVsPassRate.length ? Math.max(...enrollmentVsPassRate.map(p => p.x)) : 0;
              const n = enrollmentVsPassRate.length;
              let a = 0, b = 0;
              if (n > 1) {
                const sumX = enrollmentVsPassRate.reduce((s,p)=>s+p.x,0);
                const sumY = enrollmentVsPassRate.reduce((s,p)=>s+p.y,0);
                const meanX = sumX / n;
                const meanY = sumY / n;
                const covXY = enrollmentVsPassRate.reduce((s,p)=>s+(p.x-meanX)*(p.y-meanY),0);
                const varX = enrollmentVsPassRate.reduce((s,p)=>s+(p.x-meanX)*(p.x-meanX),0);
                a = varX !== 0 ? (covXY / varX) : 0;
                b = meanY - a * meanX;
              }
              const linePts = [
                { x: xMin, y: a * xMin + b },
                { x: xMax, y: a * xMax + b },
              ];
              return (
                <ComposedChart margin={{ top: 20, right: 20 }} data={enrollmentVsPassRate}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis type="number" dataKey="x" name="Enrolled" tick={labelTick} />
                  <YAxis type="number" dataKey="y" name="Pass Rate" domain={[70, 100]} tick={labelTick} />
                  <ZAxis type="number" dataKey="z" range={[120,120]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                    const p = (payload && payload[0] && payload[0].payload) || null;
                    if (!p) return null;
                    return (
                      <div style={{ backgroundColor: tooltipBg, color: tooltipColor, padding: 8, borderRadius: 8, boxShadow: '0 10px 15px -3px rgba(99,102,241,0.2)' }}>
                        <div style={{ fontWeight: 700 }}>{p.name}</div>
                        <div>Enrolled: {p.x}</div>
                        <div>Pass Rate: {Number(p.y).toFixed(2)}%</div>
                      </div>
                    );
                  }} />
                  <Legend wrapperStyle={{ color: axisColor, fontSize: 12 }} />
                  <Scatter data={enrollmentVsPassRate.map(p=>({ ...p, z: 1 }))} fill="#ff6b6b" shape="circle" />
                </ComposedChart>
              );
            })()}
          </ResponsiveContainer>
        </div>

        <div className="bg-card p-5 rounded-lg shadow relative h-[340px] flex flex-col overflow-hidden">
          <h3 className="text-lg font-semibold mb-4">Course Effectiveness Clusters</h3>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis type="number" dataKey="x" name="Total Enrollment" tick={tickFont} />
              <YAxis type="number" dataKey="y" name="Pass Rate (%)" domain={[70, 100]} tick={tickFont} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => name.includes('Pass') ? [`${value}%`, name] : [value, name]} contentStyle={{ backgroundColor: tooltipBg, color: tooltipColor, boxShadow: '0 10px 15px -3px rgba(99,102,241,0.2)' }} />
              <Legend wrapperStyle={{ color: axisColor, fontSize: 12 }} />
              {clusteredSeries.map((series, idx) => (
                <Scatter key={`cluster-${idx}`} data={series} name={clusterNames[idx]} fill={clusterColors[idx]} shape="circle" />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card p-5 rounded-lg shadow relative h-[340px] flex flex-col overflow-hidden">
          <h3 className="text-lg font-semibold mb-4">Performance Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <defs>
                <linearGradient id="gradPassPD" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={PASS_COLOR} stopOpacity={0.92} />
                  <stop offset="100%" stopColor={PASS_COLOR} stopOpacity={1} />
                </linearGradient>
                <linearGradient id="gradFailPD" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={FAIL_COLOR} stopOpacity={0.92} />
                  <stop offset="100%" stopColor={FAIL_COLOR} stopOpacity={1} />
                </linearGradient>
              </defs>
              <Pie data={[{ name: 'Track', value: 1 }]} dataKey="value" cx="50%" cy="50%" innerRadius={80} outerRadius={110} fill={isDark ? '#111827' : '#f3f4f6'} stroke="none" isAnimationActive={false} />
              <Pie data={performanceDistData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={80} outerRadius={110} cornerRadius={12} padAngle={3} stroke="#ffffff" strokeWidth={4} labelLine={false} label={false} isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
                {performanceDistData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.name === 'Passed' ? 'url(#gradPassPD)' : 'url(#gradFailPD)'} />
                ))}
              </Pie>
              <Tooltip content={() => {
                const p = summaryTotals;
                return (
                  <div style={{ backgroundColor: tooltipBg, color: tooltipColor, padding: 8, borderRadius: 8, boxShadow: '0 10px 15px -3px rgba(99,102,241,0.2)' }}>
                    <div style={{ fontWeight: 700 }}>Totals</div>
                    <div>Passed: {p.passed}</div>
                    <div>Failed: {p.failed}</div>
                    <div>Total: {p.enrolled}</div>
                  </div>
                );
              }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-3xl font-bold" style={{ color: '#000000' }}>{Number(passRateOverall || 0).toFixed(2)}%</div>
              <div className="text-xs mt-1" style={{ color: '#333333' }}>Overall Pass Rate</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-center"><span className="inline-flex items-center gap-1 mr-3"><span className="h-2 w-2 rounded-full" style={{background:PASS_COLOR}}></span>Passed</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{background:FAIL_COLOR}}></span>Failed</span></div>
          <div className="mt-3 text-center text-xs text-muted-foreground">Passed ({summaryTotals.passed} of {summaryTotals.enrolled})</div>
        </div>

        {deficienciesTotal === 0 ? (
          <div className="bg-card p-5 rounded-lg shadow relative h-[180px] flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl" style={{ color: '#16A34A' }}>✓</div>
              <div className="text-sm font-medium mt-1">No Deficiencies Detected</div>
            </div>
          </div>
        ) : (
          <div className="bg-card p-5 rounded-lg shadow relative h-[340px] flex flex-col overflow-hidden">
            <h3 className="text-lg font-semibold mb-4">Deficiencies by Subject</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deficienciesData} margin={{ top: 8, right: 40, bottom: 8, left: 8 }} barCategoryGap="22%">
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="name" tick={tickFont} />
                <YAxis tick={tickFont} allowDecimals={false} domain={[0, 'dataMax']} />
                <ReferenceLine y={0} stroke={isDark ? '#9CA3AF' : '#374151'} />
                <Tooltip formatter={(value) => [Number(value), 'Deficiencies']} contentStyle={{ backgroundColor: tooltipBg, color: tooltipColor, boxShadow: '0 10px 15px -3px rgba(99,102,241,0.2)' }} />
                <Legend wrapperStyle={{ color: axisColor, fontSize: 12 }} />
                <Bar dataKey="deficiencies" name="Deficiencies" radius={[6,6,0,0]}>
                  {deficienciesData.map((_, i) => (
                    <Cell key={`df-${i}`} fill={BAR_PALETTE[0]} />
                  ))}
                  <LabelList dataKey="deficiencies" position="top" content={renderNumberLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-card p-5 rounded-lg shadow md:col-span-2 relative h-[340px] flex flex-col overflow-hidden">
          <h3 className="text-lg font-semibold mb-4">Average Pass Rate by Category</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryPerformanceData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="name" tick={tickFont} />
              <YAxis domain={[0, 100]} tick={tickFont} />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Avg Pass Rate']} contentStyle={{ backgroundColor: tooltipBg, color: tooltipColor, boxShadow: '0 10px 15px -3px rgba(99,102,241,0.2)' }} />
              <Legend wrapperStyle={{ color: axisColor, fontSize: 12 }} />
              <Bar dataKey="passRate" name="Average Pass Rate (%)" radius={[6,6,0,0]}>
                {categoryPerformanceData.map((_, i) => (
                  <Cell key={`cat-${i}`} fill={BAR_PALETTE[0]} />
                ))}
                <LabelList dataKey="passRate" position="top" content={renderPercentLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;
