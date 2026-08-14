import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Only ever start dark if the rider explicitly picked it via the in-app
// toggle before (persisted here) — never infer it from the device's system
// dark-mode setting. The map's dark tile layer looks broken/near-black on
// some devices, so it must stay an intentional choice, not an automatic one.
const storedTheme = localStorage.getItem('transitgo-theme');
const initialTheme = storedTheme === 'dark' ? 'dark' : 'light';
document.documentElement.setAttribute('data-theme', initialTheme);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)