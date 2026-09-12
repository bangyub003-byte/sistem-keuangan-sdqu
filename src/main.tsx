import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { checkFrontendBuildVersion } from './utils/versionCheck';

// Periksa versi frontend & bypass browser cache jika ada build baru
const isReloading = checkFrontendBuildVersion();

if (!isReloading) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

