import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Button } from './ui/button';

const TopBar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white/80 backdrop-blur border-b border-indigo-200/40 dark:bg-gray-900/60 dark:border-indigo-400/20">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-indigo-900 dark:text-white">AI-CQI Academic Analytics</span>
          <span className="text-xs text-gray-600 dark:text-gray-300">/ {String(user.role).charAt(0).toUpperCase() + String(user.role).slice(1)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-700 dark:text-gray-200">{user.full_name || user.username || user.email}</span>
          <Button variant="outline" onClick={handleLogout} disabled={loading}>
            {loading ? 'Logging out…' : 'Logout'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;