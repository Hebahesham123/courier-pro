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
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../contexts/LanguageContext"

interface Order {
  id: string
  order_id: string
  customer_name: string
  address: string
  mobile_number: string
  total_order_fees: number
  payment_method: string
  status: string
  assigned_courier_id: string | null
  courier_name?: string
  created_at?: string
  notes?: string
}

interface Courier {
  id: string
  name: string
  email: string
  role: string
}

const statusColors: Record<string, string> = {
  assigned: "bg-blue-100 text-blue-800 border-blue-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  canceled: "bg-red-100 text-red-800 border-red-200",
  partial: "bg-yellow-100 text-yellow-800 border-yellow-200",
  hand_to_hand: "bg-purple-100 text-purple-800 border-purple-200",
  return: "bg-orange-100 text-orange-800 border-orange-200",
}

const OrdersManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [selectedCourier, setSelectedCourier] = useState("")
  const [assignLoading, setAssignLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [noteEdits, setNoteEdits] = useState<{ [id: string]: string }>({})
  const [orderEdits, setOrderEdits] = useState<{ [id: string]: Partial<Order> }>({})
  const [editingOrder, setEditingOrder] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
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
  }, [])

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
          id, order_id, customer_name, address, mobile_number, total_order_fees,
          payment_method, status, assigned_courier_id, created_at, notes,
          users!orders_assigned_courier_id_fkey(name)
        `)
        .order("created_at", { ascending: false })

      if (filters.courier) {
        const { data: matchedCouriers } = await supabase
          .from("users")
          .select("id")
          .ilike("name", `%${filters.courier}%`)
        const ids = matchedCouriers?.map((c) => c.id) || []
        query = query.in("assigned_courier_id", ids.length > 0 ? ids : [""])
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

  const saveOrderEdit = async (orderId: string) => {
    const changes = orderEdits[orderId]
    if (!changes) return

    try {
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

  const updateNote = async (orderId: string) => {
    if (noteEdits[orderId] === undefined) return

    try {
      const { error } = await supabase.from("orders").update({ notes: noteEdits[orderId] }).eq("id", orderId)

      if (error) throw error

      setSuccessMessage("Note updated / تم تحديث الملاحظة")
      fetchOrders()
    } catch (error: any) {
      setError("Failed to update note / فشل تحديث الملاحظة: " + error.message)
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
      const { error } = await supabase
        .from("orders")
        .update({
          assigned_courier_id: selectedCourier,
          status: "assigned",
        })
        .in("id", selectedOrders)

      if (error) throw error

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
    const colorClass = statusColors[status] || "bg-gray-100 text-gray-800 border-gray-200"
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)} / {getStatusArabic(status)}
      </span>
    )
  }

  const getStatusArabic = (status: string) => {
    const statusMap: Record<string, string> = {
      assigned: "مكلف",
      delivered: "تم التوصيل",
      canceled: "ملغي",
      partial: "جزئي",
      hand_to_hand: "استبدال",
      return: "مرتجع",
    }
    return statusMap[status] || status
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading orders... / جاري تحميل الطلبات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Orders Management / إدارة الطلبات</h1>
              <p className="text-gray-600 mt-1">Manage and assign delivery orders / إدارة وتعيين طلبات التوصيل</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? "Hide Filters / إخفاء المرشحات" : "Show Filters / إظهار المرشحات"}
              </button>
              <button
                onClick={fetchOrders}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh / تحديث
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Orders / إجمالي الطلبات</p>
                  <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Available Couriers / المندوبين المتاحين</p>
                  <p className="text-2xl font-bold text-gray-900">{couriers.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Selected Orders / الطلبات المحددة</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedOrders.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Value / القيمة الإجمالية</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {orders.reduce((sum, order) => sum + order.total_order_fees, 0).toFixed(2)} EGP
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Filters / مرشحات البحث
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Search by Courier / البحث بالمندوب
                </label>
                <input
                  type="text"
                  placeholder="Enter courier name / أدخل اسم المندوب"
                  value={filters.courier}
                  onChange={(e) => setFilters((prev) => ({ ...prev, courier: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Search by Mobile / البحث بالهاتف
                </label>
                <input
                  type="text"
                  placeholder="Enter mobile number / أدخل رقم الهاتف"
                  value={filters.mobile}
                  onChange={(e) => setFilters((prev) => ({ ...prev, mobile: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CreditCard className="w-4 h-4 inline mr-1" />
                  Search by Payment / البحث بطريقة الدفع
                </label>
                <input
                  type="text"
                  placeholder="Enter payment method / أدخل طريقة الدفع"
                  value={filters.payment}
                  onChange={(e) => setFilters((prev) => ({ ...prev, payment: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Hash className="w-4 h-4 inline mr-1" />
                  Search by Order ID / البحث برقم الطلب
                </label>
                <input
                  type="text"
                  placeholder="Enter order ID / أدخل رقم الطلب"
                  value={filters.orderId}
                  onChange={(e) => setFilters((prev) => ({ ...prev, orderId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={fetchOrders}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Search className="w-4 h-4" />
                Apply Filters / تطبيق المرشحات
              </button>
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
                Clear Filters / مسح المرشحات
              </button>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedOrders.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">{selectedOrders.length} orders selected / طلب محدد</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedCourier}
                  onChange={(e) => setSelectedCourier(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Courier / اختر المندوب</option>
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
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Assign Selected / تعيين المحدد
                </button>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected / حذف المحدد
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === orders.length && orders.length > 0}
                      onChange={toggleAllOrders}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID / رقم الطلب
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer / العميل
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mobile / الهاتف
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount / المبلغ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment / الدفع
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status / الحالة
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Courier / المندوب
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes / الملاحظات
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions / الإجراءات
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Hash className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{order.order_id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={edited.customer_name ?? order.customer_name}
                            onChange={(e) => handleEditChange(order.id, "customer_name", e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <div className="flex items-center">
                            <User className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">{order.customer_name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={edited.mobile_number ?? order.mobile_number}
                            onChange={(e) => handleEditChange(order.id, "mobile_number", e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 text-gray-400 mr-2" />
                            <a
                              href={`tel:${order.mobile_number}`}
                              className="text-sm text-blue-600 hover:text-blue-800"
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
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <div className="flex items-center">
                            <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900">
                              {order.total_order_fees.toFixed(2)} EGP
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
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="assigned">Assigned / مكلف</option>
                            <option value="delivered">Delivered / تم التوصيل</option>
                            <option value="canceled">Canceled / ملغي</option>
                            <option value="partial">Partial / جزئي</option>
                            <option value="hand_to_hand">Hand to Hand / استبدال</option>
                            <option value="return">Return / مرتجع</option>
                          </select>
                        ) : (
                          getStatusBadge(order.status)
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={edited.assigned_courier_id ?? order.assigned_courier_id ?? ""}
                          onChange={(e) => {
                            handleEditChange(order.id, "assigned_courier_id", e.target.value)
                            saveOrderEdit(order.id)
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Courier / اختر المندوب</option>
                          {couriers.map((courier) => (
                            <option key={courier.id} value={courier.id}>
                              {courier.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={noteEdits[order.id] ?? order.notes ?? ""}
                            onChange={(e) => setNoteEdits({ ...noteEdits, [order.id]: e.target.value })}
                            onBlur={() => updateNote(order.id)}
                            placeholder="Add notes / أضف ملاحظات"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
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
                                Save / حفظ
                              </button>
                              <button
                                onClick={() => {
                                  setEditingOrder(null)
                                  setOrderEdits((prev) => {
                                    const copy = { ...prev }
                                    delete copy[order.id]
                                    return copy
                                  })
                                }}
                                className="flex items-center gap-1 px-3 py-1 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors text-sm"
                              >
                                <X className="w-3 h-3" />
                                Cancel / إلغاء
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingOrder(order.id)}
                                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              >
                                <Edit3 className="w-3 h-3" />
                                Edit / تعديل
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedOrders([order.id])
                                  setShowDeleteConfirm(true)
                                }}
                                className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete / حذف
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
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found / لا توجد طلبات</h3>
              <p className="text-gray-500">Try adjusting your search filters / جرب تعديل مرشحات البحث</p>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion / تأكيد الحذف</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete {selectedOrders.length} order(s)? This action cannot be undone.
                <br />
                <span className="text-sm">
                  هل أنت متأكد من حذف {selectedOrders.length} طلب؟ لا يمكن التراجع عن هذا الإجراء.
                </span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel / إلغاء
                </button>
                <button
                  onClick={handleDeleteOrders}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {deleteLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deleting... / جاري الحذف...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete / حذف
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrdersManagement
