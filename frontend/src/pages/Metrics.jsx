import React, { useEffect, useState } from 'react';
import Navbar from '../components/NavBar';
import Sidebar from '../components/Sidebar';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { fetchDashboardData } from '../services/api';
import { Progress } from '../components/ui/progress';
import { useAcademicYear } from '../context/AcademicYearContext';
import { formatAcademicYearRange } from '../utils/academicYear';

const Metrics = () => {
  const [metrics, setMetrics] = useState({ accuracy: 0, precision: 0, recall: 0, f1_weighted: 0, f1_macro: 0 });

  useEffect(() => {
    (async () => {
      const data = await fetchDashboardData();
      const latest = data?.latest_metrics || {};
      setMetrics({
        accuracy: Number(latest.accuracy || 0),
        precision: Number(latest.precision || 0),
        recall: Number(latest.recall || 0),
        f1_weighted: Number(latest.f1_weighted || 0),
        f1_macro: Number(latest.f1_macro || 0),
      });
    })();
  }, []);

  const items = [
    { label: 'Accuracy', value: metrics.accuracy },
    { label: 'Precision', value: metrics.precision },
    { label: 'Recall', value: metrics.recall },
    { label: 'F1-Weighted', value: metrics.f1_weighted },
    { label: 'F1-Macro', value: metrics.f1_macro },
  ];

  const { selectedYear } = useAcademicYear();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container">
        <div className="flex gap-6">
          <Sidebar />
          <main className="flex-1 py-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Model & Analysis Metrics</CardTitle>
                  {selectedYear !== 'All' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                      A.Y. {formatAcademicYearRange(selectedYear)}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map(({ label, value }) => (
                    <div key={label} className="p-4 rounded-2xl border">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">{label}</span>
                        <span className="text-sm font-medium">{(Number(value) * 100).toFixed(2)}%</span>
                      </div>
                      <Progress value={Number(value) * 100} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Metrics;