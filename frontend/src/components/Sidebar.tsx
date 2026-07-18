import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, 
  FilePlus, 
  FolderOpen, 
  AlertTriangle, 
  Download, 
  Users, 
  Sun, 
  Moon, 
  LogOut,
  Building2,
  ShieldCheck
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/submit', label: 'File a New Case', icon: FilePlus, roles: ['PARTNER'] },
    { to: '/cases', label: 'My Cases', icon: FolderOpen },
    { to: '/escalations', label: 'Escalation Center', icon: AlertTriangle },
    { to: '/reports', label: 'Reports & Export', icon: Download },
  ];

  // Admin specific nav items
  const adminNavItems = [
    { to: '/admin/partners', label: 'Manage Partners', icon: Users },
  ];

  const filteredNavItems = navItems.filter(item => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <aside className="w-64 bg-card/90 border-r border-border h-screen flex flex-col fixed left-0 top-0 z-20 backdrop-blur-md">
      {/* Brand Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border gap-2">
        <div className="bg-primary/10 text-primary p-2 rounded-lg">
          <Building2 size={20} className="animate-pulse-soft" />
        </div>
        <div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">PartnerCRM</span>
          <span className="text-[10px] block text-muted-foreground font-semibold tracking-wider uppercase -mt-1">Enterprise B2B</span>
        </div>
      </div>

      {/* User Card */}
      <div 
        onClick={() => navigate('/profile')}
        className="p-4 border-b border-border bg-muted/40 m-3 rounded-xl cursor-pointer hover:bg-muted/70 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 group border border-transparent hover:border-primary/20"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-250">
            {user?.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate leading-none mb-1 group-hover:text-primary transition-all duration-200">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate leading-none mb-1">{user?.email}</p>
            {user?.role === 'ADMIN' ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                <ShieldCheck size={10} /> Admin Ops
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 truncate max-w-[120px]">
                💼 {user?.partner?.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Main Menu</p>
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}

        {user?.role === 'ADMIN' && (
          <div className="pt-4 mt-4 border-t border-border">
            <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Admin Panel</p>
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }
                  `}
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer Controls */}
      <div className="p-4 border-t border-border mt-auto flex flex-col gap-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
        >
          {theme === 'dark' ? (
            <>
              <Sun size={18} className="text-amber-500" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={18} />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
