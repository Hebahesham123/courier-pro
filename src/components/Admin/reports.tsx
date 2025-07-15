"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import Papa from "papaparse"
import { saveAs } from "file-saver"

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
  notes?: string | null
  order_proofs?: OrderProof[]
  created_at: string
  updated_at: string
  archived?: boolean
  archived_at?: string
}

interface CourierStats {
  totalOrders: number
  deliveredOrders: number
  totalAmount: number
  deliveredAmount: number
  averageOrderValue: number
  completionRate: number
  archivedOrders: number
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
      icon: TrendingUp,
    },
  }

const Reports: React.FC = () => {
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loadingCouriers, setLoadingCouriers] = useState(false)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [courierStats, setCourierStats] = useState<CourierStats | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [viewMode, setViewMode] = useState<"active" | "archived">("active")

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
      } catch (error: any) {
        console.error("Error fetching couriers:", error)
      } finally {
        setLoadingCouriers(false)
      }
    }
    fetchCouriers()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchTerm, statusFilter, dateRange])

  const fetchOrdersForCourier = async (courier: Courier) => {
    setSelectedCourier(courier)
    setLoadingOrders(true)
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
        query = query.eq("assigned_courier_id", courier.id).eq("archived", false)
      } else {
        query = query.eq("original_courier_id", courier.id).eq("archived", true)
      }

      const { data, error } = await query

      if (error) throw error

      // Add courier name based on view mode
      const ordersWithCourierNames = (data || []).map((order: any) => ({
        ...order,
        courier_name: viewMode === "active" ? order.assigned_courier?.name : order.original_courier?.name,
        courier_id: viewMode === "active" ? order.assigned_courier?.id : order.original_courier?.id,
      }))

      setOrders(ordersWithCourierNames)
      calculateStats(ordersWithCourierNames, courier.id)
    } catch (error: any) {
      alert("Error loading orders / خطأ في تحميل الطلبات: " + error.message)
    } finally {
      setLoadingOrders(false)
    }
  }

  const calculateStats = async (orderData: Order[], courierId: string) => {
    // Get active orders stats
    const { data: activeOrdersData } = await supabase
      .from("orders")
      .select("*")
      .eq("assigned_courier_id", courierId)
      .eq("archived", false)

    const activeOrders = activeOrdersData || []
    const totalOrders = activeOrders.length
    const deliveredOrders = activeOrders.filter((order) => order.status === "delivered").length
    const totalAmount = activeOrders.reduce((sum, order) => sum + order.total_order_fees, 0)
    const deliveredAmount = activeOrders
      .filter((order) => order.status === "delivered")
      .reduce((sum, order) => sum + order.total_order_fees, 0)
    const averageOrderValue = totalOrders > 0 ? totalAmount / totalOrders : 0
    const completionRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0

    // Get archived orders count using original_courier_id
    const { data: archivedData } = await supabase
      .from("orders")
      .select("id")
      .eq("original_courier_id", courierId)
      .eq("archived", true)

    const archivedOrders = archivedData?.length || 0

    setCourierStats({
      totalOrders,
      deliveredOrders,
      totalAmount,
      deliveredAmount,
      averageOrderValue,
      completionRate,
      archivedOrders,
    })
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

    if (statusFilter) {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    if (dateRange.start) {
      filtered = filtered.filter((order) => new Date(order.created_at) >= new Date(dateRange.start))
    }

    if (dateRange.end) {
      filtered = filtered.filter((order) => new Date(order.created_at) <= new Date(dateRange.end))
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
    const filename = `courier-orders-${selectedCourier?.name || "unknown"}-${viewMode}-${new Date().toISOString().split("T")[0]}.csv`
    saveAs(blob, filename)
    alert(translate("exportSuccess"))
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("")
    setDateRange({ start: "", end: "" })
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

  const openOrderModal = (order: Order) => {
    setSelectedOrder(order)
    setShowOrderModal(true)
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
            <button
              onClick={() => selectedCourier && fetchOrdersForCourier(selectedCourier)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">{translate("refresh")}</span>
            </button>
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
                      <button
                        key={courier.id}
                        onClick={() => fetchOrdersForCourier(courier)}
                        className={`w-full text-right px-4 py-3 rounded-lg transition-all duration-200 ${
                          selectedCourier?.id === courier.id
                            ? "bg-blue-50 border-2 border-blue-200 text-blue-700 font-semibold shadow-sm"
                            : "hover:bg-gray-50 border-2 border-transparent text-gray-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                selectedCourier?.id === courier.id ? "bg-blue-100" : "bg-gray-100"
                              }`}
                            >
                              <User
                                className={`w-4 h-4 ${
                                  selectedCourier?.id === courier.id ? "text-blue-600" : "text-gray-500"
                                }`}
                              />
                            </div>
                            <span className="text-sm">{courier.name}</span>
                          </div>
                          {selectedCourier?.id === courier.id && <ArrowUpRight className="w-4 h-4 text-blue-600" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedCourier ? (
              <div className="space-y-8">
                {/* View Mode Toggle */}
                {selectedCourier && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">تقارير المندوب: {selectedCourier.name}</h3>
                      <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => {
                            setViewMode("active")
                            fetchOrdersForCourier(selectedCourier)
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
                            fetchOrdersForCourier(selectedCourier)
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
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {translate("courierPerformance")}: {selectedCourier.name}
                        </h3>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                              <Archive className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-orange-900">{courierStats.archivedOrders}</p>
                              <p className="text-xs text-orange-600 mt-1">طلب مؤرشف</p>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-orange-800">{translate("archivedOrders")}</p>
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
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Filter className="w-4 h-4 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">البحث والتصفية</h3>
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
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">{translate("allStatuses")}</option>
                          <option value="assigned">مكلف</option>
                          <option value="delivered">تم التوصيل</option>
                          <option value="canceled">ملغي</option>
                          <option value="partial">جزئي</option>
                          <option value="hand_to_hand">استبدال</option>
                          <option value="return">مرتجع</option>
                        </select>
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
                        <p className="text-gray-600">جرب تعديل مرشحات البحث</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredOrders.map((order) => (
                          <div
                            key={order.id}
                            className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  {viewMode === "active" ? (
                                    <Package className="w-5 h-5 text-blue-600" />
                                  ) : (
                                    <Archive className="w-5 h-5 text-blue-600" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">#{order.order_id}</h4>
                                  <p className="text-sm text-gray-600">{order.customer_name}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {getStatusBadge(order.status)}
                                <button
                                  onClick={() => openOrderModal(order)}
                                  className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                  <Eye className="w-3 h-3" />
                                  {translate("viewDetails")}
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Phone className="w-4 h-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">الهاتف</p>
                                  <a
                                    href={`tel:${order.mobile_number}`}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                  >
                                    {order.mobile_number}
                                  </a>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <DollarSign className="w-4 h-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">المبلغ</p>
                                  <p className="text-sm font-medium text-green-600">
                                    {order.total_order_fees.toFixed(2)} ج.م
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <CreditCard className="w-4 h-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">طريقة الدفع</p>
                                  <p className="text-sm font-medium text-gray-900">{order.payment_method}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <div>
                                  <p className="text-xs text-gray-600">
                                    {viewMode === "active" ? "تاريخ الإنشاء" : "تاريخ الأرشفة"}
                                  </p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {viewMode === "active"
                                      ? new Date(order.created_at).toLocaleDateString("ar-EG")
                                      : order.archived_at
                                        ? new Date(order.archived_at).toLocaleDateString("ar-EG")
                                        : "-"}
                                  </p>
                                </div>
                              </div>

                              {order.order_proofs && order.order_proofs.length > 0 && (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                  <Camera className="w-4 h-4 text-gray-500" />
                                  <div>
                                    <p className="text-xs text-gray-600">صور الإثبات</p>
                                    <p className="text-sm font-medium text-blue-600">
                                      {order.order_proofs.length} صورة
                                    </p>
                                  </div>
                                </div>
                              )}

                              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                                <div>
                                  <p className="text-xs text-gray-600">العنوان</p>
                                  <p className="text-sm font-medium text-gray-900 line-clamp-2">{order.address}</p>
                                </div>
                              </div>
                              {viewMode === "archived" && (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                  <User className="w-4 h-4 text-gray-500" />
                                  <div>
                                    <p className="text-xs text-gray-600">المندوب الأصلي</p>
                                    <p className="text-sm font-medium text-gray-900">
                                      {order.courier_name || "غير محدد"}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
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
              <div className="bg-blue-600 text-white p-6 rounded-t-xl">
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
