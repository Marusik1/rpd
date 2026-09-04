import type { ReactNode } from 'react';
import { BottomNavigation, MobileHeader } from '../components/mobile-ui.js';

export function AppShell({ children }: { children: ReactNode }) { return <div className="app-shell"><MobileHeader /><main className="app-main">{children}</main><BottomNavigation /></div>; }
