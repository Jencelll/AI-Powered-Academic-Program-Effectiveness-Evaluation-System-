import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ roles, element }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  const userRole = (user?.role || '').toLowerCase();
  const expected = (roles || []).map((r) => (r || '').toLowerCase());
  if (expected.length > 0 && !expected.includes(userRole)) {
    return <Navigate to="/access-denied" replace />;
  }
  return element;
};

export default ProtectedRoute;