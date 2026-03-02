import React, { useContext } from 'react';
import Navbar from '../components/NavBar';
import UploadForm from '../components/UploadForm';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const FacultyDashboard = () => {
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
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Faculty Dashboard</h1>
            <p className="text-sm text-gray-700 dark:text-gray-300">Manage and analyze your own class records.</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Logout
          </button>
        </div>

        <section className="grid grid-cols-1 gap-8">
          <div>
            <h2 className="text-xl font-semibold text-indigo-900 dark:text-white mb-3">Upload New Class Records</h2>
            <UploadForm onUploadSuccess={() => { /* Navigate or refresh analysis route if needed */ }} />
          </div>
        </section>
      </main>
    </div>
  );
};

export default FacultyDashboard;