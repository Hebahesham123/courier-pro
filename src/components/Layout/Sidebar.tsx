"use client"

import type React from "react"
import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  Package,
  Users,
  Upload,
  Truck,
  ChevronLeft,
  ChevronRight,
  User,
  Home,
  FileText,
} from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { useLanguage } from "../../contexts/LanguageContext"

const Sidebar: React.FC = () => {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const adminMenuItems = [
    { path: "/admin", icon: Home, label: t("dashboard"), color: "text-blue-400" },
    { path: "/admin/orders", icon: Package, label: t("orders"), color: "text-green-400" },
    { path: "/admin/upload", icon: Upload, label: t("uploadOrders"), color: "text-purple-400" },
    { path: "/admin/couriers", icon: Users, label: t("couriers"), color: "text-orange-400" },
    { path: "/admin/reports", icon: FileText, label: t("reports"), color: "text-pink-400" },
  ]

  const courierMenuItems = [
    { path: "/courier", icon: Home, label: t("dashboard"), color: "text-blue-400" },
    { path: "/courier/orders", icon: Truck, label: t("myOrders"), color: "text-green-400" },
  ]

  const menuItems = user?.role === "admin" ? adminMenuItems : courierMenuItems
  const isRTL = language === "ar"

  const getUserInitials = (name?: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getUserRole = () => {
    return user?.role === "admin"
      ? `${t("administrator")} / ${t("administrator")}`
      : `${t("courier")} / ${t("courier")}`
  }

  return (
    <div
      className={`bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-72"
      } min-h-screen relative shadow-2xl`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute ${isRTL ? "-left-3" : "-right-3"} top-8 bg-gray-800 hover:bg-gray-700 text-white rounded-full p-1.5 shadow-lg transition-all duration-200 border border-gray-600 z-10`}
      >
        {isCollapsed ? (
          isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
        ) : isRTL ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Header */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <Truck className="w-8 h-8 text-white" />
          </div>
          {!isCollapsed && (
            <div className={`${isRTL ? "mr-4" : "ml-4"}`}>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                CourierPro
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">Delivery Management</p>
            </div>
          )}
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {getUserInitials(user?.name)}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800"></div>
          </div>
          {!isCollapsed && (
            <div className={`${isRTL ? "mr-3" : "ml-3"} flex-1 min-w-0`}>
              <div className="text-sm font-semibold text-white truncate">{user?.name || "User"}</div>
              <div className="text-xs text-gray-400 truncate">{getUserRole()}</div>
              <div className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative overflow-hidden ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-[1.02]"
                    : "text-gray-300 hover:bg-gray-800/50 hover:text-white hover:transform hover:scale-[1.01]"
                }`}
                title={isCollapsed ? item.label : ""}
              >
                {isActive && (
                  <div
                    className={`absolute ${isRTL ? "right-0" : "left-0"} top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-purple-400 ${isRTL ? "rounded-l-full" : "rounded-r-full"}`}
                  ></div>
                )}
                <div className={`flex-shrink-0 ${isActive ? "text-white" : item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {!isCollapsed && <span className={`${isRTL ? "mr-3" : "ml-3"} truncate`}>{item.label}</span>}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default Sidebar
