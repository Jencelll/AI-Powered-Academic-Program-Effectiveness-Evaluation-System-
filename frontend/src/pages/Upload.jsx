import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/NavBar';
import UploadForm from '../components/UploadForm';
import FileManager from '../components/FileManager';

const Upload = () => {
  const navigate = useNavigate();
  const handleSuccess = () => {
    // Navigate to Analysis to show the full AI-generated output
    navigate('/analysis');
  };

  const isAdminMode = typeof window !== 'undefined' && localStorage.getItem('adminMode') === 'true';

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      <main className="relative max-w-3xl mx-auto px-6 py-16">
        {/* Decorative gradient blob */}
        <div className="pointer-events-none absolute -top-10 -right-24 h-56 w-56 rounded-full bg-gradient-to-br from-indigo-300 to-blue-400 opacity-30 blur-2xl dark:from-indigo-700 dark:to-blue-600" />

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Upload & Analyze</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">Upload the required files to run the AI analysis.</p>
          {isAdminMode && (
            <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">Admin Mode</span>
          )}
        </div>
        

        {/* Existing AI analysis upload */}
        <UploadForm onUploadSuccess={handleSuccess} />
        <div className="mt-8">
          <FileManager />
        </div>
      </main>
    </div>
  );
};

export default Upload;
