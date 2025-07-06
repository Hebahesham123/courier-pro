import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Set up direction and font based on saved language
const language = localStorage.getItem('language') === 'ar' ? 'ar' : 'en'

// Apply language and direction to document root
document.documentElement.lang = language
document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'

// Add appropriate font class to <body>
const rootElement = document.getElementById('root')
if (rootElement) {
  rootElement.classList.add(language === 'ar' ? 'font-arabic' : 'font-sans')

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
} else {
  console.error('❌ Root element not found in index.html')
}
