import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AcademicYearContext = createContext(null);

export const AcademicYearProvider = ({ children }) => {
  const [sortOrder, setSortOrder] = useState(() => {
    try {
      return localStorage.getItem('ay_sort_order') || 'newest';
    } catch {
      return 'newest';
    }
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    try {
      return localStorage.getItem('ay_selected_year') || 'All';
    } catch {
      return 'All';
    }
  });
  const [availableYears, setAvailableYears] = useState([]);

  useEffect(() => {
    try { localStorage.setItem('ay_sort_order', sortOrder); } catch {}
  }, [sortOrder]);

  useEffect(() => {
    try { localStorage.setItem('ay_selected_year', selectedYear); } catch {}
  }, [selectedYear]);

  const reset = () => {
    setSortOrder('newest');
    setSelectedYear('All');
  };

  const value = useMemo(() => ({
    sortOrder,
    setSortOrder,
    selectedYear,
    setSelectedYear,
    availableYears,
    setAvailableYears,
    reset,
  }), [sortOrder, selectedYear, availableYears]);

  return (
    <AcademicYearContext.Provider value={value}>
      {children}
    </AcademicYearContext.Provider>
  );
};

export const useAcademicYear = () => {
  const ctx = useContext(AcademicYearContext);
  if (!ctx) throw new Error('useAcademicYear must be used within AcademicYearProvider');
  return ctx;
};