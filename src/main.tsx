import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 15 * 60 * 1000, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);

// Remove splash once React has painted
requestAnimationFrame(() =>
  requestAnimationFrame(() => {
    const splash = document.getElementById('splash');
    if (splash) splash.style.animation = 'splash-fade 0.3s ease forwards';
  })
);
