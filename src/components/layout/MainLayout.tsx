import { useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { DocPanel } from './DocPanel';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isDocOpen, setIsDocOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar onOpenDoc={() => setIsDocOpen(true)} />
      
      <main className="ml-64 min-h-screen">
        {children}
      </main>
      
      <DocPanel isOpen={isDocOpen} onClose={() => setIsDocOpen(false)} />
    </div>
  );
}
