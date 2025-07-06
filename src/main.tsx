import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Get language from localStorage or fallback to English
const language = localStorage.getItem('language') || 'en'
document.documentElement.lang = language
document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
document.getElementById('root')?.classList.add(language === 'ar' ? 'font-arabic' : 'font-sans')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
