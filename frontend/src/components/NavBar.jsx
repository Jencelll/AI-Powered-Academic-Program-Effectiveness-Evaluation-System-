import React, { useEffect, useState, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { AuthContext } from '../context/AuthContext';
// Removed academic year controls from NavBar; pages will handle year filtering

const Navbar = ({ title, logos = [] }) => {
  const { user } = useContext(AuthContext);
  const homeHref = useMemo(() => {
    if (user) return '/';
    return '/login';
  }, [user]);

  const navItems = [
    { name: 'Home', href: homeHref },
    { name: 'Upload', href: '/upload' },
    { name: 'Subjects', href: '/subjects' },
    { name: 'Analysis', href: '/analysis' },
    { name: 'Student Risk Dashboard', href: '/risk-dashboard' },
  ];

  const appTitle = title || process.env.REACT_APP_APP_NAME || 'College of Computer Studies - LSPU SCC';

  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = stored ? stored === 'dark' : prefersDark;
    setIsDark(initialDark);
    document.documentElement.classList.toggle('dark', initialDark);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      if (!localStorage.getItem('theme')) {
        setIsDark(e.matches);
        document.documentElement.classList.toggle('dark', e.matches);
        window.dispatchEvent(new Event('themechange'));
      }
    };
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    window.dispatchEvent(new Event('themechange'));
  };

  const envLogos = (process.env.REACT_APP_LOGO_URLS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const logoUrls = logos.length ? logos : envLogos.length ? envLogos : ['/lspu.jfif', '/ccs-logo.svg'];

  // Academic year controls removed; no context wiring here

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 w-full border-b bg-white/60 dark:bg-gray-900/70 backdrop-blur supports-[backdrop-filter]:bg-white/50"
    >
      {/* Animated gradient accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 animate-gradient-slower" />
      <div className="container flex h-16 items-center justify-between">
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center space-x-3"
        >
          <div className="flex items-center gap-2">
            {logoUrls.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt="Institution Logo"
                className="h-9 w-9 rounded-full object-cover border border-white/50 dark:border-gray-700/60 shadow-md drop-shadow-sm"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ))}
          </div>
          <span className="text-lg md:text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 via-purple-700 to-blue-700 dark:from-indigo-300 dark:via-purple-300 dark:to-blue-300">
            {appTitle}
          </span>
        </motion.div>
        <div className="hidden md:flex items-center space-x-2 lg:space-x-6 text-sm font-medium">
          {navItems.map((item) => (
            <Button
              key={item.name}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-full px-3"
              asChild
            >
              <Link to={item.href}>{item.name}</Link>
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="text-xs px-3 py-1 rounded-full border transition-all duration-300 ease-in-out bg-white/70 hover:bg-white shadow-sm hover:shadow-md dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </button>
          <Button variant="outline" size="sm" className="rounded-full hover:border-primary/50 hover:text-primary" asChild>
            <Link to="/admin">Admin</Link>
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full hover:bg-muted/40" asChild>
            <Link to="/admin/settings">Settings</Link>
          </Button>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
