import { App } from './App';
import { createRoot } from 'react-dom/client';

document.addEventListener('DOMContentLoaded', async () => {
  const appDiv = document.getElementById('app');
  if (appDiv) {
    createRoot(appDiv).render(<App />);
  }
});
