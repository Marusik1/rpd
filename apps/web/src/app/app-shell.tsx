import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AppShell({ children }: { children: ReactNode }) { return <div className="app-shell"><header role="banner"><Link to="/">РПД</Link></header><main>{children}</main><nav aria-label="Основная навигация"><Link to="/">Главная</Link><Link to="/favorites">Избранное</Link><Link to="/profile">Профиль</Link></nav></div>; }
