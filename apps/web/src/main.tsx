import { StrictMode } from 'react'; import { createRoot } from 'react-dom/client';
import { AppProviders } from './app/app-providers.js'; import { AppShell } from './app/app-shell.js'; import { ErrorBoundary } from './app/error-boundary.js'; import { AppRoutes } from './app/router.js'; import './styles.css';
createRoot(document.getElementById('root')!).render(<StrictMode><AppProviders><AppShell><ErrorBoundary><AppRoutes /></ErrorBoundary></AppShell></AppProviders></StrictMode>);
