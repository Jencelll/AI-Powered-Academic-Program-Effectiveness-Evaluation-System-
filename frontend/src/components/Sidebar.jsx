import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, FileText, Gauge, Shield, PieChart } from 'lucide-react';

const navItems = [
  { name: 'Data Analysis', href: '/analysis', icon: BarChart3 },
  { name: 'Summary Overview', href: '/summary', icon: PieChart },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Metrics', href: '/metrics', icon: Gauge },
  { name: 'Admin', href: '/admin', icon: Shield },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="hidden md:block w-64 shrink-0">
      <div className="sticky top-16 h-[calc(100vh-4rem)] p-4">
        <div className="rounded-2xl p-5 bg-gradient-to-b from-indigo-600 to-indigo-800 text-white shadow-md">
          <div className="pb-4 border-b border-white/20">
            <h2 className="text-sm font-semibold">Navigation</h2>
          </div>
          <nav className="pt-3 space-y-1">
            {navItems.map(({ name, href, icon: Icon }) => {
              const active = location.pathname === href;
              return (
                <motion.div key={href} whileHover={{ x: 4 }}>
                  <Link
                    to={href}
                    className={`flex items-center gap-3 rounded-lg transition-colors ${
                      active
                        ? 'border-l-4 border-white/70 pl-2 bg-white/20 text-white font-semibold px-3 py-2'
                        : 'px-3 py-2 text-indigo-100 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm">{name}</span>
                  </Link>
                </motion.div>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;