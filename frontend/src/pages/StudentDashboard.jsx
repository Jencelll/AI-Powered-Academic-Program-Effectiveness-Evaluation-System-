import React, { useContext } from 'react';
import Navbar from '../components/NavBar';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Student Dashboard</h1>
            <p className="text-sm text-gray-700 dark:text-gray-300">Your personal analytics overview.</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl shadow-lg bg-white dark:bg-gray-800 border border-indigo-200/50 dark:border-indigo-400/30">
            <h2 className="text-lg font-semibold text-indigo-900 dark:text-white">Grades Overview</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">Your latest grades and trends will appear here.</p>
          </div>
          <div className="p-5 rounded-2xl shadow-lg bg-white dark:bg-gray-800 border border-indigo-200/50 dark:border-indigo-400/30">
            <h2 className="text-lg font-semibold text-indigo-900 dark:text-white">Predicted Performance</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">AI predictions and recommendations based on your records.</p>
          </div>
          <div className="p-5 rounded-2xl shadow-lg bg-white dark:bg-gray-800 border border-indigo-200/50 dark:border-indigo-400/30">
            <h2 className="text-lg font-semibold text-indigo-900 dark:text-white">Weak Subjects & Strengths</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">Focus areas and strengths derived from analysis.</p>
          </div>
          <div className="p-5 rounded-2xl shadow-lg bg-white dark:bg-gray-800 border border-indigo-200/50 dark:border-indigo-400/30">
            <h2 className="text-lg font-semibold text-indigo-900 dark:text-white">Risk Level & Deficiency Status</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">Your current risk status and deficiencies if any.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;