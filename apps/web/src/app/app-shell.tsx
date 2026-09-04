import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { BottomNavigation, MobileHeader } from '../components/mobile-ui.js';

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const showBottomNavigation = pathname === '/' || pathname === '/favorites' || pathname === '/profile';
  return <div className={`app-shell${showBottomNavigation ? ' with-bottom-nav' : ''}`}><MobileHeader /><main className="app-main">{children}</main>{showBottomNavigation && <BottomNavigation />}</div>;
}
