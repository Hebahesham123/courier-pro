"use client"
import type React from "react"
import { useState, useEffect } from "react"
import {
  Trash2,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  Edit3,
  Save,
  X,
  Package,
  Phone,
  CreditCard,
  Hash,
  User,
  FileText,
  RefreshCw,
  MapPin,
  Maximize2,
  Settings,
  Upload,
  TrendingUp,
  Activity,
  Archive,
  ArchiveRestore,
  UserCheck,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Truck,
  Check,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../contexts/LanguageContext"
import { useAuth } from "../../contexts/AuthContext"

interface Order {
  id: string
  order_id: string
  customer_name: string
  address: string
  billing_city: string
  mobile_number: string
  total_order_fees: number
  payment_method: string
  payment_status: "paid" | "pending" | "cod" // New field
  financial_status?: string // New field for financial status
  status: string
  assigned_courier_id: string | null
  original_courier_id?: string | null
  courier_name?: string
  created_at?: string
  notes?: string
  archived?: boolean
  archived_at?: string
}

interface Courier {
  id: string
  name: string
  email: string
  role: string
}

// Utility function to render notes with clickable links
const renderNotesWithLinks = (notes: string) => {
  // Regular expression to detect URLs (including Google Maps links)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // Split the text by URLs and map each part
  const parts = notes.split(urlRegex);
  
  return parts.map((part, index) => {
    // Check if this part is a URL
    if (urlRegex.test(part)) {
      // Determine if it's a Google Maps link
      const isGoogleMaps = part.includes('maps.google.com') || part.includes('goo.gl/maps') || part.includes('maps.app.goo.gl');
      
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline hover:no-underline transition-all duration-200 ${
            isGoogleMaps 
              ? 'text-blue-600 hover:text-blue-800 font-medium' 
              : 'text-blue-500 hover:text-blue-700'
          }`}
          title={isGoogleMaps ? "فتح في خرائط جوجل" : "فتح الرابط"}
        >
          {isGoogleMaps ? "📍 " + part : part}
        </a>
      );
    }
    
    // Return regular text
    return part;
  });
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<any> }> =
  {
    assigned: {
      label: "مكلف",
      color: "text-blue-700",
      bgColor: "bg-blue-50 border-blue-200",
      icon: Activity,
    },
    delivered: {
      label: "تم التوصيل",
      color: "text-green-700",
      bgColor: "bg-green-50 border-green-200",
      icon: CheckCircle,
    },
    canceled: {
      label: "ملغي",
      color: "text-red-700",
      bgColor: "bg-red-50 border-red-200",
      icon: X,
    },
    partial: {
      label: "جزئي",
      color: "text-yellow-700",
      bgColor: "bg-yellow-50 border-yellow-200",
      icon: Activity,
    },
    hand_to_hand: {
      label: "استبدال",
      color: "text-purple-700",
      bgColor: "bg-purple-50 border-purple-200",
      icon: RefreshCw,
    },
    return: {
      label: "مرتجع",
      color: "text-orange-700",
      bgColor: "bg-orange-50 border-orange-200",
      icon: Upload,
    },
  }

const OrdersManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [selectedCourier, setSelectedCourier] = useState("")
  const [assignLoading, setAssignLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [orderEdits, setOrderEdits] = useState<{ [id: string]: Partial<Order> }>({})
  const [editingOrder, setEditingOrder] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [expandedField, setExpandedField] = useState<{ orderId: string; field: string } | null>(null)
  const [expandedValue, setExpandedValue] = useState("")
  const [viewMode, setViewMode] = useState<"active" | "archived">("active")
  const [expandedRows, setExpandedRows] = useState<string[]>([])
  const [isMobile, setIsMobile] = useState(false)

  // Date state - default to today
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split("T")[0] // Format: YYYY-MM-DD
  })
  const [showDatePicker, setShowDatePicker] = useState(false)

  const [filters, setFilters] = useState({
    couriers: [] as string[],
    statuses: [] as string[],
    paymentStatuses: [] as string[], // New filter for payment status
    mobile: "",
    payment: "",
    orderId: "",
  })

  // Separate state for text input filters that don't auto-apply
  const [textFilters, setTextFilters] = useState({
    mobile: "",
    payment: "",
    orderId: "",
  })

  const { t } = useLanguage()
  const { user } = useAuth()

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    fetchOrders()
    fetchCouriers()
  }, [viewMode, selectedDate, filters.couriers, filters.statuses, filters.paymentStatuses])

  // Auto-hide messages after 5 seconds
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, successMessage])

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      // Create date range for the selected day
      const startOfDay = new Date(selectedDate + "T00:00:00.000Z")
      const endOfDay = new Date(selectedDate + "T23:59:59.999Z")

      let query = supabase
        .from("orders")
        .select(
          `
          id, order_id, customer_name, address, billing_city, mobile_number, total_order_fees,
          payment_method, payment_status, financial_status, status, assigned_courier_id, original_courier_id, created_at, notes, archived, archived_at,
          users!orders_assigned_courier_id_fkey(name)
        `,
        )
        .eq("archived", viewMode === "archived")
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())
        .order("created_at", { ascending: false })

      // Apply multi-select courier filter
      if (filters.couriers.length > 0) {
        if (viewMode === "archived") {
          query = query.in("original_courier_id", filters.couriers)
        } else {
          query = query.in("assigned_courier_id", filters.couriers)
        }
      }

      // Apply multi-select status filter
      if (filters.statuses.length > 0) {
        query = query.in("status", filters.statuses)
      }

      // Apply payment status filter
      if (filters.paymentStatuses.length > 0) {
        query = query.in("payment_status", filters.paymentStatuses)
      }

      if (filters.mobile) query = query.ilike("mobile_number", `%${filters.mobile}%`)
      if (filters.payment) query = query.ilike("payment_method", `%${filters.payment}%`)
      if (filters.orderId) query = query.ilike("order_id", `%${filters.orderId}%`)

      const { data, error } = await query

      if (error) throw error

      const ordersWithCourierNames =
        data?.map((order: any) => ({
          ...order,
          courier_name: order.users?.name || null,
        })) || []

      setOrders(ordersWithCourierNames)
    } catch (error: any) {
      setError("Failed to fetch orders / فشل تحميل الطلبات: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCouriers = async () => {
    try {
      const { data: allUsers, error } = await supabase.from("users").select("id, name, email, role")

      if (error) throw error

      const courierUsers = allUsers?.filter((user) => user.role?.toLowerCase() === "courier") || []
      setCouriers(courierUsers)
    } catch (error: any) {
      setError("Failed to fetch couriers / فشل تحميل المندوبين: " + error.message)
    }
  }

  // Payment status badge
  const getPaymentMethodBadge = (method: string) => {
    const colors = {
      cash: "bg-orange-100 text-orange-800 border-orange-200",
      card: "bg-blue-100 text-blue-800 border-blue-200",
      valu: "bg-purple-100 text-purple-800 border-purple-200",
      partial: "bg-yellow-100 text-yellow-800 border-yellow-200",
      paid: "bg-green-100 text-green-800 border-green-200",
      paymob: "bg-green-100 text-green-800 border-green-200",
      fawry: "bg-green-100 text-green-800 border-green-200",
    }
    const displayMethod = method === "paid" ? "Paid Online" : method
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[method as keyof typeof colors] || colors.paid}`}
      >
        {displayMethod}
      </span>
    )
  }

  // Date navigation functions
  const goToPreviousDay = () => {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() - 1)
    setSelectedDate(currentDate.toISOString().split("T")[0])
  }

  const goToNextDay = () => {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() + 1)
    setSelectedDate(currentDate.toISOString().split("T")[0])
  }

  const goToToday = () => {
    const today = new Date()
    setSelectedDate(today.toISOString().split("T")[0])
  }

  const formatSelectedDate = () => {
    const date = new Date(selectedDate + "T12:00:00")
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const isToday = selectedDate === today.toISOString().split("T")[0]
    const isYesterday = selectedDate === yesterday.toISOString().split("T")[0]

    if (isToday) return "اليوم"
    if (isYesterday) return "أمس"

    const arabicDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    const arabicMonths = [
      "يناير",
      "فبراير",
      "مارس",
      "أبريل",
      "مايو",
      "يونيو",
      "يوليو",
      "أغسطس",
      "سبتمبر",
      "أكتوبر",
      "نوفمبر",
      "ديسمبر",
    ]

    const dayName = arabicDays[date.getDay()]
    const day = date.getDate()
    const month = arabicMonths[date.getMonth()]
    const year = date.getFullYear()

    return `${dayName} ${day} ${month} ${year}`
  }

  const formatOrderTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const toggleRowExpansion = (orderId: string) => {
    setExpandedRows((prev) => (prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]))
  }

  const handleEditChange = (orderId: string, field: keyof Order, value: any) => {
    setOrderEdits((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], [field]: value },
    }))
  }

  const openExpandedEdit = (orderId: string, field: string, currentValue: string) => {
    setExpandedField({ orderId, field })
    setExpandedValue(currentValue)
  }

  const closeExpandedEdit = () => {
    if (expandedField) {
      handleEditChange(expandedField.orderId, expandedField.field as keyof Order, expandedValue)
    }
    setExpandedField(null)
    setExpandedValue("")
  }

  const startEdit = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId)
    if (order) {
      setOrderEdits((prev) => ({
        ...prev,
        [orderId]: {
          customer_name: order.customer_name,
          address: order.address,
          billing_city: order.billing_city,
          mobile_number: order.mobile_number,
          total_order_fees: order.total_order_fees,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          status: order.status,
          assigned_courier_id: order.assigned_courier_id,
          notes: order.notes,
        },
      }))
      setEditingOrder(orderId)
    }
  }

  const cancelEdit = (orderId: string) => {
    setOrderEdits((prev) => {
      const copy = { ...prev }
      delete copy[orderId]
      return copy
    })
    setEditingOrder(null)
  }

  const saveOrderEdit = async (orderId: string) => {
    const changes = orderEdits[orderId]
    if (!changes) return

    try {
      if (changes.assigned_courier_id && !orders.find((o) => o.id === orderId)?.original_courier_id) {
        changes.original_courier_id = changes.assigned_courier_id
      }

      const { error } = await supabase.from("orders").update(changes).eq("id", orderId)

      if (error) throw error

      setSuccessMessage("Changes saved successfully / تم حفظ التغييرات بنجاح")
      setOrderEdits((prev) => {
        const copy = { ...prev }
        delete copy[orderId]
        return copy
      })
      setEditingOrder(null)
      fetchOrders()
    } catch (error: any) {
      setError("Failed to save changes / فشل حفظ التغييرات: " + error.message)
    }
  }

  const handleAssignOrders = async () => {
    if (!selectedCourier || selectedOrders.length === 0) {
      setError("Please select courier and orders / يرجى اختيار المندوب والطلبات")
      return
    }

    setAssignLoading(true)
    setError(null)

    try {
      const { data: currentOrders } = await supabase
        .from("orders")
        .select("id, assigned_courier_id, original_courier_id")
        .in("id", selectedOrders)

      for (const order of currentOrders || []) {
        const updateData: any = {
          assigned_courier_id: selectedCourier,
          status: "assigned",
        }

        if (!order.original_courier_id && order.assigned_courier_id) {
          updateData.original_courier_id = order.assigned_courier_id
        } else if (!order.original_courier_id) {
          updateData.original_courier_id = selectedCourier
        }

        const { error } = await supabase.from("orders").update(updateData).eq("id", order.id)

        if (error) throw error
      }

      await fetchOrders()
      setSelectedOrders([])
      setSelectedCourier("")
      setSuccessMessage(
        `Successfully assigned ${selectedOrders.length} orders / تم تعيين ${selectedOrders.length} طلبات بنجاح`,
      )
    } catch (error: any) {
      setError("Failed to assign orders / فشل تعيين الطلبات: " + error.message)
    } finally {
      setAssignLoading(false)
    }
  }

  const handleArchiveOrders = async () => {
    if (selectedOrders.length === 0) {
      setError("Please select orders to archive / يرجى اختيار طلبات للأرشفة")
      return
    }

    setArchiveLoading(true)
    setError(null)

    try {
      const { data: ordersToArchive, error: fetchError } = await supabase
        .from("orders")
        .select("id, assigned_courier_id, original_courier_id")
        .in("id", selectedOrders)

      if (fetchError) throw fetchError

      for (const order of ordersToArchive || []) {
        const updateData: any = {
          archived: true,
          archived_at: new Date().toISOString(),
          assigned_courier_id: null,
        }

        if (!order.original_courier_id && order.assigned_courier_id) {
          updateData.original_courier_id = order.assigned_courier_id
        }

        const { error } = await supabase.from("orders").update(updateData).eq("id", order.id)

        if (error) throw error
      }

      await fetchOrders()
      setSelectedOrders([])
      setShowArchiveConfirm(false)
      setSuccessMessage(
        `Successfully archived ${selectedOrders.length} orders / تم أرشفة ${selectedOrders.length} طلبات بنجاح`,
      )
    } catch (error: any) {
      setError("Failed to archive orders / فشل أرشفة الطلبات: " + error.message)
    } finally {
      setArchiveLoading(false)
    }
  }

  const handleRestoreOrders = async () => {
    if (selectedOrders.length === 0) {
      setError("Please select orders to restore / يرجى اختيار طلبات للاستعادة")
      return
    }

    setArchiveLoading(true)
    setError(null)

    try {
      const { data: ordersToRestore, error: fetchError } = await supabase
        .from("orders")
        .select("id, original_courier_id")
        .in("id", selectedOrders)

      if (fetchError) throw fetchError

      for (const order of ordersToRestore || []) {
        const { error } = await supabase
          .from("orders")
          .update({
            archived: false,
            archived_at: null,
            assigned_courier_id: order.original_courier_id,
          })
          .eq("id", order.id)

        if (error) throw error
      }

      await fetchOrders()
      setSelectedOrders([])
      setSuccessMessage(
        `Successfully restored ${selectedOrders.length} orders / تم استعادة ${selectedOrders.length} طلبات بنجاح`,
      )
    } catch (error: any) {
      setError("Failed to restore orders / فشل استعادة الطلبات: " + error.message)
    } finally {
      setArchiveLoading(false)
    }
  }

  const handleDeleteOrders = async () => {
    if (selectedOrders.length === 0) {
      setError("Please select orders to delete / يرجى اختيار طلبات للحذف")
      return
    }

    setDeleteLoading(true)
    setError(null)

    try {
      const { error } = await supabase.from("orders").delete().in("id", selectedOrders)

      if (error) throw error

      await fetchOrders()
      setSelectedOrders([])
      setShowDeleteConfirm(false)
      setSuccessMessage(
        `Successfully deleted ${selectedOrders.length} orders / تم حذف ${selectedOrders.length} طلبات بنجاح`,
      )
    } catch (error: any) {
      setError("Failed to delete orders / فشل حذف الطلبات: " + error.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const toggleOrderSelection = (id: string) => {
    setSelectedOrders((prev) => (prev.includes(id) ? prev.filter((orderId) => orderId !== id) : [...prev, id]))
  }

  const toggleAllOrders = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(orders.map((order) => order.id))
    }
  }

  const clearFilters = () => {
    setFilters({
      couriers: [],
      statuses: [],
      paymentStatuses: [],
      mobile: "",
      payment: "",
      orderId: "",
    })
    setTextFilters({
      mobile: "",
      payment: "",
      orderId: "",
    })
  }

  const applyTextFilters = () => {
    setFilters((prev) => ({
      ...prev,
      mobile: textFilters.mobile,
      payment: textFilters.payment,
      orderId: textFilters.orderId,
    }))
  }

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || {
      label: status,
      color: "text-gray-700",
      bgColor: "bg-gray-50 border-gray-200",
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

  // Helper function to determine if an order is assigned
  const isOrderAssigned = (order: Order) => {
    return order.assigned_courier_id !== null && order.assigned_courier_id !== undefined
  }

  // Payment status badge
  const getPaymentStatusBadge = (status: string) => {
    const colors = {
      paid: "bg-green-100 text-green-800 border-green-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      cod: "bg-orange-100 text-orange-800 border-orange-200",
    }
    const displayStatus = status === "cod" ? "عند التسليم" : status === "paid" ? "مدفوع" : "معلق"
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[status as keyof typeof colors] || colors.pending}`}
      >
        {displayStatus}
      </span>
    )
  }

  // Financial status badge
  const getFinancialStatusBadge = (status?: string) => {
    if (!status) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-gray-100 text-gray-600 border-gray-200">
          غير محدد
        </span>
      )
    }
    
    const colors = {
      paid: "bg-green-100 text-green-800 border-green-200",
      partial: "bg-blue-100 text-blue-800 border-blue-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      overdue: "bg-red-100 text-red-800 border-red-200",
      refunded: "bg-purple-100 text-purple-800 border-purple-200",
      disputed: "bg-orange-100 text-orange-800 border-orange-200",
    }
    
    const displayStatus = {
      paid: "مدفوع بالكامل",
      partial: "مدفوع جزئياً",
      pending: "معلق",
      overdue: "متأخر",
      refunded: "مسترد",
      disputed: "متنازع عليه",
    }
    
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[status as keyof typeof colors] || colors.pending}`}
      >
        {displayStatus[status as keyof typeof displayStatus] || status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-800">جاري تحميل الطلبات</h2>
            <p className="text-gray-600">Loading orders...</p>
          </div>
        </div>
      </div>
    )
  }

  // Mobile Card Layout
  const MobileOrderCard = ({ order }: { order: Order }) => {
    const edited = orderEdits[order.id] || {}
    const isEditing = editingOrder === order.id
    const isExpanded = expandedRows.includes(order.id)
    const assigned = isOrderAssigned(order)

    return (
      <div
        className={`rounded-lg border p-4 space-y-4 ${
          assigned ? "bg-green-50 border-green-200 shadow-sm" : "bg-white border-gray-200"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedOrders.includes(order.id)}
              onChange={() => toggleOrderSelection(order.id)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">#{order.order_id}</span>
                {assigned && <div className="w-2 h-2 bg-green-500 rounded-full" title="مخصص لمندوب"></div>}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-900">{order.customer_name}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(order.status)}
            <button
              onClick={() => toggleRowExpansion(order.id)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <a href={`tel:${order.mobile_number}`} className="text-blue-600 hover:text-blue-800">
              {order.mobile_number}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900">{order.total_order_fees.toFixed(2)} ج.م</span>
          </div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-gray-400" />
            <span className={`${assigned ? "text-green-700 font-medium" : "text-gray-900"}`}>
              {order.courier_name || "غير مخصص"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900">{order.created_at ? formatOrderTime(order.created_at) : "-"}</span>
          </div>
        </div>

        {/* Payment Status */}
        <div className="flex items-center gap-2">{getPaymentMethodBadge(order.payment_method)}</div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            {/* Payment Status Edit */}
            {isEditing && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">حالة الدفع</label>
                <select
                  value={edited.payment_status ?? order.payment_status}
                  onChange={(e) => handleEditChange(order.id, "payment_status", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="paid">مدفوع</option>
                  <option value="pending">معلق</option>
                  <option value="cod">عند التسليم</option>
                </select>
              </div>
            )}

            {/* Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">العنوان</label>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <textarea
                    value={edited.address ?? order.address}
                    onChange={(e) => handleEditChange(order.id, "address", e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={2}
                  />
                  <button
                    onClick={() => openExpandedEdit(order.id, "address", edited.address ?? order.address)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-900 break-words">{order.address}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">الملاحظات</label>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <textarea
                    value={edited.notes ?? order.notes ?? ""}
                    onChange={(e) => handleEditChange(order.id, "notes", e.target.value)}
                    placeholder="أضف ملاحظات"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={2}
                  />
                  <button
                    onClick={() => openExpandedEdit(order.id, "notes", edited.notes ?? order.notes ?? "")}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-900 break-words">
                    {order.notes ? renderNotesWithLinks(order.notes) : "لا توجد ملاحظات"}
                  </div>
                </div>
              )}
            </div>

            {/* City */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">المدينة</label>
              {isEditing ? (
                <input
                  type="text"
                  value={edited.billing_city ?? order.billing_city}
                  onChange={(e) => handleEditChange(order.id, "billing_city", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <span className="text-sm text-gray-900">{order.billing_city}</span>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">طريقة الدفع</label>
              {isEditing ? (
                <div className="space-y-2">
                  <select
                    value={edited.payment_method ?? order.payment_method}
                    onChange={(e) => handleEditChange(order.id, "payment_method", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="valu">Valu</option>
                    <option value="partial">Partial</option>
                    <option value="paymob">Paymob</option>
                    <option value="instapay">Instapay</option>
                    <option value="wallet">Wallet</option>
                    <option value="visa_machine">Visa Machine</option>
                    <option value="on_hand">On Hand</option>
                  </select>
                  

                </div>
              ) : (
                <span className="text-sm text-gray-900">{order.payment_method}</span>
              )}
            </div>

            {/* Status */}
            {isEditing && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">الحالة</label>
                <select
                  value={edited.status ?? order.status}
                  onChange={(e) => handleEditChange(order.id, "status", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.keys(statusConfig).map((statusKey) => (
                    <option key={statusKey} value={statusKey}>
                      {statusConfig[statusKey].label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Courier */}
            {isEditing && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">المندوب</label>
                <select
                  value={edited.assigned_courier_id ?? order.assigned_courier_id ?? ""}
                  onChange={(e) => handleEditChange(order.id, "assigned_courier_id", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">غير مخصص</option>
                  {couriers.map((courier) => (
                    <option key={courier.id} value={courier.id}>
                      {courier.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => saveOrderEdit(order.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <Save className="w-3 h-3" />
                    حفظ
                  </button>
                  <button
                    onClick={() => cancelEdit(order.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors text-sm"
                  >
                    <X className="w-3 h-3" />
                    إلغاء
                  </button>
                </>
              ) : (
                <>
                  {viewMode === "active" && (
                    <button
                      onClick={() => startEdit(order.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Edit3 className="w-3 h-3" />
                      تعديل
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedOrders([order.id])
                      setShowDeleteConfirm(true)
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    <Trash2 className="w-3 h-3" />
                    حذف
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Custom CSS for always visible scrollbars */}
      <style>{`
        .scrollbar-always {
          scrollbar-width: thin;
          scrollbar-color: #CBD5E0 #F7FAFC;
        }
        .scrollbar-always::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }
        .scrollbar-always::-webkit-scrollbar-track {
          background: #F7FAFC;
          border-radius: 6px;
        }
        .scrollbar-always::-webkit-scrollbar-thumb {
          background: #CBD5E0;
          border-radius: 6px;
          border: 2px solid #F7FAFC;
        }
        .scrollbar-always::-webkit-scrollbar-thumb:hover {
          background: #A0AEC0;
        }
        .scrollbar-always::-webkit-scrollbar-corner {
          background: #F7FAFC;
        }
      `}</style>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">إدارة الطلبات</h1>
                <p className="text-gray-600">Orders Management</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("active")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    viewMode === "active" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline">الطلبات النشطة</span>
                </button>
                <button
                  onClick={() => setViewMode("archived")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    viewMode === "archived" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <Archive className="w-4 h-4" />
                  <span className="hidden sm:inline">الأرشيف</span>
                </button>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  showFilters
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">{showFilters ? "إخفاء المرشحات" : "إظهار المرشحات"}</span>
              </button>
              <button
                onClick={fetchOrders}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">تحديث</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Date Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">طلبات يوم: {formatSelectedDate()}</h2>
                <p className="text-sm text-gray-600">
                  Orders for:{" "}
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Date Navigation Buttons */}
              <button
                onClick={goToPreviousDay}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="اليوم السابق"
              >
                <ChevronRight className="w-4 h-4" />
                <span className="hidden sm:inline">السابق</span>
              </button>
              <button
                onClick={goToToday}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                <span>اليوم</span>
              </button>
              <button
                onClick={goToNextDay}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="اليوم التالي"
              >
                <span className="hidden sm:inline">التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
              {/* Custom Date Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  <span>اختر تاريخ</span>
                </button>
                {showDatePicker && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-20">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">اختر التاريخ</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                          setSelectedDate(e.target.value)
                          setShowDatePicker(false)
                        }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowDatePicker(false)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {viewMode === "active" ? "طلبات اليوم" : "الطلبات المؤرشفة"}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{orders.length}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {viewMode === "active" ? "Today's Orders" : "Archived Orders"}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                {viewMode === "active" ? (
                  <Package className="w-6 h-6 text-blue-600" />
                ) : (
                  <Archive className="w-6 h-6 text-blue-600" />
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">الطلبات المدفوعة</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {orders.filter((order) => order.payment_status === "paid").length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Paid Orders</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">عند التسليم</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {orders.filter((order) => order.payment_status === "cod").length}
                </p>
                <p className="text-xs text-gray-500 mt-1">COD Orders</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">الطلبات المخصصة</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {orders.filter((order) => isOrderAssigned(order)).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Assigned Orders</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">القيمة الإجمالية</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {orders.reduce((sum, order) => sum + order.total_order_fees, 0).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">EGP Total Value</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Search className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">مرشحات البحث</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {/* Couriers as checkboxes */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">اختر المندوبين</label>
                <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pl-2 border border-gray-200 rounded-lg">
                  {couriers.map((courier) => (
                    <label key={courier.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.couriers.includes(courier.id)}
                        onChange={() => {
                          setFilters((prev) => {
                            const alreadySelected = prev.couriers.includes(courier.id)
                            return {
                              ...prev,
                              couriers: alreadySelected
                                ? prev.couriers.filter((id) => id !== courier.id)
                                : [...prev.couriers, courier.id],
                            }
                          })
                        }}
                      />
                      <span>{courier.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Statuses as checkboxes */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">اختر الحالات</label>
                <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pl-2 border border-gray-200 rounded-lg">
                  {Object.keys(statusConfig).map((statusKey) => (
                    <label key={statusKey} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.statuses.includes(statusKey)}
                        onChange={() => {
                          setFilters((prev) => {
                            const alreadySelected = prev.statuses.includes(statusKey)
                            return {
                              ...prev,
                              statuses: alreadySelected
                                ? prev.statuses.filter((s) => s !== statusKey)
                                : [...prev.statuses, statusKey],
                            }
                          })
                        }}
                      />
                      <span>{statusConfig[statusKey].label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment Status Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">حالة الدفع</label>
                <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pl-2 border border-gray-200 rounded-lg">
                  {[
                    { key: "paid", label: "مدفوع" },
                    { key: "pending", label: "معلق" },
                    { key: "cod", label: "عند التسليم" },
                  ].map((status) => (
                    <label key={status.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.paymentStatuses.includes(status.key)}
                        onChange={() => {
                          setFilters((prev) => {
                            const alreadySelected = prev.paymentStatuses.includes(status.key)
                            return {
                              ...prev,
                              paymentStatuses: alreadySelected
                                ? prev.paymentStatuses.filter((s) => s !== status.key)
                                : [...prev.paymentStatuses, status.key],
                            }
                          })
                        }}
                      />
                      <span>{status.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Phone filter */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">رقم الهاتف</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="رقم الهاتف"
                    value={textFilters.mobile}
                    onChange={(e) => setTextFilters((prev) => ({ ...prev, mobile: e.target.value }))}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      textFilters.mobile !== filters.mobile ? "border-orange-300 bg-orange-50" : "border-gray-300"
                    }`}
                  />
                </div>
              </div>

              {/* Order ID filter */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">رقم الطلب</label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="رقم الطلب"
                    value={textFilters.orderId}
                    onChange={(e) => setTextFilters((prev) => ({ ...prev, orderId: e.target.value }))}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      textFilters.orderId !== filters.orderId ? "border-orange-300 bg-orange-50" : "border-gray-300"
                    }`}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  applyTextFilters()
                  fetchOrders()
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Search className="w-4 h-4" />
                تطبيق المرشحات
              </button>
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
                مسح المرشحات
              </button>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedOrders.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <span className="font-semibold text-gray-900">{selectedOrders.length} طلب محدد</span>
              </div>
              <div className="flex items-center gap-3">
                {viewMode === "active" && (
                  <>
                    <select
                      value={selectedCourier}
                      onChange={(e) => setSelectedCourier(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">اختر المندوب</option>
                      {couriers.map((courier) => (
                        <option key={courier.id} value={courier.id}>
                          {courier.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssignOrders}
                      disabled={assignLoading || !selectedCourier}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {assignLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      تعيين المحدد
                    </button>
                    <button
                      onClick={() => setShowArchiveConfirm(true)}
                      disabled={archiveLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Archive className="w-4 h-4" />
                      أرشفة المحدد
                    </button>
                  </>
                )}
                {viewMode === "archived" && (
                  <button
                    onClick={handleRestoreOrders}
                    disabled={archiveLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {archiveLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <ArchiveRestore className="w-4 h-4" />
                    )}
                    استعادة المحدد
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف المحدد
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-3 text-green-800">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Orders Display */}
        {isMobile ? (
          /* Mobile Card Layout */
          <div className="space-y-4">
            {orders.map((order) => (
              <MobileOrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          /* Desktop Table Layout with Sticky Columns and Always Visible Scrollbars */
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="relative overflow-x-scroll overflow-y-auto max-h-[60vh] scrollbar-always">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="sticky left-0 z-20 bg-gray-50 px-6 py-4 text-right border-r border-gray-200">
                      <input
                        type="checkbox"
                        checked={selectedOrders.length === orders.length && orders.length > 0}
                        onChange={toggleAllOrders}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="sticky left-12 z-20 bg-gray-50 px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 min-w-[120px]">
                      رقم الطلب
                    </th>
                    <th className="sticky left-40 z-20 bg-gray-50 px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 min-w-[200px]">
                      العميل
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[80px]">
                      وقت الطلب
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[300px]">
                      العنوان
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[250px]">
                      الملاحظات
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">
                      المدينة
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[130px]">
                      الهاتف
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[100px]">
                      المبلغ
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">
                      طريقة الدفع
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">
                      حالة الدفع
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">
                      الحالة المالية
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">
                      الحالة
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[140px]">
                      المندوب
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[150px]">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => {
                    const edited = orderEdits[order.id] || {}
                    const isEditing = editingOrder === order.id
                    const assigned = isOrderAssigned(order)

                    return (
                      <tr
                        key={order.id}
                        className={`transition-colors ${
                          assigned ? "bg-green-50 hover:bg-green-100" : "hover:bg-gray-50"
                        }`}
                      >
                        <td
                          className={`sticky left-0 z-10 px-6 py-4 border-r border-gray-200 ${
                            assigned ? "bg-green-50" : "bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedOrders.includes(order.id)}
                              onChange={() => toggleOrderSelection(order.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            {assigned && <div className="w-2 h-2 bg-green-500 rounded-full" title="مخصص لمندوب"></div>}
                          </div>
                        </td>
                        <td
                          className={`sticky left-12 z-10 px-6 py-4 border-r border-gray-200 ${
                            assigned ? "bg-green-50" : "bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">#{order.order_id}</span>
                          </div>
                        </td>
                        <td
                          className={`sticky left-40 z-10 px-6 py-4 border-r border-gray-200 ${
                            assigned ? "bg-green-50" : "bg-white"
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={edited.customer_name ?? order.customer_name}
                                onChange={(e) => handleEditChange(order.id, "customer_name", e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <button
                                onClick={() =>
                                  openExpandedEdit(
                                    order.id,
                                    "customer_name",
                                    edited.customer_name ?? order.customer_name,
                                  )
                                }
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <Maximize2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{order.customer_name}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {order.created_at ? formatOrderTime(order.created_at) : "-"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <textarea
                                value={edited.address ?? order.address}
                                onChange={(e) => handleEditChange(order.id, "address", e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                rows={2}
                              />
                              <button
                                onClick={() => openExpandedEdit(order.id, "address", edited.address ?? order.address)}
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                title="توسيع محرر العنوان"
                              >
                                <Maximize2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-900 break-words">{order.address}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <textarea
                                value={edited.notes ?? order.notes ?? ""}
                                onChange={(e) => handleEditChange(order.id, "notes", e.target.value)}
                                placeholder="أضف ملاحظات"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                rows={2}
                              />
                              <button
                                onClick={() => openExpandedEdit(order.id, "notes", edited.notes ?? order.notes ?? "")}
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                title="توسيع محرر الملاحظات"
                              >
                                <Maximize2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2">
                              <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div className="text-sm text-gray-900 break-words">
                                {order.notes ? renderNotesWithLinks(order.notes) : "لا توجد ملاحظات"}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={edited.billing_city ?? order.billing_city}
                                onChange={(e) => handleEditChange(order.id, "billing_city", e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <button
                                onClick={() =>
                                  openExpandedEdit(order.id, "billing_city", edited.billing_city ?? order.billing_city)
                                }
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <Maximize2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-900">{order.billing_city}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={edited.mobile_number ?? order.mobile_number}
                              onChange={(e) => handleEditChange(order.id, "mobile_number", e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <a
                                href={`tel:${order.mobile_number}`}
                                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                {order.mobile_number}
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={edited.total_order_fees ?? order.total_order_fees}
                              onChange={(e) => handleEditChange(order.id, "total_order_fees", Number(e.target.value))}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900">
                                {order.total_order_fees.toFixed(2)} ج.م
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <div className="space-y-2">
                              <select
                                value={edited.payment_method ?? order.payment_method}
                                onChange={(e) => handleEditChange(order.id, "payment_method", e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="valu">Valu</option>
                                <option value="partial">Partial</option>
                                <option value="paymob">Paymob</option>
                                <option value="instapay">Instapay</option>
                                <option value="wallet">Wallet</option>
                                <option value="visa_machine">Visa Machine</option>
                                <option value="on_hand">On Hand</option>
                              </select>
                              

                            </div>
                          ) : (
                            <span className="text-sm text-gray-900">{order.payment_method}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <select
                              value={edited.payment_status ?? order.payment_status}
                              onChange={(e) => handleEditChange(order.id, "payment_status", e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="paid">مدفوع</option>
                              <option value="pending">معلق</option>
                              <option value="cod">عند التسليم</option>
                            </select>
                          ) : (
                            getPaymentStatusBadge(order.payment_status)
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <select
                              value={edited.financial_status ?? order.financial_status ?? ""}
                              onChange={(e) => handleEditChange(order.id, "financial_status", e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">اختر الحالة المالية</option>
                              <option value="paid">مدفوع بالكامل</option>
                              <option value="partial">مدفوع جزئياً</option>
                              <option value="pending">معلق</option>
                              <option value="overdue">متأخر</option>
                              <option value="refunded">مسترد</option>
                              <option value="disputed">متنازع عليه</option>
                            </select>
                          ) : (
                            getFinancialStatusBadge(order.financial_status)
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <select
                              value={edited.status ?? order.status}
                              onChange={(e) => handleEditChange(order.id, "status", e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {Object.keys(statusConfig).map((statusKey) => (
                                <option key={statusKey} value={statusKey}>
                                  {statusConfig[statusKey].label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            getStatusBadge(order.status)
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <select
                              value={edited.assigned_courier_id ?? order.assigned_courier_id ?? ""}
                              onChange={(e) => handleEditChange(order.id, "assigned_courier_id", e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">غير مخصص</option>
                              {couriers.map((courier) => (
                                <option key={courier.id} value={courier.id}>
                                  {courier.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-gray-400" />
                              <span className={`text-sm ${assigned ? "text-green-700 font-medium" : "text-gray-900"}`}>
                                {order.courier_name || "غير مخصص"}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveOrderEdit(order.id)}
                                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                >
                                  <Save className="w-3 h-3" />
                                  حفظ
                                </button>
                                <button
                                  onClick={() => cancelEdit(order.id)}
                                  className="flex items-center gap-1 px-3 py-1 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors text-sm"
                                >
                                  <X className="w-3 h-3" />
                                  إلغاء
                                </button>
                              </>
                            ) : (
                              <>
                                {viewMode === "active" && (
                                  <button
                                    onClick={() => startEdit(order.id)}
                                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    تعديل
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedOrders([order.id])
                                    setShowDeleteConfirm(true)
                                  }}
                                  className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  حذف
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {orders.length === 0 && (
              <div className="text-center py-16">
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    {viewMode === "active" ? (
                      <Package className="w-8 h-8 text-gray-400" />
                    ) : (
                      <Archive className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {viewMode === "active" ? "لا توجد طلبات لهذا اليوم" : "لا توجد طلبات مؤرشفة لهذا اليوم"}
                    </h3>
                    <p className="text-gray-600">جرب اختيار تاريخ آخر أو تعديل مرشحات البحث</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expanded Edit Modal */}
        {expandedField && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Edit3 className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    تعديل{" "}
                    {expandedField.field === "address"
                      ? "العنوان"
                      : expandedField.field === "customer_name"
                        ? "اسم العميل"
                        : expandedField.field === "billing_city"
                          ? "المدينة"
                          : expandedField.field === "notes"
                            ? "الملاحظات"
                            : expandedField.field}
                  </h3>
                </div>
                <button
                  onClick={() => setExpandedField(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <textarea
                  value={expandedValue}
                  onChange={(e) => setExpandedValue(e.target.value)}
                  placeholder={`أدخل ${
                    expandedField.field === "address"
                      ? "العنوان"
                      : expandedField.field === "customer_name"
                        ? "اسم العميل"
                        : expandedField.field === "billing_city"
                          ? "المدينة"
                          : expandedField.field === "notes"
                            ? "الملاحظات"
                            : expandedField.field
                  }`}
                  className="w-full h-40 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end p-6 border-t border-gray-200">
                <button
                  onClick={() => setExpandedField(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={closeExpandedEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  تم
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Archive Confirmation Modal */}
        {showArchiveConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Archive className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">تأكيد الأرشفة</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  هل أنت متأكد من أرشفة {selectedOrders.length} طلب؟ سيتم إزالة الطلبات من المندوبين المعينين لها.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowArchiveConfirm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleArchiveOrders}
                    disabled={archiveLoading}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {archiveLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        جاري الأرشفة...
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4" />
                        أرشفة
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">تأكيد الحذف</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  هل أنت متأكد من حذف {selectedOrders.length} طلب؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleDeleteOrders}
                    disabled={deleteLoading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {deleteLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        جاري الحذف...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        حذف
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  )
}

export default OrdersManagement
