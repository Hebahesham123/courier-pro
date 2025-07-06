import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

try {
  const language = localStorage?.getItem('language') || 'en'
  document.documentElement.lang = language
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
} catch (e) {
  // fallback if localStorage fails
  document.documentElement.lang = 'en'
  document.documentElement.dir = 'ltr'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
