"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  Package,
  Users,
  Upload,
  Truck,
  ChevronLeft,
  ChevronRight,
  Home,
  FileText,
  X,
  Menu,
  BarChart3,
  Settings,
  
  Bell,
  Shield,
} from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { useLanguage } from "../../contexts/LanguageContext"

interface MenuItem {
  path: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: string
  badge?: number
  description?: string
}

interface UserProfile {
  name?: string
  email?: string
  role?: string
  avatar?: string
}

const Sidebar: React.FC = () => {
  const { user,  } = useAuth()
  const { t, language } = useLanguage()
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications] = useState() // Example notification count

  const isRTL = language === "ar"

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebarOpen(false)
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  const adminMenuItems: MenuItem[] = [
    {
      path: "/admin",
      icon: Home,
      label: t("dashboard") || "لوحة التحكم",
      color: "text-blue-400",
      description: "نظرة عامة على النظام",
    },
    {
      path: "/admin/orders",
      icon: Package,
      label: t("orders") || "إدارة الطلبات",
      color: "text-green-400",
      description: "إدارة ومتابعة الطلبات",
    },
    {
      path: "/admin/upload",
      icon: Upload,
      label: t("uploadOrders") || "رفع الطلبات",
      color: "text-purple-400",
      description: "رفع ملفات الطلبات",
    },
    {
      path: "/admin/couriers",
      icon: Users,
      label: t("couriers") || "المندوبين",
      color: "text-orange-400",
      description: "إدارة المندوبين",
    },
    {
      path: "/admin/reports",
      icon: FileText,
      label: t("reports") || "التقارير",
      color: "text-pink-400",
      description: "تقارير الأداء والإحصائيات",
    },
    
  ]

  const courierMenuItems: MenuItem[] = [
    {
      path: "/courier",
      icon: Home,
      label: t("لوحه التحكم") || "لوحة التحكم",
      color: "text-blue-400",
      description: "نظرة عامة على طلباتي",
    },
    {
      path: "/courier/orders",
      icon: Truck,
      label: t("طلباطي") || "طلباتي",
      color: "text-green-400",
      description: "طلبات التوصيل المخصصة لي",
    },
   
  ]

  const menuItems = user?.role === "admin" ? adminMenuItems : courierMenuItems

  const getUserInitials = (name?: string): string => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getUserRole = (): string => {
    const roleTranslations = {
      admin: "مدير النظام",
      courier: "مندوب توصيل",
    }
    return roleTranslations[user?.role as keyof typeof roleTranslations] || user?.role || "مستخدم"
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        className={`fixed top-4 z-50 p-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-lg transition-all duration-200 lg:hidden ${
          isRTL ? "right-4" : "left-4"
        }`}
        onClick={toggleSidebar}
        aria-label="فتح القائمة الجانبية"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          aria-label="إغلاق القائمة الجانبية"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 ${isRTL ? "right-0" : "left-0"} z-50 h-full bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white shadow-2xl transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-20" : "w-80"
        } ${
          sidebarOpen ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"
        } lg:translate-x-0 lg:static`}
        dir={isRTL ? "rtl" : "ltr"}
        role="navigation"
        aria-label="القائمة الرئيسية"
      >
        {/* Header Section */}
        <div className="relative">
          {/* Collapse Button */}
          <button
            onClick={toggleCollapse}
            className={`absolute ${
              isRTL ? "-left-4" : "-right-4"
            } top-8 bg-gray-800 hover:bg-gray-700 text-white rounded-full p-2 shadow-lg border border-gray-600 z-10 transition-all duration-200 hidden lg:flex items-center justify-center`}
            aria-label={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
          >
            {isCollapsed ? (
              isRTL ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )
            ) : isRTL ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          {/* Close Button (Mobile) */}
          <button
            onClick={() => setSidebarOpen(false)}
            className={`absolute top-4 ${
              isRTL ? "left-4" : "right-4"
            } text-white bg-gray-700 hover:bg-gray-600 p-2 rounded-xl lg:hidden transition-colors duration-200`}
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Logo Section */}
          <div className="p-6 border-b border-gray-700/50">
            <div className="flex items-center">
              <div className="relative">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <Truck className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
              </div>
              {!isCollapsed && (
                <div className={`${isRTL ? "mr-4" : "ml-4"} flex-1`}>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    CourierPro
                  </h1>
                  <p className="text-xs text-gray-400 mt-1">نظام إدارة التوصيل</p>
                </div>
              )}
            </div>
          </div>

          {/* Profile Section */}
          <div className="p-4 border-b border-gray-700/50">
            <div className="flex items-center">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {user?.avatar ? (
                    <img
                      src={user.avatar || "/placeholder.svg"}
                      alt={user.name}
                      className="w-full h-full rounded-xl object-cover"
                    />
                  ) : (
                    getUserInitials(user?.name)
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800"></div>
              </div>
              {!isCollapsed && (
                <div className={`${isRTL ? "mr-3" : "ml-3"} flex-1 min-w-0`}>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-white truncate">{user?.name || "مستخدم"}</div>
                    {user?.role === "admin" && <Shield className="w-4 h-4 text-yellow-400" />}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{getUserRole()}</div>
                  <div className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-4" role="menu">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative overflow-hidden ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-[1.02]"
                      : "text-gray-300 hover:bg-gray-800/50 hover:text-white hover:transform hover:scale-[1.01]"
                  }`}
                  title={isCollapsed ? item.label : item.description}
                  role="menuitem"
                >
                  {/* Active Indicator */}
                  {isActive && (
                    <div
                      className={`absolute ${isRTL ? "right-0" : "left-0"} top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-purple-400 ${
                        isRTL ? "rounded-l-full" : "rounded-r-full"
                      }`}
                    />
                  )}

                  {/* Icon */}
                  <div className={`flex-shrink-0 relative ${isActive ? "text-white" : item.color}`}>
                    <Icon className="w-5 h-5" />
                    {/* Badge */}
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </div>

                  {/* Label and Description */}
                  {!isCollapsed && (
                    <div className={`${isRTL ? "mr-3" : "ml-3"} flex-1 min-w-0`}>
                      <div className="truncate">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-gray-400 truncate mt-0.5">{item.description}</div>
                      )}
                    </div>
                  )}

                  {/* Notification Badge for specific items */}
                  {item.path === "/admin" && notifications > 0 && !isCollapsed && (
                    <div className="flex items-center gap-1">
                      <Bell className="w-4 h-4 text-yellow-400" />
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                        {notifications}
                      </span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Footer Section */}
        <div className="p-4 border-t border-gray-700/50">
          {!isCollapsed && (
            <div className="mb-4 p-3 bg-gray-800/50 rounded-xl">
              <div className="text-xs text-gray-400 mb-1">حالة النظام</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400">متصل</span>
              </div>
            </div>
          )}

          
        </div>
      </aside>
    </>
  )
}

export default Sidebar
