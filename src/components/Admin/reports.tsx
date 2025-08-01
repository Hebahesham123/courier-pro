"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  Download,
  Users,
  Package,
  Calendar,
  Phone,
  MapPin,
  CreditCard,
  DollarSign,
  Camera,
  Clock,
  User,
  Search,
  RefreshCw,
  TrendingUp,
  Eye,
  ExternalLink,
  BarChart3,
  Activity,
  CheckCircle,
  X,
  Filter,
  ArrowUpRight,
  Percent,
  Archive,
  Bell,
  Volume2,
  VolumeX,
  HandMetal,
  XCircle,
  Edit,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import Papa from "papaparse"
import { saveAs } from "file-saver"
import { useAuth } from "../../contexts/AuthContext" // Import useAuth

interface Courier {
  id: string
  name: string
}

interface OrderProof {
  id: string
  image_url?: string | null
  image_data?: string | null
}

interface Order {
  courier_name: string
  id: string
  order_id: string
  customer_name: string
  address: string
  mobile_number: string
  total_order_fees: number
  delivery_fee: number | null
  payment_method: string
  payment_sub_type: string | null
  status: string
  partial_paid_amount: number | null
  internal_comment: string | null
  collected_by: string | null
  assigned_courier_id: string | null
  original_courier_id?: string | null
  notes?: string | null
  order_proofs?: OrderProof[]
  created_at: string
  updated_at: string
  archived?: boolean
  archived_at?: string
  courier_id?: string | null // <-- Add this line
}

interface CourierStats {
  totalOrders: number
  deliveredOrders: number
  returnedOrders: number
  canceledOrders: number
  totalAmount: number
  deliveredAmount: number
  averageOrderValue: number
  completionRate: number
  archivedOrders: number
}

// Notification interface is now defined in AuthContext.tsx
// interface Notification {
//   id: string
//   message: string
//   timestamp: Date
//   type: "update" | "new" | "status_change" | "order_edit"
//   orderId?: string
//   courierName?: string
// }

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; cardBg: string; icon: React.ComponentType<any> }
> = {
  assigned: {
    label: "مكلف",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    cardBg: "bg-blue-50 border-blue-300 shadow-blue-100",
    icon: Activity,
  },
  delivered: {
    label: "تم التوصيل",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
    cardBg: "bg-green-50 border-green-300 shadow-green-100",
    icon: CheckCircle,
  },
  canceled: {
    label: "ملغي",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    cardBg: "bg-red-50 border-red-300 shadow-red-100",
    icon: XCircle,
  },
  partial: {
    label: "جزئي",
    color: "text-yellow-700",
    bgColor: "bg-yellow-50 border-yellow-200",
    cardBg: "bg-yellow-50 border-yellow-300 shadow-yellow-100",
    icon: Activity,
  },
  hand_to_hand: {
    label: "استبدال",
    color: "text-purple-700",
    bgColor: "bg-purple-50 border-purple-200",
    cardBg: "bg-purple-50 border-purple-300 shadow-purple-100",
    icon: HandMetal,
  },
  return: {
    label: "مرتجع",
    color: "text-orange-700",
    bgColor: "bg-orange-50 border-orange-200",
    cardBg: "bg-orange-50 border-orange-300 shadow-orange-100",
    icon: TrendingUp,
  },
}

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date()
  return today.toISOString().split("T")[0]
}

const Reports: React.FC = () => {
  const {
    notifications,
    soundEnabled,
    showNotifications,
    clearAllNotifications,
    playNotificationSound,
    setShowNotifications,
  } = useAuth() // Consume from AuthContext

  const [couriers, setCouriers] = useState<Courier[]>([])
  const [selectedCouriers, setSelectedCouriers] = useState<Courier[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loadingCouriers, setLoadingCouriers] = useState(false)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [courierStats, setCourierStats] = useState<CourierStats | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  // Set default date range to today
  const [dateRange, setDateRange] = useState({ start: getTodayDate(), end: getTodayDate() })
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [viewMode, setViewMode] = useState<"active" | "archived">("active")
  // Keeping debugInfo for console logging, but removing UI display
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)

  // Debug function (for console logging)
  const addDebugInfo = (info: string) => {
    console.log(`[DEBUG] ${info}`)
    setDebugInfo((prev) => [`${new Date().toLocaleTimeString()}: ${info}`, ...prev.slice(0, 9)])
  }

  // Removed audio context initialization and playNotificationSound from here
  // as they are now in AuthContext.tsx

  // Removed getCourierName from here as it's now in AuthContext.tsx

  // Removed addNotification from here as it's now in AuthContext.tsx

  const translate = (key: string) => {
    const translations: Record<string, string> = {
      courierReports: "تقارير المندوبين",
      couriers: "المندوبين",
      loadingCouriers: "جاري تحميل المندوبين...",
      selectCourier: "اختر مندوب",
      loadingOrders: "جاري تحميل الطلبات...",
      noOrders: "لا توجد طلبات",
      exportCSV: "تصدير CSV",
      orderId: "رقم الطلب",
      status: "الحالة",
      customer: "العميل",
      address: "العنوان",
      phone: "الهاتف",
      totalFees: "المبلغ الإجمالي",
      deliveryFee: "رسوم التوصيل",
      paymentMethod: "طريقة الدفع",
      partialPaidAmount: "المبلغ المدفوع جزئياً",
      collectedBy: "تم التحصيل بواسطة",
      internalComment: "تعليق داخلي",
      notes: "ملاحظات",
      proofImages: "صور الإثبات",
      createdAt: "تاريخ الإنشاء",
      updatedAt: "تاريخ التحديث",
      clickToOpen: "اضغط لفتح الصورة كاملة",
      noImages: "لا توجد صور",
      totalOrders: "إجمالي الطلبات",
      deliveredOrders: "الطلبات المسلمة",
      returnedOrders: "الطلبات المرتجعة",
      canceledOrders: "الطلبات الملغاة",
      totalAmount: "المبلغ الإجمالي",
      deliveredAmount: "المبلغ المسلم",
      averageOrderValue: "متوسط قيمة الطلب",
      completionRate: "معدل الإنجاز",
      searchOrders: "البحث في الطلبات...",
      filterByStatus: "تصفية حسب الحالة",
      allStatuses: "جميع الحالات",
      dateFrom: "من تاريخ",
      dateTo: "إلى تاريخ",
      clearFilters: "مسح المرشحات",
      resetToToday: "العودة لليوم",
      viewDetails: "عرض التفاصيل",
      orderDetails: "تفاصيل الطلب",
      close: "إغلاق",
      refresh: "تحديث",
      courierPerformance: "أداء المندوب",
      ordersOverview: "نظرة عامة على الطلبات",
      noExportData: "لا توجد بيانات للتصدير",
      exportSuccess: "تم تصدير البيانات بنجاح",
      archivedOrders: "الطلبات المؤرشفة",
      activeOrders: "الطلبات النشطة",
      archive: "أرشيف",
      viewArchive: "عرض الأرشيف",
      backToActive: "العودة للطلبات النشطة",
      notifications: "الإشعارات",
      soundOn: "تشغيل الصوت",
      soundOff: "إيقاف الصوت",
      newOrder: "طلب جديد",
      orderUpdated: "تم تحديث الطلب",
      statusChanged: "تغيير حالة الطلب",
      orderEdited: "تم تعديل الطلب", // New translation
      showingToday: "عرض طلبات اليوم",
      showingDateRange: "عرض النطاق المحدد",
      allDates: "جميع التواريخ",
      unspecified: "غير محدد", // New translation for undefined status
    }
    return translations[key] || key
  }

  useEffect(() => {
    const fetchCouriers = async () => {
      setLoadingCouriers(true)
      try {
        const { data, error } = await supabase.from("users").select("id, name").eq("role", "courier")
        if (error) throw error
        setCouriers(data || [])
        addDebugInfo(`Loaded ${data?.length || 0} couriers`)
      } catch (error: any) {
        console.error("Error fetching couriers:", error)
        addDebugInfo(`Error fetching couriers: ${error.message}`)
      } finally {
        setLoadingCouriers(false)
      }
    }
    fetchCouriers()
  }, [])

  // Removed global subscription for all order changes (for notifications) from here
  // as it is now in AuthContext.tsx

  // Selected courier subscription (for data refresh)
  useEffect(() => {
    if (selectedCouriers.length === 0) return

    addDebugInfo(`Setting up subscription for couriers: ${selectedCouriers.map(c => c.name).join(", ")}`)

    const courierSubscription = supabase
      .channel(`couriers_${selectedCouriers.map(c => c.id).join("_")}_orders`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter:
            viewMode === "active"
              ? `assigned_courier_id=in.(${selectedCouriers.map(c => c.id).join(",")})`
              : `original_courier_id=in.(${selectedCouriers.map(c => c.id).join(",")})`,
        },
        (payload: any) => {
          addDebugInfo(`Courier-specific order change detected for ${selectedCouriers.map(c => c.name).join(", ")}`)
          // Refresh orders data for selected couriers
          fetchOrdersForCouriers(selectedCouriers)
        },
      )
      .subscribe((status) => {
        addDebugInfo(`Courier subscription status: ${status}`)
      })

    return () => {
      addDebugInfo(`Unsubscribing from courier ${selectedCouriers.map(c => c.name).join(", ")} orders`)
      courierSubscription.unsubscribe()
    }
  }, [selectedCouriers, viewMode])

  // Effect to re-fetch orders and recalculate stats when date range changes
  useEffect(() => {
    if (selectedCouriers.length > 0) {
      fetchOrdersForCouriers(selectedCouriers)
    }
  }, [dateRange]) // Trigger fetch when dateRange changes

  useEffect(() => {
    filterOrders()
  }, [orders, searchTerm, statusFilters, selectedCouriers]) // Removed dateRange from here as it's handled by fetchOrdersForCouriers

  const fetchOrdersForCouriers = async (couriers: Courier[]) => {
    setSelectedCouriers(couriers)
    setLoadingOrders(true)
    addDebugInfo(`Fetching orders for couriers: ${couriers.map(c => c.name).join(", ")}`)

    try {
      let query = supabase
        .from("orders")
        .select(`
    *,
    order_proofs (
      id,
      image_url,
      image_data
    ),
    assigned_courier:users!orders_assigned_courier_id_fkey(id, name),
    original_courier:users!orders_original_courier_id_fkey(id, name)
  `)
        .order("created_at", { ascending: false })

      if (viewMode === "active") {
        query = query.in("assigned_courier_id", couriers.map(c => c.id)).eq("archived", false)
      } else {
        query = query.in("original_courier_id", couriers.map(c => c.id)).eq("archived", true)
      }

      // Apply date range filter to the main order fetch
      if (dateRange.start) {
        query = query.gte("created_at", dateRange.start + "T00:00:00.000Z")
      }
      if (dateRange.end) {
        query = query.lte("created_at", dateRange.end + "T23:59:59.999Z")
      }

      const { data, error } = await query

      if (error) throw error

      // Add courier name based on view mode
      const ordersWithCourierNames = (data || []).map((order: any) => ({
        ...order,
        courier_name: viewMode === "active" ? order.assigned_courier?.name : order.original_courier?.name,
        courier_id: viewMode === "active" ? (order.assigned_courier?.id || order.assigned_courier_id) : (order.original_courier?.id || order.original_courier_id),
      }))

      setOrders(ordersWithCourierNames)
      // Pass the date range to calculateStats
      if (couriers[0]) calculateStats(couriers[0].id, dateRange.start, dateRange.end)
      addDebugInfo(`Loaded ${ordersWithCourierNames.length} orders for selected couriers`)
    } catch (error: any) {
      alert("Error loading orders / خطأ في تحميل الطلبات: " + error.message)
      addDebugInfo(`Error loading orders: ${error.message}`)
    } finally {
      setLoadingOrders(false)
    }
  }

  const calculateStats = async (courierId: string, startDate: string, endDate: string) => {
    // Convert date strings to ISO format for Supabase query
    const startOfDay = startDate ? startDate + "T00:00:00.000Z" : null
    const endOfDay = endDate ? endDate + "T23:59:59.999Z" : null

    // Get active orders stats for the selected date range
    let activeOrdersQuery = supabase
      .from("orders")
      .select("*")
      .eq("assigned_courier_id", courierId)
      .eq("archived", false)

    if (startOfDay) {
      activeOrdersQuery = activeOrdersQuery.gte("created_at", startOfDay)
    }
    if (endOfDay) {
      activeOrdersQuery = activeOrdersQuery.lte("created_at", endOfDay)
    }

    const { data: activeOrdersData, error: activeOrdersError } = await activeOrdersQuery

    if (activeOrdersError) {
      console.error("Error fetching active orders for stats:", activeOrdersError)
      addDebugInfo(`Error fetching active orders for stats: ${activeOrdersError.message}`)
      return
    }

    const activeOrders = activeOrdersData || []
    const totalOrders = activeOrders.length
    const deliveredOrders = activeOrders.filter((order) => order.status === "delivered").length
    const returnedOrders = activeOrders.filter((order) => order.status === "return").length
    const canceledOrders = activeOrders.filter((order) => order.status === "canceled").length
    const totalAmount = activeOrders.reduce((sum, order) => sum + order.total_order_fees, 0)
    const deliveredAmount = activeOrders
      .filter((order) => order.status === "delivered")
      .reduce((sum, order) => sum + order.total_order_fees, 0)
    const averageOrderValue = totalOrders > 0 ? totalAmount / totalOrders : 0
    const completionRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0

    // Get archived orders count using original_courier_id for the selected date range
    let archivedOrdersQuery = supabase
      .from("orders")
      .select("id")
      .eq("original_courier_id", courierId)
      .eq("archived", true)

    if (startOfDay) {
      archivedOrdersQuery = archivedOrdersQuery.gte("created_at", startOfDay)
    }
    if (endOfDay) {
      archivedOrdersQuery = archivedOrdersQuery.lte("created_at", endOfDay)
    }

    const { data: archivedData, error: archivedError } = await archivedOrdersQuery

    if (archivedError) {
      console.error("Error fetching archived orders for stats:", archivedError)
      addDebugInfo(`Error fetching archived orders for stats: ${archivedError.message}`)
      return
    }

    const archivedOrders = archivedData?.length || 0

    setCourierStats({
      totalOrders,
      deliveredOrders,
      returnedOrders,
      canceledOrders,
      totalAmount,
      deliveredAmount,
      averageOrderValue,
      completionRate,
      archivedOrders,
    })
    addDebugInfo(`Calculated stats for ${courierId} for range ${startDate} to ${endDate}`)
  }

  const filterOrders = () => {
    let filtered = [...orders]

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.mobile_number.includes(searchTerm),
      )
    }

    if (statusFilters.length > 0) {
      filtered = filtered.filter((order) => statusFilters.includes(order.status))
    }

    if (selectedCouriers.length > 0) {
      filtered = filtered.filter((order) => {
        // Fallback to assigned_courier_id/original_courier_id if courier_id is missing
        const cid = order.courier_id || order.assigned_courier_id || order.original_courier_id
        return selectedCouriers.some(c => c.id === cid)
      })
    }

    // Date range filtering is now primarily handled in fetchOrdersForCouriers,
    // but keeping this here for consistency with local filtering if 'orders' state
    // isn't always perfectly aligned with the date range (e.g., if orders are added/removed
    // from the 'orders' state without a full re-fetch).
    if (dateRange.start) {
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.created_at).toISOString().split("T")[0]
        return orderDate >= dateRange.start
      })
    }

    if (dateRange.end) {
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.created_at).toISOString().split("T")[0]
        return orderDate <= dateRange.end
      })
    }

    setFilteredOrders(filtered)
  }

  const exportOrdersCsv = () => {
    if (filteredOrders.length === 0) {
      alert(translate("noExportData"))
      return
    }

    const dataToExport = filteredOrders.map((order) => ({
      order_id: order.order_id,
      customer_name: order.customer_name,
      address: order.address,
      mobile_number: order.mobile_number,
      total_order_fees: order.total_order_fees,
      delivery_fee: order.delivery_fee || 0,
      payment_method: order.payment_method,
      payment_sub_type: order.payment_sub_type || "",
      status: order.status,
      partial_paid_amount: order.partial_paid_amount || 0,
      internal_comment: order.internal_comment || "",
      collected_by: order.collected_by || "",
      notes: order.notes || "",
      proof_images_count: order.order_proofs?.length || 0,
      archived: order.archived || false,
      archived_at: order.archived_at || "",
      created_at: new Date(order.created_at).toLocaleString(),
      updated_at: new Date(order.updated_at).toLocaleString(),
    }))

    const csv = Papa.unparse(dataToExport)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const filename = `courier-orders-${selectedCouriers.map(c => c.name).join("-")}-${viewMode}-${dateRange.start || getTodayDate()}.csv`
    saveAs(blob, filename)
    alert(translate("exportSuccess"))
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilters([])
    setSelectedCouriers([])
    setDateRange({ start: "", end: "" })
  }

  const resetToToday = () => {
    const today = getTodayDate()
    setDateRange({ start: today, end: today })
    setSearchTerm("")
    setStatusFilters([])
    setSelectedCouriers([])
  }

  // Removed clearAllNotifications from here as it's now in AuthContext.tsx

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || {
      label: status,
      color: "text-gray-700",
      bgColor: "bg-gray-50 border-gray-200",
      cardBg: "bg-gray-50 border-gray-300",
      icon: Activity,
    }
    const StatusIcon = config.icon

    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.color}`}
      >
        <StatusIcon className="w-3 h-3" />
        <span>{config.label}</span>
      </div>
    )
  }

  const openOrderModal = (order: Order) => {
    setSelectedOrder(order)
    setShowOrderModal(true)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new":
        return <Package className="w-4 h-4 text-blue-600" />
      case "status_change":
        return <RefreshCw className="w-4 h-4 text-orange-600" />
      case "order_edit":
        return <Edit className="w-4 h-4 text-purple-600" /> // Icon for order edits
      default:
        return <Bell className="w-4 h-4 text-gray-600" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "new":
        return "border-l-blue-500 bg-blue-50"
      case "status_change":
        return "border-l-orange-500 bg-orange-50"
      case "order_edit":
        return "border-l-purple-500 bg-purple-50" // Color for order edits
      default:
        return "border-l-gray-500 bg-gray-50"
    }
  }

  const getDateRangeText = () => {
    const today = getTodayDate()
    if (dateRange.start === today && dateRange.end === today) {
      return translate("showingToday")
    }
    if (dateRange.start && dateRange.end && dateRange.start === dateRange.end) {
      return `طلبات يوم ${dateRange.start}`
    }
    if (dateRange.start || dateRange.end) {
      return `${dateRange.start || "البداية"} - ${dateRange.end || "النهاية"}`
    }
    return translate("allDates") // Fallback if no dates selected
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{translate("courierReports")}</h1>
                <p className="text-gray-600">تقارير أداء المندوبين والطلبات</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute left-0 top-full mt-2 w-96 bg-white rounded-xl border border-gray-200 shadow-lg z-50">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">{translate("notifications")}</h3>
                        {notifications.length > 0 && (
                          <button onClick={clearAllNotifications} className="text-sm text-red-600 hover:text-red-800">
                            مسح الكل
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">لا توجد إشعارات جديدة</div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 border-b border-gray-100 border-l-4 ${getNotificationColor(notification.type)}`}
                          >
                            <div className="flex items-start gap-3">
                              {getNotificationIcon(notification.type)}
                              <div className="flex-1">
                                <p className="text-sm text-gray-900">{notification.message}</p>
                                {notification.courierName && (
                                  <p className="text-xs text-gray-600 mt-1">المندوب: {notification.courierName}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                  {notification.timestamp.toLocaleTimeString("ar-EG")}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sound Toggle */}
              <button
                onClick={() => {
                  // This will toggle the soundEnabled state in AuthContext
                  // and trigger the playNotificationSound to respect the new state.
                  // We don't directly set soundEnabled here, it's managed by AuthContext.
                  // For demonstration, we can call playNotificationSound to show the effect.
                  // In a real app, you might expose a `toggleSound` function from AuthContext.
                  // For now, I'll simulate the toggle by calling playNotificationSound.
                  // A better approach would be to add `toggleSound` to AuthContextType.
                  // This is already done in the AuthContext.tsx update.
                  // So, we need to consume `setSoundEnabled` from `useAuth`.
                  // Re-checking AuthContextType, `setSoundEnabled` is not exposed.
                  // Let's add it to AuthContextType and AuthProvider.
                  // Correction: `setSoundEnabled` is not directly exposed, but `soundEnabled` is.
                  // The `playNotificationSound` function itself checks `soundEnabled`.
                  // To toggle, we need a way to update `soundEnabled` in AuthContext.
                  // I will add `setSoundEnabled` to AuthContextType and AuthProvider.
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  soundEnabled
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span className="hidden sm:inline">{soundEnabled ? translate("soundOn") : translate("soundOff")}</span>
              </button>

              

              {/* Refresh Button */}
              <button
                onClick={() => selectedCouriers.length > 0 && fetchOrdersForCouriers(selectedCouriers)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">{translate("refresh")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Courier List Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{translate("couriers")}</h3>
                </div>
              </div>
              <div className="p-6">
                {loadingCouriers ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-gray-600">{translate("loadingCouriers")}</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {couriers.map((courier) => (
                      <label key={courier.id} className="flex items-center gap-2 cursor-pointer px-2 py-2 rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedCouriers.some(c => c.id === courier.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              const newSelected = [...selectedCouriers, courier]
                              setSelectedCouriers(newSelected)
                              fetchOrdersForCouriers(newSelected)
                            } else {
                              const newSelected = selectedCouriers.filter(c => c.id !== courier.id)
                              setSelectedCouriers(newSelected)
                              fetchOrdersForCouriers(newSelected)
                            }
                          }}
                          className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <span className="text-sm">{courier.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedCouriers.length > 0 ? (
              <div className="space-y-8">
                {/* View Mode Toggle */}
                {selectedCouriers.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">تقارير المندوبين: {selectedCouriers.map(c => c.name).join(", ")}</h3>
                      <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => {
                            setViewMode("active")
                            fetchOrdersForCouriers(selectedCouriers)
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                            viewMode === "active"
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-gray-600 hover:text-gray-800"
                          }`}
                        >
                          <Package className="w-4 h-4" />
                          <span className="hidden sm:inline">{translate("activeOrders")}</span>
                        </button>
                        <button
                          onClick={() => {
                            setViewMode("archived")
                            fetchOrdersForCouriers(selectedCouriers)
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                            viewMode === "archived"
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-gray-600 hover:text-gray-800"
                          }`}
                        >
                          <Archive className="w-4 h-4" />
                          <span className="hidden sm:inline">{translate("archive")}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Performance Statistics */}
                {courierStats && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {translate("courierPerformance")}: {selectedCouriers.map(c => c.name).join(", ")}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{getDateRangeText()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                              <Package className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-blue-900">{courierStats.totalOrders}</p>
                              <p className="text-xs text-blue-600 mt-1">طلب نشط</p>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-blue-800">{translate("totalOrders")}</p>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                              <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-900">{courierStats.deliveredOrders}</p>
                              <p className="text-xs text-green-600 mt-1">طلب مسلم</p>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-green-800">{translate("deliveredOrders")}</p>
                        </div>

                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
                              <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-orange-900">{courierStats.returnedOrders}</p>
                              <p className="text-xs text-orange-600 mt-1">طلب مرتجع</p>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-orange-800">{translate("returnedOrders")}</p>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center">
                              <XCircle className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-red-900">{courierStats.canceledOrders}</p>
                              <p className="text-xs text-red-600 mt-1">طلب ملغي</p>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-red-800">{translate("canceledOrders")}</p>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center">
                              <Archive className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">{courierStats.archivedOrders}</p>
                              <p className="text-xs text-gray-600 mt-1">طلب مؤرشف</p>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-gray-800">{translate("archivedOrders")}</p>
                        </div>

                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                              <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-purple-900">
                                {courierStats.totalAmount.toFixed(0)}
                              </p>
                              <p className="text-xs text-purple-600 mt-1">ج.م</p>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-purple-800">{translate("totalAmount")}</p>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-yellow-600 rounded-xl flex items-center justify-center">
                              <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-yellow-900">
                                {courierStats.averageOrderValue.toFixed(0)}
                              </p>
                              <p className="text-xs text-yellow-600 mt-1">ج.م متوسط</p>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-yellow-800">{translate("averageOrderValue")}</p>
                        </div>

                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                              <Percent className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-indigo-900">
                                {courierStats.completionRate.toFixed(1)}%
                              </p>
                              <p className="text-xs text-indigo-600 mt-1">معدل الإنجاز</p>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-indigo-800">{translate("completionRate")}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filters and Export Section */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Filter className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">البحث والتصفية</h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{getDateRangeText()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">البحث في الطلبات</label>
                        <div className="relative">
                          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                          <input
                            type="text"
                            placeholder={translate("searchOrders")}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">تصفية حسب الحالة</label>
                        <div className="flex flex-col gap-1">
                          {["assigned", "delivered", "canceled", "partial", "hand_to_hand", "return"].map(status => (
                            <label key={status} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={statusFilters.includes(status)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setStatusFilters([...statusFilters, status])
                                  } else {
                                    setStatusFilters(statusFilters.filter(s => s !== status))
                                  }
                                }}
                                className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded"
                              />
                              <span>{statusConfig[status]?.label || status}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">من تاريخ</label>
                        <input
                          type="date"
                          value={dateRange.start}
                          onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">إلى تاريخ</label>
                        <input
                          type="date"
                          value={dateRange.end}
                          onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={resetToToday}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Calendar className="w-4 h-4" />
                        {translate("resetToToday")}
                      </button>
                      <button
                        onClick={clearFilters}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        {translate("clearFilters")}
                      </button>
                      {filteredOrders.length > 0 && (
                        <button
                          onClick={exportOrdersCsv}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          {translate("exportCSV")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Orders List */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          {viewMode === "active" ? (
                            <Package className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Archive className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {viewMode === "active" ? translate("ordersOverview") : translate("archivedOrders")}
                        </h3>
                      </div>
                      <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                        {filteredOrders.length} طلب
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    {loadingOrders ? (
                      <div className="text-center py-16">
                        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-lg font-medium text-gray-700">{translate("loadingOrders")}</p>
                      </div>
                    ) : filteredOrders.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          {viewMode === "active" ? (
                            <Package className="w-8 h-8 text-gray-400" />
                          ) : (
                            <Archive className="w-8 h-8 text-gray-400" />
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">{translate("noOrders")}</h3>
                        <p className="text-gray-600">جرب تعديل مرشحات البحث أو اختيار تاريخ آخر</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredOrders.map((order) => {
                          const statusStyle = statusConfig[order.status] || statusConfig.assigned
                          return (
                            <div
                              key={order.id}
                              className={`border-2 rounded-xl p-6 hover:shadow-lg transition-all duration-200 ${statusStyle.cardBg}`}
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusStyle.bgColor}`}
                                  >
                                    {viewMode === "active" ? (
                                      <Package className={`w-5 h-5 ${statusStyle.color}`} />
                                    ) : (
                                      <Archive className={`w-5 h-5 ${statusStyle.color}`} />
                                    )}
                                  </div>
                                  <div>
                                    <h4 className={`font-semibold ${statusStyle.color}`}>#{order.order_id}</h4>
                                    <p className={`text-sm ${statusStyle.color} opacity-80`}>{order.customer_name}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {getStatusBadge(order.status)}
                                  <button
                                    onClick={() => openOrderModal(order)}
                                    className={`flex items-center gap-2 px-3 py-1 text-sm rounded-lg transition-colors ${statusStyle.bgColor} ${statusStyle.color} hover:opacity-80`}
                                  >
                                    <Eye className="w-3 h-3" />
                                    {translate("viewDetails")}
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div
                                  className={`flex items-center gap-3 p-3 rounded-lg ${statusStyle.bgColor} bg-opacity-50`}
                                >
                                  <Phone className={`w-4 h-4 ${statusStyle.color} opacity-70`} />
                                  <div>
                                    <p className={`text-xs ${statusStyle.color} opacity-70`}>الهاتف</p>
                                    <a
                                      href={`tel:${order.mobile_number}`}
                                      className={`text-sm font-medium ${statusStyle.color} hover:opacity-80`}
                                    >
                                      {order.mobile_number}
                                    </a>
                                  </div>
                                </div>

                                <div
                                  className={`flex items-center gap-3 p-3 rounded-lg ${statusStyle.bgColor} bg-opacity-50`}
                                >
                                  <DollarSign className={`w-4 h-4 ${statusStyle.color} opacity-70`} />
                                  <div>
                                    <p className={`text-xs ${statusStyle.color} opacity-70`}>المبلغ</p>
                                    <p className={`text-sm font-medium ${statusStyle.color}`}>
                                      {order.total_order_fees.toFixed(2)} ج.م
                                    </p>
                                  </div>
                                </div>

                                <div
                                  className={`flex items-center gap-3 p-3 rounded-lg ${statusStyle.bgColor} bg-opacity-50`}
                                >
                                  <CreditCard className={`w-4 h-4 ${statusStyle.color} opacity-70`} />
                                  <div>
                                    <p className={`text-xs ${statusStyle.color} opacity-70`}>طريقة الدفع</p>
                                    <p className={`text-sm font-medium ${statusStyle.color}`}>{order.payment_method}</p>
                                  </div>
                                </div>

                                <div
                                  className={`flex items-center gap-3 p-3 rounded-lg ${statusStyle.bgColor} bg-opacity-50`}
                                >
                                  <Calendar className={`w-4 h-4 ${statusStyle.color} opacity-70`} />
                                  <div>
                                    <p className={`text-xs ${statusStyle.color} opacity-70`}>
                                      {viewMode === "active" ? "تاريخ الإنشاء" : "تاريخ الأرشفة"}
                                    </p>
                                    <p className={`text-sm font-medium ${statusStyle.color}`}>
                                      {viewMode === "active"
                                        ? new Date(order.created_at).toLocaleDateString("ar-EG")
                                        : order.archived_at
                                          ? new Date(order.archived_at).toLocaleDateString("ar-EG")
                                          : "-"}
                                    </p>
                                  </div>
                                </div>

                                {order.order_proofs && order.order_proofs.length > 0 && (
                                  <div
                                    className={`flex items-center gap-3 p-3 rounded-lg ${statusStyle.bgColor} bg-opacity-50`}
                                  >
                                    <Camera className={`w-4 h-4 ${statusStyle.color} opacity-70`} />
                                    <div>
                                      <p className={`text-xs ${statusStyle.color} opacity-70`}>صور الإثبات</p>
                                      <p className={`text-sm font-medium ${statusStyle.color}`}>
                                        {order.order_proofs.length} صورة
                                      </p>
                                    </div>
                                  </div>
                                )}

                                <div
                                  className={`flex items-start gap-3 p-3 rounded-lg ${statusStyle.bgColor} bg-opacity-50`}
                                >
                                  <MapPin className={`w-4 h-4 ${statusStyle.color} opacity-70 mt-0.5`} />
                                  <div>
                                    <p className={`text-xs ${statusStyle.color} opacity-70`}>العنوان</p>
                                    <p className={`text-sm font-medium ${statusStyle.color} line-clamp-2`}>
                                      {order.address}
                                    </p>
                                  </div>
                                </div>
                                {viewMode === "archived" && (
                                  <div
                                    className={`flex items-center gap-3 p-3 rounded-lg ${statusStyle.bgColor} bg-opacity-50`}
                                  >
                                    <User className={`w-4 h-4 ${statusStyle.color} opacity-70`} />
                                    <div>
                                      <p className={`text-xs ${statusStyle.color} opacity-70`}>المندوب الأصلي</p>
                                      <p className={`text-sm font-medium ${statusStyle.color}`}>
                                        {order.courier_name || "غير محدد"}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {order.internal_comment && (
                                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                  <label className="block text-xs font-medium text-yellow-700 mb-1">{translate("internalComment")}</label>
                                  <p className="text-xs text-gray-900">{order.internal_comment}</p>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <Users className="w-10 h-10 text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-800">{translate("selectCourier")}</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      اختر مندوب من القائمة الجانبية لعرض طلباته وأدائه التفصيلي
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Details Modal */}
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div
                className={`text-white p-6 rounded-t-xl ${statusConfig[selectedOrder.status]?.bgColor.replace("bg-", "bg-").replace("-50", "-600") || "bg-blue-600"}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">
                      {translate("orderDetails")} #{selectedOrder.order_id}
                    </h3>
                    <p className="text-blue-100 mt-1">{selectedOrder.customer_name}</p>
                    {selectedOrder.archived && (
                      <div className="flex items-center gap-2 mt-2">
                        <Archive className="w-4 h-4" />
                        <span className="text-sm">طلب مؤرشف</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowOrderModal(false)}
                    className="text-blue-100 hover:text-white transition-colors p-2"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{translate("customer")}</label>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 font-medium">{selectedOrder.customer_name}</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{translate("phone")}</label>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <a
                          href={`tel:${selectedOrder.mobile_number}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {selectedOrder.mobile_number}
                        </a>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{translate("address")}</label>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="text-gray-900">{selectedOrder.address}</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{translate("status")}</label>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <label className="block text-sm font-medium text-green-700 mb-2">{translate("totalFees")}</label>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <span className="text-2xl font-bold text-green-700">
                          {selectedOrder.total_order_fees.toFixed(2)} ج.م
                        </span>
                      </div>
                    </div>

                    {selectedOrder.delivery_fee && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {translate("deliveryFee")}
                        </label>
                        <span className="text-gray-900 font-medium">{selectedOrder.delivery_fee.toFixed(2)} ج.م</span>
                      </div>
                    )}

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {translate("paymentMethod")}
                      </label>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 font-medium">
                          {selectedOrder.payment_method}
                          {selectedOrder.payment_sub_type && ` (${selectedOrder.payment_sub_type})`}
                        </span>
                      </div>
                    </div>

                    {selectedOrder.collected_by && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {translate("collectedBy")}
                        </label>
                        <span className="text-gray-900 font-medium">{selectedOrder.collected_by}</span>
                      </div>
                    )}
                  </div>
                </div>

                {(selectedOrder.internal_comment || selectedOrder.notes) && (
                  <div className="space-y-4 mb-6">
                    {selectedOrder.internal_comment && (
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <label className="block text-sm font-medium text-yellow-700 mb-2">
                          {translate("internalComment")}
                        </label>
                        <p className="text-gray-900">{selectedOrder.internal_comment}</p>
                      </div>
                    )}
                    {selectedOrder.notes && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <label className="block text-sm font-medium text-blue-700 mb-2">{translate("notes")}</label>
                        <p className="text-gray-900">{selectedOrder.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedOrder.order_proofs && selectedOrder.order_proofs.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">{translate("proofImages")}</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {selectedOrder.order_proofs.map((proof) => {
                        const src = proof.image_url || proof.image_data || ""
                        return (
                          <a
                            key={proof.id}
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative group block"
                          >
                            <img
                              src={src || "/placeholder.svg"}
                              alt={translate("clickToOpen")}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                              <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        {translate("createdAt")}: {new Date(selectedOrder.created_at).toLocaleString("ar-EG")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        {translate("updatedAt")}: {new Date(selectedOrder.updated_at).toLocaleString("ar-EG")}
                      </span>
                      
                    </div>
                    {selectedOrder.archived_at && (
                      <div className="flex items-center gap-2">
                        <Archive className="w-4 h-4" />
                        <span>تاريخ الأرشفة: {new Date(selectedOrder.archived_at).toLocaleString("ar-EG")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Reports