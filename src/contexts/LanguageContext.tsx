"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

interface LanguageContextType {
  language: "en" | "ar"
  setLanguage: (lang: "en" | "ar") => void
  t: (key: string) => string
}

const translations = {
  en: {
    // Auth
    login: "Login",
    email: "Email",
    password: "Password",
    signIn: "Sign In",
    invalidCredentials: "Invalid credentials",

    // Navigation
    dashboard: "Dashboard",
    orders: "Orders",
    couriers: "Couriers",
    reports: "Reports",
    logout: "Logout",

    // Admin Panel
    adminDashboard: "Admin Dashboard",
    uploadOrders: "Upload Orders",
    uploadExcel: "Upload Excel File",
    assignOrders: "Assign Orders",
    selectCourier: "Select Courier",
    assign: "Assign",

    // Courier Panel
    courierDashboard: "Courier Dashboard",
    myOrders: "My Orders",
    todaySummary: "Today's Summary",

    // Orders
    orderId: "Order ID",
    customerName: "Customer Name",
    address: "Address",
    mobile: "Mobile",
    totalAmount: "Total Amount",
    paymentMethod: "Payment Method",
    status: "Status",
    actions: "Actions",

    // Status
    pending: "Pending",
    assigned: "Assigned",
    delivered: "Delivered",
    canceled: "Canceled",
    partial: "Partial",

    // Payment Methods
    cash: "Cash",
    card: "Card",
    valu: "VALU",

    // Actions
    done: "Done",
    cancel: "Cancel",
    markDelivered: "Mark as Delivered",
    markCanceled: "Mark as Canceled",
    markPartial: "Mark as Partial",
    deliveryFee: "Delivery Fee",
    partialAmount: "Partial Amount",
    comment: "Comment",
    save: "Save",

    // Summary
    totalDelivered: "Total Delivered",
    totalCashCollected: "Total Cash Collected",
    totalDeliveryFees: "Total Delivery Fees",
    canceledOrders: "Canceled Orders",
    partialOrders: "Partial Orders",
    grandTotal: "Grand Total",

    // Common
    loading: "Loading...",
    error: "Error",
    success: "Success",
    noData: "No data available",
    search: "Search",
    filter: "Filter",
    export: "Export",
    date: "Date",
    today: "Today",

    // Additional for Sidebar
    analytics: "Analytics",
    settings: "Settings",
    notifications: "Notifications",
    profile: "Profile",
    systemStatus: "System Status",
    online: "Online",
    administrator: "Administrator",
    courier: "Courier",
    viewDetails: "View Details",
    markAllRead: "Mark All Read",
    clearAll: "Clear All",
    orderNoteAdded: "Order Note Added",
    courierAddedNote: "Courier added a note to order",
    justNow: "Just now",
    minutesAgo: "minutes ago",
    hoursAgo: "hours ago",
    daysAgo: "days ago",
    orderDetails: "Order Details",
    phone: "Phone",
    amount: "Amount",
    note: "Note",
  },
  ar: {
    // Auth
    login: "تسجيل الدخول",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    signIn: "دخول",
    invalidCredentials: "بيانات غير صحيحة",

    // Navigation
    dashboard: "لوحة التحكم",
    orders: "الطلبات",
    couriers: "المناديب",
    reports: "التقارير",
    logout: "تسجيل الخروج",

    // Admin Panel
    adminDashboard: "لوحة تحكم الإدارة",
    uploadOrders: "رفع الطلبات",
    uploadExcel: "رفع ملف Excel",
    assignOrders: "تعيين الطلبات",
    selectCourier: "اختر المندوب",
    assign: "تعيين",

    // Courier Panel
    courierDashboard: "لوحة تحكم المندوب",
    myOrders: "طلباتي",
    todaySummary: "ملخص اليوم",

    // Orders
    orderId: "رقم الطلب",
    customerName: "اسم العميل",
    address: "العنوان",
    mobile: "الهاتف",
    totalAmount: "المبلغ الإجمالي",
    paymentMethod: "طريقة الدفع",
    status: "الحالة",
    actions: "الإجراءات",

    // Status
    pending: "في الانتظار",
    assigned: "معين",
    delivered: "تم التوصيل",
    canceled: "ملغي",
    partial: "جزئي",

    // Payment Methods
    cash: "نقدي",
    card: "بطاقة",
    valu: "فالو",

    // Actions
    done: "تم",
    cancel: "إلغاء",
    markDelivered: "تم التوصيل",
    markCanceled: "إلغاء الطلب",
    markPartial: "دفع جزئي",
    deliveryFee: "رسوم التوصيل",
    partialAmount: "المبلغ الجزئي",
    comment: "تعليق",
    save: "حفظ",

    // Summary
    totalDelivered: "إجمالي المُسلم",
    totalCashCollected: "إجمالي النقد المحصل",
    totalDeliveryFees: "إجمالي رسوم التوصيل",
    canceledOrders: "الطلبات الملغية",
    partialOrders: "الطلبات الجزئية",
    grandTotal: "الإجمالي العام",

    // Common
    loading: "جارٍ التحميل...",
    error: "خطأ",
    success: "نجح",
    noData: "لا توجد بيانات",
    search: "بحث",
    filter: "فلتر",
    export: "تصدير",
    date: "التاريخ",
    today: "اليوم",

    // Additional for Sidebar
    analytics: "التحليلات",
    settings: "الإعدادات",
    notifications: "الإشعارات",
    profile: "الملف الشخصي",
    systemStatus: "حالة النظام",
    online: "متصل",
    administrator: "مدير",
    courier: "مندوب",
    viewDetails: "عرض التفاصيل",
    markAllRead: "تحديد الكل كمقروء",
    clearAll: "مسح الكل",
    orderNoteAdded: "تمت إضافة ملاحظة للطلب",
    courierAddedNote: "أضاف المندوب ملاحظة للطلب",
    justNow: "الآن",
    minutesAgo: "دقائق مضت",
    hoursAgo: "ساعات مضت",
    daysAgo: "أيام مضت",
    orderDetails: "تفاصيل الطلب",
    phone: "الهاتف",
    amount: "المبلغ",
    note: "الملاحظة",
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<"en" | "ar">("en")

  useEffect(() => {
    const savedLang = localStorage.getItem("language") as "en" | "ar" | null
    if (savedLang) {
      setLanguage(savedLang)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("language", language)
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr"
    document.documentElement.lang = language
  }, [language])

  const t = (key: string): string => {
    return translations[language][key as keyof (typeof translations)["en"]] ?? key
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
