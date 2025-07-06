"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Download,
  FileText,
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
}

interface CourierStats {
  totalOrders: number
  deliveredOrders: number
  totalAmount: number
  deliveredAmount: number
  averageOrderValue: number
  completionRate: number
}

const statusColors: Record<string, string> = {
  assigned: "bg-blue-100 text-blue-800 border-blue-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  canceled: "bg-red-100 text-red-800 border-red-200",
  partial: "bg-yellow-100 text-yellow-800 border-yellow-200",
  hand_to_hand: "bg-purple-100 text-purple-800 border-purple-200",
  return: "bg-orange-100 text-orange-800 border-orange-200",
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

  const translate = (key: string) => {
    const translations: Record<string, string> = {
      courierReports: "Courier Reports / تقارير المندوبين",
      couriers: "Couriers / المندوبين",
      loadingCouriers: "Loading couriers... / جاري تحميل المندوبين...",
      selectCourier: "Select a courier / اختر مندوب",
      loadingOrders: "Loading orders... / جاري تحميل الطلبات...",
      noOrders: "No orders found / لا توجد طلبات",
      exportCSV: "Export CSV / تصدير CSV",
      orderId: "Order ID / رقم الطلب",
      status: "Status / الحالة",
      customer: "Customer / العميل",
      address: "Address / العنوان",
      phone: "Phone / الهاتف",
      totalFees: "Total Fees / المبلغ الإجمالي",
      deliveryFee: "Delivery Fee / رسوم التوصيل",
      paymentMethod: "Payment Method / طريقة الدفع",
      partialPaidAmount: "Partial Paid Amount / المبلغ المدفوع جزئياً",
      collectedBy: "Collected By / تم التحصيل بواسطة",
      internalComment: "Internal Comment / تعليق داخلي",
      notes: "Notes / ملاحظات",
      proofImages: "Proof Images / صور الإثبات",
      createdAt: "Created At / تاريخ الإنشاء",
      updatedAt: "Updated At / تاريخ التحديث",
      clickToOpen: "Click to open full image / اضغط لفتح الصورة كاملة",
      noImages: "No images / لا توجد صور",
      totalOrders: "Total Orders / إجمالي الطلبات",
      deliveredOrders: "Delivered Orders / الطلبات المسلمة",
      totalAmount: "Total Amount / المبلغ الإجمالي",
      deliveredAmount: "Delivered Amount / المبلغ المسلم",
      averageOrderValue: "Average Order Value / متوسط قيمة الطلب",
      completionRate: "Completion Rate / معدل الإنجاز",
      searchOrders: "Search orders... / البحث في الطلبات...",
      filterByStatus: "Filter by status / تصفية حسب الحالة",
      allStatuses: "All Statuses / جميع الحالات",
      dateFrom: "Date From / من تاريخ",
      dateTo: "Date To / إلى تاريخ",
      clearFilters: "Clear Filters / مسح المرشحات",
      viewDetails: "View Details / عرض التفاصيل",
      orderDetails: "Order Details / تفاصيل الطلب",
      close: "Close / إغلاق",
      refresh: "Refresh / تحديث",
      courierPerformance: "Courier Performance / أداء المندوب",
      ordersOverview: "Orders Overview / نظرة عامة على الطلبات",
      noExportData: "No data to export / لا توجد بيانات للتصدير",
      exportSuccess: "Data exported successfully / تم تصدير البيانات بنجاح",
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
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_proofs (
            id,
            image_url,
            image_data
          )
        `)
        .eq("assigned_courier_id", courier.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setOrders(data || [])
      calculateStats(data || [])
    } catch (error: any) {
      alert("Error loading orders / خطأ في تحميل الطلبات: " + error.message)
    } finally {
      setLoadingOrders(false)
    }
  }

  const calculateStats = (orderData: Order[]) => {
    const totalOrders = orderData.length
    const deliveredOrders = orderData.filter((order) => order.status === "delivered").length
    const totalAmount = orderData.reduce((sum, order) => sum + order.total_order_fees, 0)
    const deliveredAmount = orderData
      .filter((order) => order.status === "delivered")
      .reduce((sum, order) => sum + order.total_order_fees, 0)
    const averageOrderValue = totalOrders > 0 ? totalAmount / totalOrders : 0
    const completionRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0

    setCourierStats({
      totalOrders,
      deliveredOrders,
      totalAmount,
      deliveredAmount,
      averageOrderValue,
      completionRate,
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
      created_at: new Date(order.created_at).toLocaleString(),
      updated_at: new Date(order.updated_at).toLocaleString(),
    }))

    const csv = Papa.unparse(dataToExport)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    saveAs(blob, `courier-orders-${selectedCourier?.name || "unknown"}-${new Date().toISOString().split("T")[0]}.csv`)
    alert(translate("exportSuccess"))
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("")
    setDateRange({ start: "", end: "" })
  }

  const getStatusBadge = (status: string) => {
    const colorClass = statusColors[status] || "bg-gray-100 text-gray-800 border-gray-200"
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const openOrderModal = (order: Order) => {
    setSelectedOrder(order)
    setShowOrderModal(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                {translate("courierReports")}
              </h1>
              <p className="text-gray-600 mt-1">
                View detailed courier performance and order reports / عرض تقارير أداء المندوبين والطلبات
              </p>
            </div>
            <button
              onClick={() => selectedCourier && fetchOrdersForCourier(selectedCourier)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {translate("refresh")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Courier List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                {translate("couriers")}
              </h3>
              {loadingCouriers ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">{translate("loadingCouriers")}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {couriers.map((courier) => (
                    <button
                      key={courier.id}
                      onClick={() => fetchOrdersForCourier(courier)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                        selectedCourier?.id === courier.id
                          ? "bg-blue-100 text-blue-800 border border-blue-200 font-semibold"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {courier.name}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedCourier ? (
              <div className="space-y-6">
                {/* Courier Stats */}
                {courierStats && (
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      {translate("courierPerformance")}: {selectedCourier.name}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">{translate("totalOrders")}</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{courierStats.totalOrders}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium text-green-800">{translate("deliveredOrders")}</span>
                        </div>
                        <p className="text-2xl font-bold text-green-900">{courierStats.deliveredOrders}</p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-5 h-5 text-purple-600" />
                          <span className="text-sm font-medium text-purple-800">{translate("totalAmount")}</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-900">{courierStats.totalAmount.toFixed(2)} EGP</p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-5 h-5 text-orange-600" />
                          <span className="text-sm font-medium text-orange-800">{translate("deliveredAmount")}</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-900">
                          {courierStats.deliveredAmount.toFixed(2)} EGP
                        </p>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-5 h-5 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">{translate("averageOrderValue")}</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-900">
                          {courierStats.averageOrderValue.toFixed(2)} EGP
                        </p>
                      </div>
                      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-5 h-5 text-indigo-600" />
                          <span className="text-sm font-medium text-indigo-800">{translate("completionRate")}</span>
                        </div>
                        <p className="text-2xl font-bold text-indigo-900">{courierStats.completionRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filters and Export */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <div className="flex-1 min-w-64">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder={translate("searchOrders")}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{translate("allStatuses")}</option>
                      <option value="assigned">Assigned / مكلف</option>
                      <option value="delivered">Delivered / تم التوصيل</option>
                      <option value="canceled">Canceled / ملغي</option>
                      <option value="partial">Partial / جزئي</option>
                      <option value="hand_to_hand">Hand to Hand / استبدال</option>
                      <option value="return">Return / مرتجع</option>
                    </select>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={translate("dateFrom")}
                    />
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={translate("dateTo")}
                    />
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
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

                {/* Orders List */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      {translate("ordersOverview")} ({filteredOrders.length})
                    </h3>
                  </div>
                  <div className="p-6">
                    {loadingOrders ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">{translate("loadingOrders")}</p>
                      </div>
                    ) : filteredOrders.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">{translate("noOrders")}</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {filteredOrders.map((order) => (
                          <div
                            key={order.id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">#{order.order_id}</span>
                                {getStatusBadge(order.status)}
                              </div>
                              <button
                                onClick={() => openOrderModal(order)}
                                className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                              >
                                <Eye className="w-3 h-3" />
                                {translate("viewDetails")}
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">{translate("customer")}:</span>
                                <span className="font-medium">{order.customer_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">{translate("phone")}:</span>
                                <a href={`tel:${order.mobile_number}`} className="text-blue-600 hover:underline">
                                  {order.mobile_number}
                                </a>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">{translate("totalFees")}:</span>
                                <span className="font-medium text-green-600">
                                  {order.total_order_fees.toFixed(2)} EGP
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">{translate("paymentMethod")}:</span>
                                <span>{order.payment_method}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">{translate("createdAt")}:</span>
                                <span>{new Date(order.created_at).toLocaleDateString()}</span>
                              </div>
                              {order.order_proofs && order.order_proofs.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <Camera className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-600">{translate("proofImages")}:</span>
                                  <span className="text-blue-600">{order.order_proofs.length} images</span>
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
              <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{translate("selectCourier")}</h3>
                <p className="text-gray-600">
                  Choose a courier from the list to view their orders and performance / اختر مندوب من القائمة لعرض
                  طلباته وأدائه
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Order Details Modal */}
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold">
                    {translate("orderDetails")} #{selectedOrder.order_id}
                  </h3>
                  <button
                    onClick={() => setShowOrderModal(false)}
                    className="text-white hover:text-gray-200 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{translate("customer")}</label>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{selectedOrder.customer_name}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{translate("phone")}</label>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <a href={`tel:${selectedOrder.mobile_number}`} className="text-blue-600 hover:underline">
                          {selectedOrder.mobile_number}
                        </a>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{translate("address")}</label>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="text-gray-900">{selectedOrder.address}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{translate("status")}</label>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{translate("totalFees")}</label>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-xl font-bold text-green-600">
                          {selectedOrder.total_order_fees.toFixed(2)} EGP
                        </span>
                      </div>
                    </div>
                    {selectedOrder.delivery_fee && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {translate("deliveryFee")}
                        </label>
                        <span className="text-gray-900">{selectedOrder.delivery_fee.toFixed(2)} EGP</span>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {translate("paymentMethod")}
                      </label>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">
                          {selectedOrder.payment_method}
                          {selectedOrder.payment_sub_type && ` (${selectedOrder.payment_sub_type})`}
                        </span>
                      </div>
                    </div>
                    {selectedOrder.collected_by && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {translate("collectedBy")}
                        </label>
                        <span className="text-gray-900">{selectedOrder.collected_by}</span>
                      </div>
                    )}
                  </div>
                </div>

                {(selectedOrder.internal_comment || selectedOrder.notes) && (
                  <div className="mt-6 space-y-4">
                    {selectedOrder.internal_comment && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {translate("internalComment")}
                        </label>
                        <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedOrder.internal_comment}</p>
                      </div>
                    )}
                    {selectedOrder.notes && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{translate("notes")}</label>
                        <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedOrder.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedOrder.order_proofs && selectedOrder.order_proofs.length > 0 && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">{translate("proofImages")}</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {selectedOrder.order_proofs.map((proof) => {
                        const src = proof.image_url || proof.image_data || ""
                        return (
                          <div key={proof.id} className="relative group">
                            <img
                              src={src || "/placeholder.svg"}
                              alt={translate("clickToOpen")}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => window.open(src, "_blank")}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                              <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        {translate("createdAt")}: {new Date(selectedOrder.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        {translate("updatedAt")}: {new Date(selectedOrder.updated_at).toLocaleString()}
                      </span>
                    </div>
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
