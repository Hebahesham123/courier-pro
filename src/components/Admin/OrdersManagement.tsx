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
  Users,
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
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../contexts/LanguageContext"

interface Order {
  id: string
  order_id: string
  customer_name: string
  address: string
  billing_city: string // Added billing_city
  mobile_number: string
  total_order_fees: number
  payment_method: string
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
  const [filters, setFilters] = useState({
    courier: "",
    mobile: "",
    payment: "",
    orderId: "",
  })
  const { t } = useLanguage()

  useEffect(() => {
    fetchOrders()
    fetchCouriers()
  }, [viewMode])

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
      let query = supabase
        .from("orders")
        .select(`
          id, order_id, customer_name, address, billing_city, mobile_number, total_order_fees,
          payment_method, status, assigned_courier_id, original_courier_id, created_at, notes, archived, archived_at,
          users!orders_assigned_courier_id_fkey(name)
        `)
        .eq("archived", viewMode === "archived")
        .order("created_at", { ascending: false })

      if (filters.courier) {
        const { data: matchedCouriers } = await supabase
          .from("users")
          .select("id")
          .ilike("name", `%${filters.courier}%`)
        const ids = matchedCouriers?.map((c) => c.id) || []
        if (viewMode === "archived") {
          // For archived orders, search in original_courier_id
          query = query.in("original_courier_id", ids.length > 0 ? ids : [""])
        } else {
          // For active orders, search in assigned_courier_id
          query = query.in("assigned_courier_id", ids.length > 0 ? ids : [""])
        }
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
          billing_city: order.billing_city, // Added billing_city
          mobile_number: order.mobile_number,
          total_order_fees: order.total_order_fees,
          payment_method: order.payment_method,
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
      // When assigning a courier, also update original_courier_id if it's not set
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
      // Get current orders to check if original_courier_id needs to be set
      const { data: currentOrders } = await supabase
        .from("orders")
        .select("id, assigned_courier_id, original_courier_id")
        .in("id", selectedOrders)

      // Update each order individually
      for (const order of currentOrders || []) {
        const updateData: any = {
          assigned_courier_id: selectedCourier,
          status: "assigned",
        }
        // Set original_courier_id if it's not already set
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
      // First, get the current orders to preserve original courier assignments
      const { data: ordersToArchive, error: fetchError } = await supabase
        .from("orders")
        .select("id, assigned_courier_id, original_courier_id")
        .in("id", selectedOrders)
      if (fetchError) throw fetchError

      // Update each order individually to preserve original courier assignment
      for (const order of ordersToArchive || []) {
        const updateData: any = {
          archived: true,
          archived_at: new Date().toISOString(),
          assigned_courier_id: null, // Remove from active courier assignment
        }
        // Set original_courier_id if not already set
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
      // Get the orders to restore and their original courier assignments
      const { data: ordersToRestore, error: fetchError } = await supabase
        .from("orders")
        .select("id, original_courier_id")
        .in("id", selectedOrders)
      if (fetchError) throw fetchError

      // Restore each order individually
      for (const order of ordersToRestore || []) {
        const { error } = await supabase
          .from("orders")
          .update({
            archived: false,
            archived_at: null,
            assigned_courier_id: order.original_courier_id, // Restore to original courier
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
      courier: "",
      mobile: "",
      payment: "",
      orderId: "",
    })
    fetchOrders()
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

  return (
    <div className="min-h-screen bg-gray-50">
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
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {viewMode === "active" ? "إجمالي الطلبات" : "الطلبات المؤرشفة"}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{orders.length}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {viewMode === "active" ? "Total Orders" : "Archived Orders"}
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
                <p className="text-sm font-medium text-gray-600">المندوبين المتاحين</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{couriers.length}</p>
                <p className="text-xs text-gray-500 mt-1">Available Couriers</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">الطلبات المحددة</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{selectedOrders.length}</p>
                <p className="text-xs text-gray-500 mt-1">Selected Orders</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-600" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">البحث بالمندوب</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="اسم المندوب"
                    value={filters.courier}
                    onChange={(e) => setFilters((prev) => ({ ...prev, courier: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">البحث بالهاتف</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="رقم الهاتف"
                    value={filters.mobile}
                    onChange={(e) => setFilters((prev) => ({ ...prev, mobile: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">البحث بطريقة الدفع</label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="طريقة الدفع"
                    value={filters.payment}
                    onChange={(e) => setFilters((prev) => ({ ...prev, payment: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">البحث برقم الطلب</label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="رقم الطلب"
                    value={filters.orderId}
                    onChange={(e) => setFilters((prev) => ({ ...prev, orderId: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchOrders}
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
                  <CheckCircle className="w-4 h-4 text-blue-600" />
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
        {/* Orders Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-right">
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === orders.length && orders.length > 0}
                      onChange={toggleAllOrders}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    رقم الطلب
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    العميل
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    العنوان
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    المدينة
                  </th>{" "}
                  {/* New column header */}
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    الهاتف
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    المبلغ
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    طريقة الدفع
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    المندوب
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    الملاحظات
                  </th>
                  {viewMode === "archived" && (
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      تاريخ الأرشفة
                    </th>
                  )}
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => {
                  const edited = orderEdits[order.id] || {}
                  const isEditing = editingOrder === order.id
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">#{order.order_id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
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
                                openExpandedEdit(order.id, "customer_name", edited.customer_name ?? order.customer_name)
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
                      <td className="px-6 py-4 max-w-xs">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={edited.address ?? order.address}
                              onChange={(e) => handleEditChange(order.id, "address", e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      </td>
                      <td className="px-6 py-4">
                        {" "}
                        {/* New column for Billing City */}
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
                          <input
                            type="text"
                            value={edited.payment_method ?? order.payment_method}
                            onChange={(e) => handleEditChange(order.id, "payment_method", e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{order.payment_method}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <select
                            value={edited.status ?? order.status}
                            onChange={(e) => handleEditChange(order.id, "status", e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="assigned">مكلف</option>
                            <option value="delivered">تم التوصيل</option>
                            <option value="canceled">ملغي</option>
                            <option value="partial">جزئي</option>
                            <option value="hand_to_hand">استبدال</option>
                            <option value="return">مرتجع</option>
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
                            <span className="text-sm text-gray-900">{order.courier_name || "غير مخصص"}</span>
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
                            <span className="text-sm text-gray-900 break-words">
                              {order.notes || "لا توجد ملاحظات"}
                            </span>
                          </div>
                        )}
                      </td>
                      {viewMode === "archived" && (
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">
                            {order.archived_at ? new Date(order.archived_at).toLocaleDateString("ar-EG") : "-"}
                          </span>
                        </td>
                      )}
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
                    {viewMode === "active" ? "لا توجد طلبات" : "لا توجد طلبات مؤرشفة"}
                  </h3>
                  <p className="text-gray-600">جرب تعديل مرشحات البحث</p>
                </div>
              </div>
            </div>
          )}
        </div>
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
                        : expandedField.field === "billing_city" // Added billing_city to modal title
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
                        : expandedField.field === "billing_city" // Added billing_city to modal placeholder
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
