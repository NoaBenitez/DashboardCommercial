import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  Settings,
  FileBarChart,
  HelpCircle,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useData } from '@/contexts/DataContext';

const navItems = [
  { 
    icon: Upload, 
    label: 'Import', 
    path: '/',
    requiresData: false,
  },
  { 
    icon: LayoutDashboard, 
    label: 'Dashboard', 
    path: '/dashboard',
    requiresData: true,
  },
  {
    icon: FileBarChart,
    label: 'Données',
    path: '/data',
    requiresData: true,
  },
  {
    icon: TrendingUp,
    label: 'Évolution',
    path: '/evolution',
    requiresData: false,
  },
  {
    icon: Settings,
    label: 'Paramètres',
    path: '/settings',
    requiresData: false,
  },
];

interface AppSidebarProps {
  onOpenDoc: () => void;
}

export function AppSidebar({ onOpenDoc }: AppSidebarProps) {
  const location = useLocation();
  const { hasData } = useData();
  
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <img src="/logopsl.jpg" alt="PSL" className="h-9 w-9 rounded-lg object-contain bg-white" />
          <div>
            <h1 className="text-sm font-semibold text-sidebar-foreground">
              PSL
            </h1>
            <p className="text-xs text-sidebar-muted">Dashboard Commercial</p>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isDisabled = item.requiresData && !hasData;
            
            if (isDisabled) {
              return (
                <div
                  key={item.path}
                  className="sidebar-nav-item cursor-not-allowed opacity-40"
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </div>
              );
            }
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn('sidebar-nav-item', isActive && 'active')}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* Footer */}
        <div className="border-t border-sidebar-border p-4">
          <button
            onClick={onOpenDoc}
            className="sidebar-nav-item w-full"
          >
            <HelpCircle className="h-5 w-5" />
            <span>Documentation</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
