import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';

// No StrictMode: it double-runs the boot effect in dev (two worlds, two Input.init()).
createRoot(document.getElementById('root')!).render(<App />);
