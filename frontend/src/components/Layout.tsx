import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout: React.FC = () => {
  const location = useLocation();

  // Helper to map route paths to page titles
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Dashboard Analytics';
      case '/submit':
        return 'File a New Case';
      case '/cases':
        return 'Case Tracker';
      case '/escalations':
        return 'Escalation Resolution Center';
      case '/reports':
        return 'Data Reports & Export';
      case '/admin/partners':
        return 'Partner Administration';
      case '/profile':
        return 'User Profile Page';
      default:
        if (location.pathname.startsWith('/cases/')) return 'Case Review';
        return 'Partner CRM';
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        {/* Header Bar */}
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/65 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-foreground font-display">{getPageTitle()}</h1>
            <p className="text-xs text-muted-foreground">Monitor and manage file operations in real time.</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted border border-border">
              UTC: {new Date().toISOString().slice(11, 16)}
            </span>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
