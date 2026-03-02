import React from 'react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

const AccessDenied = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <h1 className="text-2xl font-bold text-indigo-900 dark:text-white">Access Denied</h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">You do not have permission to view this page.</p>
        <div className="mt-6 flex gap-3 justify-center">
          <Button onClick={() => navigate('/login')} className="bg-indigo-600 text-white">Go to Login</Button>
          <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;