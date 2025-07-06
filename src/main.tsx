import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Detect language from localStorage or fallback to English
const language = localStorage.getItem('language') || 'en'

// Dynamically set <html lang="..."> and dir="rtl/ltr"
document.documentElement.lang = language
document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
