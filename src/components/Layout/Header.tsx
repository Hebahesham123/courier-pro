import React from 'react'
import { LogOut, Globe } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'

const Header: React.FC = () => {
  const { user, signOut } = useAuth()
  const { language, setLanguage, t } = useLanguage()

  const handleLanguageToggle = () => {
    setLanguage(language === 'en' ? 'ar' : 'en')
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              {user?.role === 'admin' ? t('adminDashboard') : t('courierDashboard')}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <button
              onClick={handleLanguageToggle}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Globe className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {language === 'en' ? 'العربية' : 'English'}
            </button>
            
            <div className="text-sm text-gray-600">
              {user?.name || user?.email}
            </div>
            
            <button
              onClick={signOut}
              className="flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {t('logout')}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header