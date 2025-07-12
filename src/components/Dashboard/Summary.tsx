"use client"

import type React from "react"
import { useEffect, useState, type KeyboardEvent } from "react"
import {
  DollarSign,
  CreditCard,
  Wallet,
  XCircle,
  Clock,
  Package,
  CheckCircle,
  Truck,
  HandMetal,
  Banknote,
  Smartphone,
  Calendar,
  User,
  TrendingUp,
  Eye,
  X,
  Filter,
  BarChart3,
  ArrowLeft,
  Users,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../contexts/AuthContext"
import { useLanguage } from "../../contexts/LanguageContext"

interface OrderProof {
  id: string
  image_data: string
}

interface Order {
  id: string
  order_id: string
  customer_name: string
  address: string
  mobile_number: string
  total_order_fees: number | string
  delivery_fee: number | string | null
  payment_method: string
  payment_sub_type: string | null
  status: string
  partial_paid_amount: number | string | null
  internal_comment: string | null
  collected_by: string | null
  assigned_courier_id: string | null
  updated_at: string
  notes?: string | null
  order_proofs?: OrderProof[]
}

interface CourierSummary {
  courierId: string
  courierName: string
}

const normalizePaymentMethod = (method = ""): "cash" | "visa" | "valu" | "other" => {
  const m = method.toLowerCase().trim()
  if (m.includes("valu") || m.includes("paymob.valu")) return "valu"
  if (m === "paymob" || m === "visa" || m === "card" || m.includes("paymob")) return "visa"
  if (m === "cash") return "cash"
  return "other"
}

const Summary: React.FC = () => {
  const { user } = useAuth()
  const { t } = useLanguage()

  const translate = (key: string) => {
    const translations: Record<string, string> = {
      loading: "جاري التحميل...",
      pleaseLogin: "يرجى تسجيل الدخول",
      noDataForDate: "لا توجد بيانات لهذا التاريخ",
      todaySummary: "ملخص اليوم",
      selectDate: "اختر التاريخ",
      courier: "المندوب",
      ordersCount: "طلبات",
      amount: "المبلغ",
      EGP: "ج.م",
      backToCouriers: "العودة للمندوبين",
      selectCourier: "اختر مندوب لعرض تفاصيله",
      couriersList: "قائمة المندوبين",
      // Order Status Metrics
      deliveredOrders: "الطلبات المسلمة",
      partialOrders: "الطلبات الجزئية",
      handToHandOrders: "الطلبات يد بيد",
      returnOrders: "الطلبات المرتجعة",
      canceledOrders: "الطلبات الملغاة",
      // Electronic Payment Methods
      visaOrders: "طلبات فيزا",
      valuOrders: "طلبات فاليو",
      // Cash-based Payment Sub-types
      cashOnHandOrders: "طلبات نقداً",
      instapayOrders: "طلبات إنستاباي",
      walletOrders: "طلبات المحفظة",
      // Collection Metrics
      totalCashOnHand: "إجمالي النقد في اليد",
      totalVisaCollected: "إجمالي فيزا محصل",
      totalValuCollected: "إجمالي فاليو محصل",
      deliveryFeesCollected: "رسوم التوصيل المحصلة",
      totalCollected: "إجمالي المحصل",
      orderId: "رقم الطلب",
      customer: "العميل",
      total: "الإجمالي",
      status: "الحالة",
      address: "العنوان",
      phone: "الهاتف",
      comment: "تعليق",
      close: "إغلاق",
      paymentMethod: "طريقة الدفع",
      collectedBy: "محصل بواسطة",
      partialAmount: "المبلغ الجزئي",
      deliveryFee: "رسوم التوصيل",
      assigned: "مكلف",
      delivered: "تم التوصيل",
      canceled: "ملغي",
      partial: "جزئي",
      hand_to_hand: "استبدال",
      return: "مرتجع",
      cash: "نقداً",
      visa: "فيزا",
      valu: "فاليو",
      courier_payment: "المندوب",
      on_hand: "نقداً",
      instapay: "إنستاباي",
      wallet: "المحفظة",
      orderStatusSection: "حالة الطلبات",
      electronicPaymentsSection: "المدفوعات الإلكترونية",
      cashPaymentsSection: "المدفوعات النقدية",
      collectionSummarySection: "ملخص التحصيل",
      orderTotalLabel: "إجمالي الطلب",
      partialAmountLabel: "المبلغ الجزئي",
      orderAmountCollectedLabel: "مبلغ الطلب المحصل",
      totalCourierHandledLabel: "إجمالي ما تعامل معه المندوب",
      paymentSubTypeLabel: "نوع الدفع",
      proofImagesLabel: "صور الإثبات",
    }
    return translations[key] || key
  }

  const [summaryList, setSummaryList] = useState<CourierSummary[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([])
  const [modalTitle, setModalTitle] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedCourier, setSelectedCourier] = useState<CourierSummary | null>(null)

  useEffect(() => {
    fetchSummary()
    const subscription = supabase
      .channel("orders_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchSummary()
      })
      .subscribe()
    return () => {
      subscription.unsubscribe().catch(console.error)
    }
  }, [user, selectedDate, selectedCourier])

  const fetchSummary = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      let orders: Order[] = []
      if (user.role === "courier") {
        // For courier users, show their own data
        const { data } = await supabase
          .from("orders")
          .select(`
            *,
            order_proofs (id, image_data)
          `)
          .eq("assigned_courier_id", user.id)
          .gte("updated_at", `${selectedDate}T00:00:00`)
          .lte("updated_at", `${selectedDate}T23:59:59`)
        orders = (data ?? []) as Order[]
        setSummaryList([{ courierId: user.id, courierName: user.name || translate("courier") }])
        setAllOrders(orders)
      } else {
        // For admin users
        const { data: couriers } = await supabase.from("users").select("id, name").eq("role", "courier")
        setSummaryList((couriers ?? []).map((c) => ({ courierId: c.id, courierName: c.name })))

        if (selectedCourier) {
          // If a courier is selected, fetch only their orders
          const { data } = await supabase
            .from("orders")
            .select(`
              *,
              order_proofs (id, image_data)
            `)
            .eq("assigned_courier_id", selectedCourier.courierId)
            .gte("updated_at", `${selectedDate}T00:00:00`)
            .lte("updated_at", `${selectedDate}T23:59:59`)
          orders = (data ?? []) as Order[]
        } else {
          // If no courier selected, don't fetch any orders (show courier selection)
          orders = []
        }
        setAllOrders(orders)
      }
    } catch (error) {
      console.error("Error fetching summary:", error)
      setSummaryList([])
      setAllOrders([])
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get the actual order amount the courier handled
  const getCourierOrderAmount = (order: Order): number => {
    // If courier put partial_paid_amount, use that
    if (Number(order.partial_paid_amount || 0) > 0) {
      return Number(order.partial_paid_amount || 0)
    }
    // If no partial amount but order is processed (not just assigned), use total order amount
    if (["delivered", "partial", "hand_to_hand", "return"].includes(order.status)) {
      return Number(order.total_order_fees || 0)
    }
    // For canceled orders, only count if there's delivery fee (handled below)
    return 0
  }

  // Helper function to get total amount courier handled (order + delivery fee)
  const getTotalCourierAmount = (order: Order): number => {
    let orderAmount = 0
    const deliveryAmount = Number(order.delivery_fee || 0)
    // For canceled orders, only count delivery fee if courier put it
    if (order.status === "canceled") {
      orderAmount = 0 // No order amount for canceled
      // But keep delivery fee if courier put it
    } else {
      orderAmount = getCourierOrderAmount(order)
    }
    return orderAmount + deliveryAmount
  }

  // Helper function to check if order should be included in calculations
  const shouldIncludeOrder = (order: Order): boolean => {
    // Include if courier handled any amount (order amount or delivery fee)
    return getTotalCourierAmount(order) > 0
  }

  type Metric = {
    label: string
    icon: React.ComponentType<any>
    isMoney: boolean
    color: string
    bgColor: string
    filter: (order: Order, courierId: string) => boolean
    calculateAmount?: (orders: Order[]) => number
  }

  const metrics: Metric[] = [
    // ORDER STATUS METRICS
    {
      label: "deliveredOrders",
      icon: CheckCircle,
      isMoney: true,
      color: "text-green-700",
      bgColor: "bg-green-50 border-green-200",
      filter: (o, courierId) => o.status === "delivered" && o.assigned_courier_id === courierId,
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "partialOrders",
      icon: Clock,
      isMoney: true,
      color: "text-yellow-700",
      bgColor: "bg-yellow-50 border-yellow-200",
      filter: (o, courierId) => o.status === "partial" && o.assigned_courier_id === courierId,
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "handToHandOrders",
      icon: HandMetal,
      isMoney: true,
      color: "text-purple-700",
      bgColor: "bg-purple-50 border-purple-200",
      filter: (o, courierId) => o.status === "hand_to_hand" && o.assigned_courier_id === courierId,
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "returnOrders",
      icon: Truck,
      isMoney: true,
      color: "text-orange-700",
      bgColor: "bg-orange-50 border-orange-200",
      filter: (o, courierId) => o.status === "return" && o.assigned_courier_id === courierId,
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "canceledOrders",
      icon: XCircle,
      isMoney: true,
      color: "text-red-700",
      bgColor: "bg-red-50 border-red-200",
      filter: (o, courierId) => o.status === "canceled" && o.assigned_courier_id === courierId,
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    // ELECTRONIC PAYMENT METHODS
    {
      label: "visaOrders",
      icon: CreditCard,
      isMoney: true,
      color: "text-blue-700",
      bgColor: "bg-blue-50 border-blue-200",
      filter: (o, courierId) =>
        (normalizePaymentMethod(o.payment_method) === "visa" || o.collected_by === "visa") &&
        o.assigned_courier_id === courierId &&
        shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "valuOrders",
      icon: Wallet,
      isMoney: true,
      color: "text-indigo-700",
      bgColor: "bg-indigo-50 border-indigo-200",
      filter: (o, courierId) =>
        (normalizePaymentMethod(o.payment_method) === "valu" || o.collected_by === "valu") &&
        o.assigned_courier_id === courierId &&
        shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    // CASH-BASED PAYMENT SUB-TYPES
    {
      label: "cashOnHandOrders",
      icon: Banknote,
      isMoney: true,
      color: "text-emerald-700",
      bgColor: "bg-emerald-50 border-emerald-200",
      filter: (o, courierId) =>
        o.payment_sub_type === "on_hand" && o.assigned_courier_id === courierId && shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "instapayOrders",
      icon: Smartphone,
      isMoney: true,
      color: "text-cyan-700",
      bgColor: "bg-cyan-50 border-cyan-200",
      filter: (o, courierId) =>
        o.payment_sub_type === "instapay" && o.assigned_courier_id === courierId && shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "walletOrders",
      icon: Wallet,
      isMoney: true,
      color: "text-teal-700",
      bgColor: "bg-teal-50 border-teal-200",
      filter: (o, courierId) =>
        o.payment_sub_type === "wallet" && o.assigned_courier_id === courierId && shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    // COLLECTION SUMMARY METRICS
    {
      label: "totalCashOnHand",
      icon: DollarSign,
      isMoney: true,
      color: "text-green-700",
      bgColor: "bg-green-50 border-green-200",
      filter: (o, courierId) =>
        o.payment_sub_type === "on_hand" && o.assigned_courier_id === courierId && shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "totalVisaCollected",
      icon: CreditCard,
      isMoney: true,
      color: "text-blue-700",
      bgColor: "bg-blue-50 border-blue-200",
      filter: (o, courierId) =>
        (normalizePaymentMethod(o.payment_method) === "visa" || o.collected_by === "visa") &&
        o.assigned_courier_id === courierId &&
        shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "totalValuCollected",
      icon: Wallet,
      isMoney: true,
      color: "text-indigo-700",
      bgColor: "bg-indigo-50 border-indigo-200",
      filter: (o, courierId) =>
        (normalizePaymentMethod(o.payment_method) === "valu" || o.collected_by === "valu") &&
        o.assigned_courier_id === courierId &&
        shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "deliveryFeesCollected",
      icon: Package,
      isMoney: true,
      color: "text-purple-700",
      bgColor: "bg-purple-50 border-purple-200",
      filter: (o, courierId) => Number(o.delivery_fee || 0) > 0 && o.assigned_courier_id === courierId,
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + Number(o.delivery_fee || 0), 0),
    },
    {
      label: "totalCollected",
      icon: TrendingUp,
      isMoney: true,
      color: "text-gray-700",
      bgColor: "bg-gray-50 border-gray-200",
      filter: (o, courierId) => o.assigned_courier_id === courierId && shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
  ]

  const calcCountAmount = (metric: Metric, courierId: string) => {
    const filtered = allOrders.filter((o) => metric.filter(o, courierId))
    const count = filtered.length
    let amount = 0
    if (metric.calculateAmount) {
      amount = metric.calculateAmount(filtered)
    }
    return { count, amount }
  }

  const openOrders = (filterFn: (order: Order) => boolean, title: string) => {
    setModalTitle(title)
    setSelectedOrders(allOrders.filter(filterFn))
  }

  const handleCourierSelect = (courier: CourierSummary) => {
    setSelectedCourier(courier)
  }

  const handleBackToCouriers = () => {
    setSelectedCourier(null)
    setAllOrders([])
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-lg font-medium text-gray-700">{translate("loading")}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <User className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-lg font-medium text-gray-700">{translate("pleaseLogin")}</p>
        </div>
      </div>
    )
  }

  // For admin users, show courier selection if no courier is selected
  if (user.role !== "courier" && !selectedCourier) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{translate("todaySummary")}</h1>
                  <p className="text-gray-600">تقرير شامل لأداء المندوبين</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="ltr"
                  aria-label={translate("selectDate")}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Courier Selection */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{translate("couriersList")}</h3>
              </div>
            </div>
            <div className="p-6">
              {summaryList.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium text-gray-700">{translate("noDataForDate")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {summaryList.map((courier) => (
                    <button
                      key={courier.courierId}
                      onClick={() => handleCourierSelect(courier)}
                      className="bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl p-6 text-right transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center transition-colors">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">
                            {courier.courierName}
                          </h4>
                          <p className="text-sm text-gray-600 group-hover:text-blue-700 transition-colors">
                            اضغط لعرض التفاصيل
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderMetric = (metric: Metric, courierId: string) => {
    const { count, amount } = calcCountAmount(metric, courierId)
    if (count === 0) return null // Don't show metrics with 0 count

    return (
      <div
        key={metric.label}
        onClick={() => openOrders((o) => metric.filter(o, courierId), translate(metric.label))}
        className={`cursor-pointer bg-white hover:shadow-lg p-6 rounded-xl border-2 transition-all duration-200 group ${metric.bgColor}`}
        role="button"
        tabIndex={0}
        onKeyPress={(e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter") openOrders((o) => metric.filter(o, courierId), translate(metric.label))
        }}
        aria-label={`${translate(metric.label)}: ${count} ${translate("ordersCount")}${
          metric.isMoney ? `، ${translate("amount")}: ${amount.toFixed(2)}` : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${metric.bgColor}`}>
                <metric.icon className={`w-5 h-5 ${metric.color}`} />
              </div>
              <h4 className={`text-sm font-semibold ${metric.color}`}>{translate(metric.label)}</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">{count}</span>
                <span className="text-sm text-gray-600">{translate("ordersCount")}</span>
              </div>
              {metric.isMoney && (
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-bold ${metric.color}`}>{amount.toFixed(2)}</span>
                  <span className="text-sm text-gray-600">{translate("EGP")}</span>
                </div>
              )}
            </div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    )
  }

  // Get the current courier to display (either selected courier for admin or current user for courier)
  const currentCourier =
    user.role === "courier" ? { courierId: user.id, courierName: user.name || translate("courier") } : selectedCourier

  if (!currentCourier) return null

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user.role !== "courier" && (
                <button
                  onClick={handleBackToCouriers}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">{translate("backToCouriers")}</span>
                </button>
              )}
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{translate("todaySummary")}</h1>
                <p className="text-gray-600">تقرير شامل لأداء المندوبين</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                dir="ltr"
                aria-label={translate("selectDate")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Courier Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{currentCourier.courierName}</h2>
              <p className="text-gray-600">تقرير الأداء اليومي</p>
            </div>
          </div>
        </div>

        {/* Order Status Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">{translate("orderStatusSection")}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {metrics
              .slice(0, 5)
              .map((metric) => renderMetric(metric, currentCourier.courierId))
              .filter(Boolean)}
          </div>
        </div>

        {/* Electronic Payment Methods Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">{translate("electronicPaymentsSection")}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {metrics
              .slice(5, 7)
              .map((metric) => renderMetric(metric, currentCourier.courierId))
              .filter(Boolean)}
          </div>
        </div>

        {/* Cash-based Payment Methods Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Banknote className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">{translate("cashPaymentsSection")}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics
              .slice(7, 10)
              .map((metric) => renderMetric(metric, currentCourier.courierId))
              .filter(Boolean)}
          </div>
        </div>

        {/* Collection Summary Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">{translate("collectionSummarySection")}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {metrics
              .slice(10)
              .map((metric) => renderMetric(metric, currentCourier.courierId))
              .filter(Boolean)}
          </div>
        </div>

        {/* Orders Modal */}
        {selectedOrders.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="bg-blue-600 text-white p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Filter className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{modalTitle}</h3>
                    <p className="text-blue-100">
                      {selectedOrders.length} {translate("ordersCount")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrders([])}
                  className="text-blue-100 hover:text-white transition-colors p-2"
                  aria-label={translate("close")}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {selectedOrders.map((order) => {
                    const courierOrderAmount = getCourierOrderAmount(order)
                    const deliveryFee = Number(order.delivery_fee || 0)
                    const totalCourierAmount = getTotalCourierAmount(order)

                    return (
                      <div key={order.id} className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Order Information */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Package className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">طلب #{order.order_id}</h4>
                                <p className="text-sm text-gray-600">{order.customer_name}</p>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                                  <User className="w-3 h-3 text-green-600" />
                                </div>
                                <span className="text-sm text-gray-600">العميل:</span>
                                <span className="font-medium">{order.customer_name}</span>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                                  <Smartphone className="w-3 h-3 text-blue-600" />
                                </div>
                                <span className="text-sm text-gray-600">الهاتف:</span>
                                <a
                                  href={`tel:${order.mobile_number}`}
                                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                >
                                  {order.mobile_number}
                                </a>
                              </div>

                              <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center mt-0.5">
                                  <Package className="w-3 h-3 text-red-600" />
                                </div>
                                <span className="text-sm text-gray-600">العنوان:</span>
                                <span className="text-sm text-gray-800 flex-1">{order.address}</span>
                              </div>

                              <div className="flex items-center gap-3">
                                <div
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    order.status === "delivered"
                                      ? "bg-green-100 text-green-800"
                                      : order.status === "canceled"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {translate(order.status)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Financial Information */}
                          <div className="space-y-4">
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                المعلومات المالية
                              </h5>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">{translate("orderTotalLabel")}:</span>
                                  <span className="font-medium">
                                    {Number(order.total_order_fees).toFixed(2)} {translate("EGP")}
                                  </span>
                                </div>

                                {courierOrderAmount > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">
                                      {Number(order.partial_paid_amount || 0) > 0
                                        ? translate("partialAmountLabel")
                                        : translate("orderAmountCollectedLabel")}
                                      :
                                    </span>
                                    <span className="font-semibold text-green-600">
                                      {courierOrderAmount.toFixed(2)} {translate("EGP")}
                                    </span>
                                  </div>
                                )}

                                {deliveryFee > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">{translate("deliveryFee")}:</span>
                                    <span className="font-semibold text-blue-600">
                                      {deliveryFee.toFixed(2)} {translate("EGP")}
                                    </span>
                                  </div>
                                )}

                                {totalCourierAmount > 0 && (
                                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                                    <span className="text-sm font-semibold text-gray-700">
                                      {translate("totalCourierHandledLabel")}:
                                    </span>
                                    <span className="font-bold text-purple-600">
                                      {totalCourierAmount.toFixed(2)} {translate("EGP")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Payment Information */}
                            <div className="space-y-2">
                              {order.payment_sub_type && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">{translate("paymentSubTypeLabel")}:</span>
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                    {translate(order.payment_sub_type)}
                                  </span>
                                </div>
                              )}

                              {order.collected_by && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">{translate("collectedBy")}:</span>
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                    {translate(order.collected_by)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Comment */}
                        {order.internal_comment && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center mt-0.5">
                                <Package className="w-3 h-3 text-gray-600" />
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-700">{translate("comment")}:</span>
                                <p className="text-sm text-gray-600 mt-1">{order.internal_comment}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Proof Images */}
                        {order.order_proofs && order.order_proofs.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                                <Eye className="w-3 h-3 text-blue-600" />
                              </div>
                              <span className="text-sm font-medium text-gray-700">
                                {translate("proofImagesLabel")} ({order.order_proofs.length})
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                              {order.order_proofs.map((proof) => (
                                <img
                                  key={proof.id}
                                  src={proof.image_data || "/placeholder.svg"}
                                  alt="إثبات"
                                  className="h-20 w-full rounded-lg border border-gray-200 object-cover cursor-pointer hover:opacity-75 transition-opacity"
                                  onClick={() => window.open(proof.image_data, "_blank")}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Summary
