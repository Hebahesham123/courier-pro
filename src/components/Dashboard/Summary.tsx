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
  PieChart,
  Activity,
  Target,
  Zap,
  HandCoins,
  Monitor,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  LineChart,
  Line,
  Legend,
  Pie,
} from "recharts"
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

interface DateRange {
  startDate: string
  endDate: string
}

const normalizePaymentMethod = (method = ""): "cash" | "paymob" | "valu" | "other" => {
  const m = method.toLowerCase().trim()
  if (m.includes("valu") || m.includes("paymob.valu")) return "valu"
  if (m === "paymob" || m === "visa" || m === "card" || m.includes("paymob")) return "paymob"
  if (m === "cash") return "cash"
  return "other"
}

// Helper function to get the display payment method
const getDisplayPaymentMethod = (order: Order): string => {
  // Priority: payment_sub_type > collected_by > original payment_method
  if (order.payment_sub_type) {
    return order.payment_sub_type
  }
  if (order.collected_by) {
    return order.collected_by
  }
  return order.payment_method || ""
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
      // Date Range
      today: "اليوم",
      yesterday: "أمس",
      last7Days: "آخر 7 أيام",
      last30Days: "آخر 30 يوم",
      customRange: "فترة مخصصة",
      from: "من",
      to: "إلى",
      apply: "تطبيق",
      // Analytics
      totalAnalytics: "إجمالي التحليلات",
      overallPerformance: "الأداء العام",
      orderStatusBreakdown: "توزيع حالة الطلبات",
      paymentMethodsAnalysis: "تحليل طرق الدفع",
      courierPerformance: "أداء المندوبين",
      dailyTrends: "الاتجاهات اليومية",
      // Order Status Metrics
      deliveredOrders: "الطلبات المسلمة",
      partialOrders: "الطلبات الجزئية",
      handToHandOrders: "الطلبات يد بيد",
      returnOrders: "الطلبات المرتجعة",
      canceledOrders: "الطلبات الملغاة",
      assignedOrders: "الطلبات المكلفة",
      receivingPartOrders: "طلبات استلام قطعه",
      totalOrders: "إجمالي الطلبات",
      // Electronic Payment Methods
      paymobOrders: "طلبات paymob",
      valuOrders: "طلبات فاليو",
      // Cash-based Payment Sub-types
      cashOnHandOrders: "طلبات نقداً",
      instapayOrders: "طلبات إنستاباي",
      walletOrders: "طلبات المحفظة",
      visaMachineOrders: "طلبات ماكينة فيزا",
      // Collection Metrics
      totalCashOnHand: "إجمالي النقد في اليد",
      totalPaymobCollected: "إجمالي paymob محصل",
      totalValuCollected: "إجمالي فاليو محصل",
      deliveryFeesCollected: "رسوم التوصيل المحصلة",
      totalCollected: "إجمالي المحصل",
      totalRevenue: "إجمالي الإيرادات",
      averageOrderValue: "متوسط قيمة الطلب",
      successRate: "معدل النجاح",
      // COD Total
      totalCOD: "إجمالي الدفع عند التسليم",
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
      receiving_part: "استلام قطعه",
      cash: "نقداً",
      paymob: "paymob",
      valu: "فاليو",
      on_hand: "نقداً",
      instapay: "إنستاباي",
      wallet: "المحفظة",
      visa_machine: "ماكينة فيزا",
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
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  })
  const [selectedCourier, setSelectedCourier] = useState<CourierSummary | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string>("today")

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
  }, [user, dateRange, selectedCourier])

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
          .gte("updated_at", `${dateRange.startDate}T00:00:00`)
          .lte("updated_at", `${dateRange.endDate}T23:59:59`)
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
            .gte("updated_at", `${dateRange.startDate}T00:00:00`)
            .lte("updated_at", `${dateRange.endDate}T23:59:59`)
          orders = (data ?? []) as Order[]
        } else if (showAnalytics) {
          // If showing analytics, fetch ALL orders from ALL couriers
          const { data } = await supabase
            .from("orders")
            .select(`
              *,
              order_proofs (id, image_data)
            `)
            .gte("updated_at", `${dateRange.startDate}T00:00:00`)
            .lte("updated_at", `${dateRange.endDate}T23:59:59`)
          orders = (data ?? []) as Order[]
        } else {
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
    if (Number(order.partial_paid_amount || 0) > 0) {
      return Number(order.partial_paid_amount || 0)
    }
    if (["delivered", "partial", "hand_to_hand"].includes(order.status)) {
      return Number(order.total_order_fees || 0)
    }
    // For return orders, don't count the full order amount as collected
    if (order.status === "return") {
      return 0
    }
    return 0
  }

  // Helper function to get total amount courier handled (order + delivery fee)
  const getTotalCourierAmount = (order: Order): number => {
    let orderAmount = 0
    const deliveryAmount = Number(order.delivery_fee || 0)

    if (order.status === "canceled") {
      orderAmount = 0
    } else if (order.status === "return") {
      // For return orders, only count delivery fees if any, not the order amount
      orderAmount = 0
    } else {
      orderAmount = getCourierOrderAmount(order)
    }

    return orderAmount + deliveryAmount
  }

  // Helper function to check if order should be included in calculations
  const shouldIncludeOrder = (order: Order): boolean => {
    return getTotalCourierAmount(order) > 0
  }

  type Metric = {
    label: string
    icon: React.ComponentType<any>
    isMoney: boolean
    color: string
    bgColor: string
    filter: (order: Order) => boolean
    calculateAmount?: (orders: Order[]) => number
  }

  const metrics: Metric[] = [
    // ORDER STATUS METRICS (0-7)
    {
      label: "totalOrders",
      icon: Package,
      isMoney: true,
      color: "text-gray-700",
      bgColor: "bg-gray-50 border-gray-200",
      filter: (o) => !!o.assigned_courier_id,
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "deliveredOrders",
      icon: CheckCircle,
      isMoney: true,
      color: "text-green-700",
      bgColor: "bg-green-50 border-green-200",
      filter: (o) => o.status === "delivered",
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "partialOrders",
      icon: Clock,
      isMoney: true,
      color: "text-yellow-700",
      bgColor: "bg-yellow-50 border-yellow-200",
      filter: (o) => o.status === "partial",
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "handToHandOrders",
      icon: HandMetal,
      isMoney: true,
      color: "text-purple-700",
      bgColor: "bg-purple-50 border-purple-200",
      filter: (o) => o.status === "hand_to_hand",
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "returnOrders",
      icon: Truck,
      isMoney: true,
      color: "text-orange-700",
      bgColor: "bg-orange-50 border-orange-200",
      filter: (o) => o.status === "return",
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "canceledOrders",
      icon: XCircle,
      isMoney: true,
      color: "text-red-700",
      bgColor: "bg-red-50 border-red-200",
      filter: (o) => o.status === "canceled",
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "assignedOrders",
      icon: User,
      isMoney: true,
      color: "text-blue-700",
      bgColor: "bg-blue-50 border-blue-200",
      filter: (o) => o.status === "assigned",
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "receivingPartOrders",
      icon: HandMetal,
      isMoney: true,
      color: "text-indigo-700",
      bgColor: "bg-indigo-50 border-indigo-200",
      filter: (o) => o.status === "receiving_part",
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    // ELECTRONIC PAYMENT METHODS (8-9)
    {
      label: "paymobOrders",
      icon: CreditCard,
      isMoney: true,
      color: "text-blue-700",
      bgColor: "bg-blue-50 border-blue-200",
      filter: (o) =>
        (normalizePaymentMethod(getDisplayPaymentMethod(o)) === "paymob" || 
         (normalizePaymentMethod(o.payment_method) === "paymob" && !o.collected_by)) &&
        shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "valuOrders",
      icon: Wallet,
      isMoney: true,
      color: "text-indigo-700",
      bgColor: "bg-indigo-50 border-indigo-200",
      filter: (o) =>
        (normalizePaymentMethod(getDisplayPaymentMethod(o)) === "valu" || 
         (normalizePaymentMethod(o.payment_method) === "valu" && !o.collected_by)) &&
        shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    // CASH-BASED PAYMENT SUB-TYPES (10-13)
    {
      label: "cashOnHandOrders",
      icon: Banknote,
      isMoney: true,
      color: "text-emerald-700",
      bgColor: "bg-emerald-50 border-emerald-200",
      filter: (o) => o.payment_sub_type === "on_hand" && shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "instapayOrders",
      icon: Smartphone,
      isMoney: true,
      color: "text-cyan-700",
      bgColor: "bg-cyan-50 border-cyan-200",
      filter: (o) => o.payment_sub_type === "instapay" && shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "walletOrders",
      icon: Wallet,
      isMoney: true,
      color: "text-teal-700",
      bgColor: "bg-teal-50 border-teal-200",
      filter: (o) => o.payment_sub_type === "wallet" && shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "visaMachineOrders",
      icon: Monitor,
      isMoney: true,
      color: "text-slate-700",
      bgColor: "bg-slate-50 border-slate-200",
      filter: (o) => o.payment_sub_type === "visa_machine" && shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    // COD TOTAL METRIC (14)
    {
      label: "totalCOD",
      icon: HandCoins,
      isMoney: true,
      color: "text-amber-700",
      bgColor: "bg-amber-50 border-amber-200",
      filter: (o) => 
        ["on_hand", "instapay", "wallet", "visa_machine"].includes(o.payment_sub_type || "") && 
        shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    // COLLECTION SUMMARY METRICS (15-19)
    {
      label: "totalCashOnHand",
      icon: DollarSign,
      isMoney: true,
      color: "text-green-700",
      bgColor: "bg-green-50 border-green-200",
      filter: (o) => o.payment_sub_type === "on_hand" && shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "totalPaymobCollected",
      icon: CreditCard,
      isMoney: true,
      color: "text-blue-700",
      bgColor: "bg-blue-50 border-blue-200",
      filter: (o) =>
        (normalizePaymentMethod(getDisplayPaymentMethod(o)) === "paymob" || 
         (normalizePaymentMethod(o.payment_method) === "paymob" && !o.collected_by)) &&
        shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "totalValuCollected",
      icon: Wallet,
      isMoney: true,
      color: "text-indigo-700",
      bgColor: "bg-indigo-50 border-indigo-200",
      filter: (o) =>
        (normalizePaymentMethod(getDisplayPaymentMethod(o)) === "valu" || 
         (normalizePaymentMethod(o.payment_method) === "valu" && !o.collected_by)) &&
        shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "deliveryFeesCollected",
      icon: Package,
      isMoney: true,
      color: "text-purple-700",
      bgColor: "bg-purple-50 border-purple-200",
      filter: (o) => Number(o.delivery_fee || 0) > 0,
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + Number(o.delivery_fee || 0), 0),
    },
    {
      label: "totalCollected",
      icon: TrendingUp,
      isMoney: true,
      color: "text-gray-700",
      bgColor: "bg-gray-50 border-gray-200",
      filter: (o) => shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
  ]

  const calcCountAmount = (metric: Metric) => {
    const filtered = allOrders.filter(metric.filter)
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
    setShowAnalytics(false)
  }

  const handleBackToCouriers = () => {
    setSelectedCourier(null)
    setShowAnalytics(false)
    setAllOrders([])
  }

  const handleShowAnalytics = () => {
    setSelectedCourier(null)
    setShowAnalytics(true)
  }

  // Fixed date range function
  const setQuickDateRange = (filterType: string) => {
    const today = new Date()
    const endDate = new Date(today)
    let startDate = new Date(today)
    
    switch (filterType) {
      case "today":
        // Today only
        startDate = new Date(today)
        break
      case "yesterday":
        // Yesterday only
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 1)
        endDate.setDate(today.getDate() - 1)
        break
      case "last7Days":
        // Last 7 days including today
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 6)
        break
      case "last30Days":
        // Last 30 days including today
        startDate = new Date(today)
        startDate.setDate(today.getDate() - 29)
        break
      default:
        break
    }
    
    setActiveFilter(filterType)
    setDateRange({
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    })
  }

  // Calculate KPIs
  const totalRevenue = allOrders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0)
  const totalOrdersCount = allOrders.filter(o => !!o.assigned_courier_id).length
  const deliveredOrdersCount = allOrders.filter(o => o.status === "delivered").length
  const successRate = totalOrdersCount > 0 ? (deliveredOrdersCount / totalOrdersCount) * 100 : 0
  const averageOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0
  const totalDeliveryFees = allOrders.reduce((acc, o) => acc + Number(o.delivery_fee || 0), 0)

  // Prepare chart data
  const orderStatusData = [
    { name: translate("delivered"), value: allOrders.filter(o => o.status === "delivered").length, color: "#10b981" },
    { name: translate("partial"), value: allOrders.filter(o => o.status === "partial").length, color: "#f59e0b" },
    { name: translate("hand_to_hand"), value: allOrders.filter(o => o.status === "hand_to_hand").length, color: "#8b5cf6" },
    { name: translate("return"), value: allOrders.filter(o => o.status === "return").length, color: "#f97316" },
    { name: translate("canceled"), value: allOrders.filter(o => o.status === "canceled").length, color: "#ef4444" },
    { name: translate("assigned"), value: allOrders.filter(o => o.status === "assigned").length, color: "#3b82f6" },
    { name: translate("receiving_part"), value: allOrders.filter(o => o.status === "receiving_part").length, color: "#6366f1" },
  ].filter(item => item.value > 0)

  const paymentMethodData = [
    { name: translate("cash"), value: allOrders.filter(o => normalizePaymentMethod(getDisplayPaymentMethod(o)) === "cash").length, color: "#10b981" },
    { name: translate("paymob"), value: allOrders.filter(o => normalizePaymentMethod(getDisplayPaymentMethod(o)) === "paymob").length, color: "#3b82f6" },
    { name: translate("valu"), value: allOrders.filter(o => normalizePaymentMethod(getDisplayPaymentMethod(o)) === "valu").length, color: "#8b5cf6" },
  ].filter(item => item.value > 0)

  const statusAmountData = [
    { name: translate("delivered"), amount: allOrders.filter(o => o.status === "delivered").reduce((acc, o) => acc + getTotalCourierAmount(o), 0) },
    { name: translate("partial"), amount: allOrders.filter(o => o.status === "partial").reduce((acc, o) => acc + getTotalCourierAmount(o), 0) },
    { name: translate("hand_to_hand"), amount: allOrders.filter(o => o.status === "hand_to_hand").reduce((acc, o) => acc + getTotalCourierAmount(o), 0) },
    { name: translate("return"), amount: allOrders.filter(o => o.status === "return").reduce((acc, o) => acc + getTotalCourierAmount(o), 0) },
    { name: translate("canceled"), amount: allOrders.filter(o => o.status === "canceled").reduce((acc, o) => acc + getTotalCourierAmount(o), 0) },
    { name: translate("receiving_part"), amount: allOrders.filter(o => o.status === "receiving_part").reduce((acc, o) => acc + getTotalCourierAmount(o), 0) },
  ].filter(item => item.amount > 0)

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

  // For admin users, show analytics or courier selection
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
                  <h1 className="text-2xl font-bold text-gray-900">{translate("totalAnalytics")}</h1>
                  <p className="text-gray-600">تحليل شامل لجميع العمليات</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* Quick Date Filters */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuickDateRange("today")}
                    className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                      activeFilter === "today" 
                        ? "bg-blue-600 text-white" 
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {translate("today")}
                  </button>
                  <button
                    onClick={() => setQuickDateRange("yesterday")}
                    className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                      activeFilter === "yesterday" 
                        ? "bg-blue-600 text-white" 
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {translate("yesterday")}
                  </button>
                  <button
                    onClick={() => setQuickDateRange("last7Days")}
                    className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                      activeFilter === "last7Days" 
                        ? "bg-blue-600 text-white" 
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {translate("last7Days")}
                  </button>
                  <button
                    onClick={() => setQuickDateRange("last30Days")}
                    className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                      activeFilter === "last30Days" 
                        ? "bg-blue-600 text-white" 
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {translate("last30Days")}
                  </button>
                </div>
                {/* Date Range Picker */}
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => {
                      setActiveFilter("custom")
                      setDateRange(prev => ({ ...prev, startDate: e.target.value }))
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    dir="ltr"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => {
                      setActiveFilter("custom")
                      setDateRange(prev => ({ ...prev, endDate: e.target.value }))
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleShowAnalytics}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showAnalytics
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>{translate("totalAnalytics")}</span>
            </button>
            <button
              onClick={() => setShowAnalytics(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                !showAnalytics
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{translate("couriersList")}</span>
            </button>
          </div>
        </div>

        {showAnalytics ? (
          /* Analytics Dashboard */
          <div className="max-w-7xl mx-auto px-6 pb-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{translate("totalOrders")}</p>
                    <p className="text-2xl font-bold text-gray-900">{totalOrdersCount}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{translate("totalRevenue")}</p>
                    <p className="text-2xl font-bold text-gray-900">{totalRevenue.toFixed(2)} {translate("EGP")}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{translate("successRate")}</p>
                    <p className="text-2xl font-bold text-gray-900">{successRate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{translate("averageOrderValue")}</p>
                    <p className="text-2xl font-bold text-gray-900">{averageOrderValue.toFixed(2)} {translate("EGP")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Order Status Distribution */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <PieChart className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">{translate("orderStatusBreakdown")}</h3>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={orderStatusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {orderStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Payment Methods Distribution */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">{translate("paymentMethodsAnalysis")}</h3>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={paymentMethodData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {paymentMethodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Revenue by Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">الإيرادات حسب حالة الطلب</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusAmountData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} ${translate("EGP")}`, translate("amount")]} />
                    <Bar dataKey="amount" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Metrics Grid */}
            <div className="space-y-8">
              {/* Order Status Section */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">{translate("orderStatusSection")}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {metrics.slice(0, 8).map((metric) => {
                    const { count, amount } = calcCountAmount(metric)
                    if (count === 0) return null
                    return (
                      <div
                        key={metric.label}
                        onClick={() => openOrders(metric.filter, translate(metric.label))}
                        className={`cursor-pointer bg-white hover:shadow-lg p-6 rounded-xl border-2 transition-all duration-200 group ${metric.bgColor}`}
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
                  })}
                </div>
              </div>

              {/* Electronic Payment Methods Section */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">{translate("electronicPaymentsSection")}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {metrics.slice(8, 10).map((metric) => {
                    const { count, amount } = calcCountAmount(metric)
                    if (count === 0) return null
                    return (
                      <div
                        key={metric.label}
                        onClick={() => openOrders(metric.filter, translate(metric.label))}
                        className={`cursor-pointer bg-white hover:shadow-lg p-6 rounded-xl border-2 transition-all duration-200 group ${metric.bgColor}`}
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
                  })}
                </div>
              </div>

              {/* Cash-based Payment Methods Section */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Banknote className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">{translate("cashPaymentsSection")}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {/* Individual COD components */}
                  {metrics.slice(10, 14).map((metric) => {
                    const { count, amount } = calcCountAmount(metric)
                    if (count === 0) return null
                    return (
                      <div
                        key={metric.label}
                        onClick={() => openOrders(metric.filter, translate(metric.label))}
                        className={`cursor-pointer bg-white hover:shadow-lg p-6 rounded-xl border-2 transition-all duration-200 group ${metric.bgColor}`}
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
                  })}
                  {/* COD Total */}
                  {(() => {
                    const codMetric = metrics[14]; // totalCOD metric
                    const { count, amount } = calcCountAmount(codMetric)
                    if (count === 0) return null
                    return (
                      <div
                        key={codMetric.label}
                        onClick={() => openOrders(codMetric.filter, translate(codMetric.label))}
                        className={`cursor-pointer bg-white hover:shadow-lg p-6 rounded-xl border-2 transition-all duration-200 group ${codMetric.bgColor}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${codMetric.bgColor}`}>
                                <codMetric.icon className={`w-5 h-5 ${codMetric.color}`} />
                              </div>
                              <h4 className={`text-sm font-semibold ${codMetric.color}`}>{translate(codMetric.label)}</h4>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-gray-900">{count}</span>
                                <span className="text-sm text-gray-600">{translate("ordersCount")}</span>
                              </div>
                              {codMetric.isMoney && (
                                <div className="flex items-center gap-2">
                                  <span className={`text-xl font-bold ${codMetric.color}`}>{amount.toFixed(2)}</span>
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
                  })()}
                </div>
              </div>

              {/* Collection Summary Section */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">{translate("collectionSummarySection")}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {metrics.slice(15).map((metric) => {
                    const { count, amount } = calcCountAmount(metric)
                    if (count === 0) return null
                    return (
                      <div
                        key={metric.label}
                        onClick={() => openOrders(metric.filter, translate(metric.label))}
                        className={`cursor-pointer bg-white hover:shadow-lg p-6 rounded-xl border-2 transition-all duration-200 group ${metric.bgColor}`}
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
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Courier Selection */
          <div className="max-w-7xl mx-auto px-6 pb-8">
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
        )}

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
                    const displayPaymentMethod = getDisplayPaymentMethod(order)
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
                              {order.collected_by && !order.payment_sub_type && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">{translate("collectedBy")}:</span>
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                    {translate(order.collected_by)}
                                  </span>
                                </div>
                              )}
                              {!order.payment_sub_type && !order.collected_by && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">{translate("paymentMethod")}:</span>
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    {translate(normalizePaymentMethod(order.payment_method))}
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
    )
  }

  const renderMetric = (metric: Metric, courierId: string) => {
    const { count, amount } = calcCountAmount(metric)
    if (count === 0) return null

    return (
      <div
        key={metric.label}
        onClick={() => openOrders((o) => metric.filter(o) && o.assigned_courier_id === courierId, translate(metric.label))}
        className={`cursor-pointer bg-white hover:shadow-lg p-6 rounded-xl border-2 transition-all duration-200 group ${metric.bgColor}`}
        role="button"
        tabIndex={0}
        onKeyPress={(e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter") openOrders((o) => metric.filter(o) && o.assigned_courier_id === courierId, translate(metric.label))
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
            <div className="flex items-center gap-4">
              {/* Quick Date Filters */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuickDateRange("today")}
                  className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                    activeFilter === "today" 
                      ? "bg-blue-600 text-white" 
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {translate("today")}
                </button>
                <button
                  onClick={() => setQuickDateRange("yesterday")}
                  className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                    activeFilter === "yesterday" 
                      ? "bg-blue-600 text-white" 
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {translate("yesterday")}
                </button>
                <button
                  onClick={() => setQuickDateRange("last7Days")}
                  className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                    activeFilter === "last7Days" 
                      ? "bg-blue-600 text-white" 
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {translate("last7Days")}
                </button>
                <button
                  onClick={() => setQuickDateRange("last30Days")}
                  className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                    activeFilter === "last30Days" 
                      ? "bg-blue-600 text-white" 
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {translate("last30Days")}
                </button>
              </div>
              {/* Date Range Picker */}
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => {
                    setActiveFilter("custom")
                    setDateRange(prev => ({ ...prev, startDate: e.target.value }))
                  }}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="ltr"
                  aria-label={translate("selectDate")}
                />
                <span className="text-gray-500">-</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => {
                    setActiveFilter("custom")
                    setDateRange(prev => ({ ...prev, endDate: e.target.value }))
                  }}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  dir="ltr"
                  aria-label={translate("selectDate")}
                />
              </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {metrics
              .slice(0, 8)
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
              .slice(8, 10)
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Individual COD components */}
            {metrics
              .slice(10, 14)
              .map((metric) => renderMetric(metric, currentCourier.courierId))
              .filter(Boolean)}
            {/* COD Total */}
            {(() => {
              const codMetric = metrics[14]; // totalCOD metric
              return renderMetric(codMetric, currentCourier.courierId)
            })()}
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
              .slice(15)
              .map((metric) => renderMetric(metric, currentCourier.courierId))
              .filter(Boolean)}
          </div>
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
                  const displayPaymentMethod = getDisplayPaymentMethod(order)
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
                            {order.collected_by && !order.payment_sub_type && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">{translate("collectedBy")}:</span>
                                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                  {translate(order.collected_by)}
                                </span>
                              </div>
                            )}
                            {!order.payment_sub_type && !order.collected_by && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">{translate("paymentMethod")}:</span>
                                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  {translate(normalizePaymentMethod(order.payment_method))}
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
  )
}

export default Summary