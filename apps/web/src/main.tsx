import { StrictMode } from 'react'; import { createRoot } from 'react-dom/client';
import { AppProviders } from './app/app-providers.js'; import { AppShell } from './app/app-shell.js'; import { ErrorBoundary } from './app/error-boundary.js'; import { AppRoutes } from './app/router.js'; import './styles/tokens.css'; import './styles/global.css'; import './styles/components.css';
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element is missing');
createRoot(rootElement).render(<StrictMode><AppProviders><AppShell><ErrorBoundary><AppRoutes /></ErrorBoundary></AppShell></AppProviders></StrictMode>);
