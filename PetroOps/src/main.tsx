import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { PetroOpsThemeProvider } from './design-system/PetroOpsThemeProvider';

const queryClient = new QueryClient();
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI?.isElectron === true;
const RouterComponent = isElectron ? HashRouter : BrowserRouter;

if (isElectron) {
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.startsWith('/api/')) {
      url = `http://localhost:3001${url}`;
      console.log(`[Electron Fetch Rewrite] ${url}`);
      if (typeof input === 'string') {
        input = url;
      } else if (input instanceof URL) {
        input = new URL(url);
      } else {
        input = new Request(url, input);
      }
    }
    return originalFetch(input, init);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterComponent>
        <PetroOpsThemeProvider>
          <App />
        </PetroOpsThemeProvider>
      </RouterComponent>
    </QueryClientProvider>
  </StrictMode>
);

