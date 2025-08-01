"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
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
  Eye,
  X,
  Filter,
  ArrowLeft,
  Users,
  HandCoins,
  Monitor,
  Calculator,
  Receipt,
  RefreshCw,
  Edit3,
  Save,
  Trash2,
  Plus,
  AlertCircle,
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
  hold_fee?: number | null
  hold_fee_comment?: string | null
  hold_fee_created_by?: string | null
  hold_fee_created_at?: string | null
  admin_delivery_fee?: number | null
  extra_fee?: number | null
  payment_status?: string
  onther_payments?: string | { method: string; amount: string }[]
  // Allow extra properties for temporary fields (like _onther_amount)
  [key: string]: any
}

interface CourierSummary {
  courierId: string
  courierName: string
}

interface DateRange {
  startDate: string
  endDate: string
}

// Updated normalize function to handle all sub-methods for onther payments
const normalizePaymentMethod = (method = ""): "cash" | "paymob" | "valu" | "visa_machine" | "instapay" | "wallet" | "on_hand" | "other" => {
  const m = method.toLowerCase().trim()
  if (m.includes("valu") || m.includes("paymob.valu")) return "valu"
  if (m === "visa_machine") return "visa_machine"
  if (m === "instapay") return "instapay"
  if (m === "wallet") return "wallet"
  if (m === "on_hand" || m === "on hand") return "on_hand"
  if (
    m === "paymob" ||
    m.includes("visa") ||
    m.includes("mastercard") ||
    m.includes("card") ||
    m.includes("credit") ||
    m.includes("debit")
  )
    return "paymob"
  if (m === "cash") return "cash"
  // Debug: log any sub-methods that are grouped as 'other'
  if (m && m !== "other") {
    if (typeof window !== 'undefined' && window.console) {
      window.console.warn("[normalizePaymentMethod] Unrecognized payment method, grouped as 'other':", method)
    }
  }
  return "other"
}

// Helper function to get the display payment method (with translation)
const getDisplayPaymentMethod = (order: Order, t?: (key: string) => string): string => {
  // For split payment sub-row (from modal), use the payment_sub_type directly (already normalized)
  if (order._onther_amount !== undefined && order.payment_sub_type) {
    const label = t ? t(order.payment_sub_type) : order.payment_sub_type
    if (label === order.payment_sub_type) {
      // Not translated, log for debug
      if (typeof window !== 'undefined' && window.console) {
        window.console.warn('[getDisplayPaymentMethod] No translation for payment_sub_type:', order.payment_sub_type)
      }
    }
    return label
  }
  // For other cases, use normalized payment method
  if (order.payment_sub_type && order.payment_sub_type !== 'onther') {
    const normalized = normalizePaymentMethod(order.payment_sub_type)
    const label = t ? t(normalized) : normalized
    if (label === normalized) {
      if (typeof window !== 'undefined' && window.console) {
        window.console.warn('[getDisplayPaymentMethod] No translation for normalized payment_sub_type:', normalized)
      }
    }
    return label
  }
  if (order.collected_by) {
    const label = t ? t(order.collected_by) : order.collected_by
    if (label === order.collected_by) {
      if (typeof window !== 'undefined' && window.console) {
        window.console.warn('[getDisplayPaymentMethod] No translation for collected_by:', order.collected_by)
      }
    }
    return label
  }
  const normalized = normalizePaymentMethod(order.payment_method || "")
  const label = t ? t(normalized) : normalized
  if (label === normalized) {
    if (typeof window !== 'undefined' && window.console) {
      window.console.warn('[getDisplayPaymentMethod] No translation for payment_method:', normalized)
    }
  }
  return label
}

const Summary: React.FC = () => {
  const { user } = useAuth()
  const { t } = useLanguage()

  const translate = useRef((key: string) => {
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
      totalAssignedOrders: "إجمالي الطلبات المكلفة",
      deliveredOrders: "الطلبات المسلمة",
      canceledOrders: "الطلبات الملغاة",
      partialOrders: "الطلبات الجزئية",
      handToHandOrders: "الطلبات يد بيد",
      returnOrders: "الطلبات المؤجله",
      assignedOrders: "الطلبات المكلفة",
      receivingPartOrders: "طلبات استلام قطعه",
      totalOrders: "إجمالي الطلبات",
      totalDeliveryOrders: "إجمالي طلبات التوصيل",
      totalDeliveryFees: "إجمالي رسوم التوصيل",
      totalPartialFees: "إجمالي المبالغ الجزئية",
      // Accounting
      accountingDifference: "الفرق المحاسبي",
      paymentBreakdown: "تفصيل طرق الدفع",
      totalHandToAccounting: "إجمالي ما يسلم للمحاسبة",
      orderValue: "قيمة الطلبات",
      deliveryFeesValue: "قيمة رسوم التوصيل",
      totalValue: "القيمة الإجمالية",
      // Electronic Payment Methods
      paymobOrders: "طلبات paymob",
      valuOrders: "طلبات فاليو",
      // Cash-based Payment Sub-types
      cashOnHandOrders: "طلبات نقداً",
      instapayOrders: "طلبات إنستاباي",
      walletOrders: "طلبات المحفظة",
      visaMachineOrders: "طلبات ماكينة فيزا",
      totalCODOrders: "إجمالي الدفع عند التسليم",
      // Collection Metrics
      totalCashOnHand: "إجمالي النقد في اليد",
      totalPaymobCollected: "إجمالي paymob محصل",
      totalValuCollected: "إجمالي فاليو محصل",
      deliveryFeesCollected: "رسوم التوصيل المحصلة",
      totalCollected: "إجمالي المحصل",
      totalRevenue: "إجمالي الإيرادات",
      averageOrderValue: "متوسط قيمة الطلب",
      successRate: "معدل النجاح",
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
      return: "مؤجل",
      receiving_part: "استلام قطعه",
      cash: "نقداً",
      paymob: "باي موب",
      valu: "فاليو",
      on_hand: "نقداً",
      instapay: "إنستاباي",
      wallet: "المحفظة",
      visa_machine: "ماكينة فيزا",
      orderTotalLabel: "إجمالي الطلب",
      partialAmountLabel: "المبلغ الجزئي",
      orderAmountCollectedLabel: "مبلغ الطلب المحصل",
      totalCourierHandledLabel: "إجمالي ما تعامل معه المندوب",
      paymentSubTypeLabel: "نوع الدفع",
      proofImagesLabel: "صور الإثبات",
      // Hold Fees
      holdFee: "رسوم الحجز",
      holdFeeAmount: "مبلغ الحجز",
      holdFeeComment: "تعليق الحجز",
      addHoldFee: "إضافة رسوم حجز",
      editHoldFee: "تعديل رسوم الحجز",
      removeHoldFee: "إزالة رسوم الحجز",
      save: "حفظ",
      cancel: "إلغاء",
      enterAmount: "أدخل المبلغ",
      enterComment: "أدخل التعليق",
      holdFeeAddedBy: "أضيفت بواسطة",
      holdFeeAddedAt: "تاريخ الإضافة",
    }
    return translations[key] || key
  }).current

  const [summaryList, setSummaryList] = useState<CourierSummary[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [allHoldFeesOrders, setAllHoldFeesOrders] = useState<Order[]>([]) // New state for all hold fees regardless of date
  const [loading, setLoading] = useState(true)
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([])
  const [modalTitle, setModalTitle] = useState("")

  // Hold Fee Management States
  const [editingHoldFee, setEditingHoldFee] = useState<string | null>(null)
  const [holdFeeAmount, setHoldFeeAmount] = useState("")
  const [holdFeeComment, setHoldFeeComment] = useState("")
  const [holdFeeLoading, setHoldFeeLoading] = useState(false)

  // Helper function to get today's date in YYYY-MM-DD format (local timezone)
  const getTodayDateString = useCallback(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = (today.getMonth() + 1).toString().padStart(2, "0") // Months are 0-indexed
    const day = today.getDate().toString().padStart(2, "0")
    return `${year}-${month}-${day}`
  }, [])

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: getTodayDateString(),
    endDate: getTodayDateString(),
  })
  const [selectedCourier, setSelectedCourier] = useState<CourierSummary | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string>("today")

  // Check if user is courier for mobile optimization
  const isCourier = user?.role === "courier"
  const isAdmin = user?.role === "admin"

  // Function to fetch all hold fees data regardless of date range
  const fetchAllHoldFeesData = useCallback(async () => {
    if (!user?.id) return
    try {
      let holdFeesOrders: Order[] = []
      if (user.role === "courier") {
        // For courier users, get all their orders with hold fees
        const { data } = await supabase
          .from("orders")
          .select("*")
          .eq("assigned_courier_id", user.id)
          .or("hold_fee.gt.0,and(hold_fee.is.null,hold_fee_created_at.not.is.null,hold_fee_created_by.not.is.null)")
        holdFeesOrders = (data ?? []) as Order[]
      } else {
        // For admin users
        if (selectedCourier) {
          // If a courier is selected, fetch only their hold fees orders
          const { data } = await supabase
            .from("orders")
            .select("*")
            .eq("assigned_courier_id", selectedCourier.courierId)
            .or("hold_fee.gt.0,and(hold_fee.is.null,hold_fee_created_at.not.is.null,hold_fee_created_by.not.is.null)")
          holdFeesOrders = (data ?? []) as Order[]
        } else if (showAnalytics) {
          // If showing analytics, fetch ALL hold fees orders from ALL couriers
          const { data } = await supabase
            .from("orders")
            .select("*")
            .or("hold_fee.gt.0,and(hold_fee.is.null,hold_fee_created_at.not.is.null,hold_fee_created_by.not.is.null)")
          holdFeesOrders = (data ?? []) as Order[]
        }
      }
      setAllHoldFeesOrders(holdFeesOrders)
    } catch (error) {
      console.error("Error fetching all hold fees data:", error)
      setAllHoldFeesOrders([])
    }
  }, [user, selectedCourier, showAnalytics])

  const fetchSummary = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      let orders: Order[] = []
      if (user.role === "courier") {
        // For courier users, show their own data
        const { data } = await supabase
          .from("orders")
          .select(
            `
          *,
          order_proofs (id, image_data)
        `,
          )
          .eq("assigned_courier_id", user.id)
          .gte("created_at", `${dateRange.startDate}T00:00:00`)
          .lte("created_at", `${dateRange.endDate}T23:59:59`)
        orders = (data ?? []) as Order[]
        const courierName = user.name ?? translate("courier")
        setSummaryList([{ courierId: user.id, courierName: courierName }])
        setAllOrders(orders)
      } else {
        // For admin users
        const { data: couriers } = await supabase.from("users").select("id, name").eq("role", "courier")
        setSummaryList((couriers ?? []).map((c) => ({ courierId: c.id, courierName: c.name ?? "مندوب" })))

        if (selectedCourier) {
          // If a courier is selected, fetch only their orders
          const { data } = await supabase
            .from("orders")
            .select(
              `
            *,
            order_proofs (id, image_data)
          `,
            )
            .eq("assigned_courier_id", selectedCourier.courierId)
            .gte("created_at", `${dateRange.startDate}T00:00:00`)
            .lte("created_at", `${dateRange.endDate}T23:59:59`)
          orders = (data ?? []) as Order[]
        } else if (showAnalytics) {
          // If showing analytics, fetch ALL orders from ALL couriers
          const { data } = await supabase
            .from("orders")
            .select(
              `
            *,
            order_proofs (id, image_data)
          `,
            )
            .gte("created_at", `${dateRange.startDate}T00:00:00`)
            .lte("created_at", `${dateRange.endDate}T23:59:59`)
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
  }, [user, dateRange, selectedCourier, showAnalytics, getTodayDateString])

  useEffect(() => {
    fetchSummary()
    fetchAllHoldFeesData() // Also fetch hold fees data
    const subscription = supabase
      .channel("orders_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchSummary()
        fetchAllHoldFeesData() // Also refetch hold fees data on changes
      })
      .subscribe()

    return () => {
      subscription.unsubscribe().catch(console.error)
    }
  }, [user, dateRange, selectedCourier, fetchSummary, fetchAllHoldFeesData])

  // Hold Fee Management Functions
  const handleEditHoldFee = (orderId: string, currentAmount?: number, currentComment?: string) => {
    setEditingHoldFee(orderId)
    setHoldFeeAmount(currentAmount ? currentAmount.toString() : "")
    setHoldFeeComment(currentComment || "")
  }

  const handleSaveHoldFee = async (orderId: string) => {
    if (!isAdmin) return
    setHoldFeeLoading(true)
    try {
      const amount = Number.parseFloat(holdFeeAmount) || 0
      const { error } = await supabase
        .from("orders")
        .update({
          hold_fee: amount > 0 ? amount : null,
          hold_fee_comment: amount > 0 ? holdFeeComment : null,
          hold_fee_created_by: amount > 0 ? user?.id : null,
          hold_fee_created_at: amount > 0 ? new Date().toISOString() : null,
        })
        .eq("id", orderId)

      if (error) throw error

      // Update local state
      setAllOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                hold_fee: amount > 0 ? amount : null,
                hold_fee_comment: amount > 0 ? holdFeeComment : null,
                hold_fee_created_by: amount > 0 ? user?.id : null,
                hold_fee_created_at: amount > 0 ? new Date().toISOString() : null,
              }
            : order,
        ),
      )
      setAllHoldFeesOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                hold_fee: amount > 0 ? amount : null,
                hold_fee_comment: amount > 0 ? holdFeeComment : null,
                hold_fee_created_by: amount > 0 ? user?.id : null,
                hold_fee_created_at: amount > 0 ? new Date().toISOString() : null,
              }
            : order,
        ),
      )
      setSelectedOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                hold_fee: amount > 0 ? amount : null,
                hold_fee_comment: amount > 0 ? holdFeeComment : null,
                hold_fee_created_by: amount > 0 ? user?.id : null,
                hold_fee_created_at: amount > 0 ? new Date().toISOString() : null,
              }
            : order,
        ),
      )
      setEditingHoldFee(null)
      setHoldFeeAmount("")
      setHoldFeeComment("")
    } catch (error) {
      console.error("Error saving hold fee:", error)
    } finally {
      setHoldFeeLoading(false)
    }
  }

  const handleRemoveHoldFee = async (orderId: string) => {
    if (!isAdmin) return
    setHoldFeeLoading(true)
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          hold_fee: null,
          hold_fee_comment: null,
          hold_fee_created_by: user?.id,
          hold_fee_created_at: new Date().toISOString(),
        })
        .eq("id", orderId)

      if (error) throw error

      // Update local state
      setAllOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                hold_fee: null,
                hold_fee_comment: null,
                hold_fee_created_by: user?.id,
                hold_fee_created_at: new Date().toISOString(),
              }
            : order,
        ),
      )
      setAllHoldFeesOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                hold_fee: null,
                hold_fee_comment: null,
                hold_fee_created_by: user?.id,
                hold_fee_created_at: new Date().toISOString(),
              }
            : order,
        ),
      )
      setSelectedOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                hold_fee: null,
                hold_fee_comment: null,
                hold_fee_created_by: user?.id,
                hold_fee_created_at: new Date().toISOString(),
              }
            : order,
        ),
      )
    } catch (error) {
      console.error("Error removing hold fee:", error)
    } finally {
      setHoldFeeLoading(false)
    }
  }

  const handleCancelHoldFeeEdit = () => {
    setEditingHoldFee(null)
    setHoldFeeAmount("")
    setHoldFeeComment("")
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
  // If payment_sub_type is 'onther', this function is not used for payment breakdowns, only for totals.
  // For payment breakdowns, use getOntherSubPaymentAmount.
  const getTotalCourierAmount = (order: Order): number => {
    let orderAmount = 0
    const deliveryAmount = Number(order.delivery_fee || 0)

    if (order.status === "canceled") {
      orderAmount = 0
    } else if (order.status === "return") {
      orderAmount = 0
    } else if (order.payment_sub_type === "onther" && order.onther_payments) {
      // Sum all onther_payments amounts for total only
      try {
        const arr = typeof order.onther_payments === 'string' ? JSON.parse(order.onther_payments) : order.onther_payments
        if (Array.isArray(arr)) {
          orderAmount = arr.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
        } else {
          orderAmount = 0
        }
      } catch {
        orderAmount = 0
      }
    } else {
      orderAmount = getCourierOrderAmount(order)
    }

    // Subtract hold_fee, admin_delivery_fee, and extra_fee
    const holdFee = Number(order.hold_fee || 0)
    const adminFee = Number(order.admin_delivery_fee || 0)
    const extraFee = Number(order.extra_fee || 0)

    return orderAmount + deliveryAmount - holdFee - adminFee - extraFee
  }

  // Helper to get the amount for a specific sub-payment method in onther_payments
  const getOntherSubPaymentAmount = (order: Order, methodKey: string): number => {
    if (order.payment_sub_type === 'onther' && order.onther_payments) {
      try {
        const arr = typeof order.onther_payments === 'string' ? JSON.parse(order.onther_payments) : order.onther_payments
        if (Array.isArray(arr)) {
          return arr.filter(item => item.method === methodKey).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
        }
      } catch {}
    }
    return 0
  }

  // Helper function to check if order should be included in calculations
  const shouldIncludeOrder = (order: Order): boolean => {
    // Only include orders that have a collected amount (either order value or delivery fee)
    // and are not 'return' or 'receiving_part' with zero fees, or 'hand_to_hand' with zero fees
    const totalHandled = getTotalCourierAmount(order)
    const isReturnOrReceivingPartNoFees =
      (order.status === "return" || order.status === "receiving_part") && totalHandled === 0
    const isHandToHandNoFees = order.status === "hand_to_hand" && totalHandled === 0

    return (
      totalHandled > 0 ||
      (order.status === "delivered" && totalHandled === 0) ||
      (order.status === "partial" && totalHandled === 0) ||
      (order.status === "assigned" && totalHandled === 0)
    )
  }

  // Enhanced: Only show the relevant sub-payment and amount for each payment method in the modal
  const openOrders = (orders: Order[], title: string, methodKey?: string) => {
    // If methodKey is provided, filter and map orders to only include the relevant sub-payment
    let displayOrders = orders
    if (methodKey) {
      displayOrders = orders.map((order) => {
        if (order.payment_sub_type === 'onther' && order.onther_payments) {
          let arr: { method: string; amount: string }[] = []
          try {
            arr = typeof order.onther_payments === 'string' ? JSON.parse(order.onther_payments) : order.onther_payments
          } catch { arr = [] }
          // Find the sub-payment for this methodKey
          const sub = arr.find(item => normalizePaymentMethod(item.method) === methodKey)
          if (sub) {
            return { ...order, _onther_amount: parseFloat(sub.amount) || 0, payment_sub_type: methodKey }
          }
        }
        return order
      }).filter(order => {
        // Only include if it's a relevant sub-payment or a normal order for this method
        if (order.payment_sub_type === 'onther' && order._onther_amount && order.payment_sub_type === methodKey) return true
        if (order.payment_sub_type !== 'onther') return true
        return false
      })
    }
    setModalTitle(title)
    setSelectedOrders(displayOrders)
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
      startDate: `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, "0")}-${startDate.getDate().toString().padStart(2, "0")}`,
      endDate: `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, "0")}-${endDate.getDate().toString().padStart(2, "0")}`,
    })
  }

  // Calculate comprehensive accounting metrics
  const calculateAccountingMetrics = () => {
    const filteredOrders = selectedCourier
      ? allOrders.filter((o) => o.assigned_courier_id === selectedCourier.courierId)
      : allOrders

    // Overall Totals
    const totalOrdersCount = filteredOrders.length
    const totalOrdersOriginalValue = filteredOrders.reduce((acc, o) => acc + Number(o.total_order_fees || 0), 0)

    // Fee sums
    const totalHoldFees = filteredOrders.reduce((acc, o) => acc + Number(o.hold_fee || 0), 0)
    const totalExtraFees = filteredOrders.reduce((acc, o) => acc + Number(o.extra_fee || 0), 0)
    const totalAdminDeliveryFees = filteredOrders.reduce((acc, o) => acc + Number(o.admin_delivery_fee || 0), 0)
    const totalAllFees = totalHoldFees + totalExtraFees + totalAdminDeliveryFees
    const adjustedTotal = totalOrdersOriginalValue - totalAllFees

    // Status-based Metrics
    const getStatusMetrics = (status: string) => {
      const orders = filteredOrders.filter((o) => o.status === status)
      const count = orders.length
      const originalValue = orders.reduce((acc, o) => acc + Number(o.total_order_fees || 0), 0)
      const courierCollected = orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0)
      return { count, originalValue, courierCollected, orders }
    }

    const assigned = getStatusMetrics("assigned")
    const delivered = getStatusMetrics("delivered")
    const canceled = getStatusMetrics("canceled")
    const partial = getStatusMetrics("partial")
    const returned = getStatusMetrics("return")
    const receivingPart = getStatusMetrics("receiving_part")
    const handToHand = getStatusMetrics("hand_to_hand")

    // Delivery Fees and Partial Amounts
    const totalDeliveryFeesFromAllOrders = filteredOrders.reduce((acc, o) => acc + Number(o.delivery_fee || 0), 0)
    const totalPartialAmounts = filteredOrders.reduce((acc, o) => acc + Number(o.partial_paid_amount || 0), 0)

    // Accounting Difference (This logic might need re-evaluation based on exact definition)
    // For now, keep it as is, but it's more of an admin-level metric.
    const accountingDifference =
      assigned.courierCollected -
      (delivered.courierCollected +
        canceled.courierCollected +
        partial.courierCollected +
        returned.courierCollected +
        receivingPart.courierCollected +
        handToHand.courierCollected)

    // Improved: Flatten all orders so each sub-payment in onther_payments is treated as a separate entry for summary
    const flattenOrdersForPaymentSummary = (orders: Order[]) => {
      const result: { order: Order; method: string; amount: number }[] = []
      for (const o of orders) {
        if (o.payment_sub_type === 'onther' && o.onther_payments) {
          let arr: { method: string; amount: string }[] = []
          try {
            arr = typeof o.onther_payments === 'string' ? JSON.parse(o.onther_payments) : o.onther_payments
          } catch { arr = [] }
          if (Array.isArray(arr)) {
            for (const item of arr) {
              const normalizedSubMethod = normalizePaymentMethod(item.method)
              const amt = parseFloat(item.amount) || 0
              if (amt > 0) {
                // Each sub-payment is a separate entry, with _onther_amount for modal display
                result.push({ order: { ...o, payment_sub_type: normalizedSubMethod, _onther_amount: amt }, method: normalizedSubMethod, amount: amt })
              }
            }
          }
        } else {
          // Use normalized payment method for non-onther orders
          const normalized = normalizePaymentMethod(o.payment_sub_type || o.payment_method)
          const amt = getTotalCourierAmount(o)
          if (amt > 0) {
            result.push({ order: o, method: normalized, amount: amt })
          }
        }
      }
      return result
    }

    // Use the flattened list for all payment method breakdowns
    const paymentSummaryList = flattenOrdersForPaymentSummary(filteredOrders)

    const getPaymentMethodMetrics = (methodKey: string) => {
      const filtered = paymentSummaryList.filter(item => item.method === methodKey)
      return {
        count: filtered.length,
        amount: filtered.reduce((sum, item) => sum + item.amount, 0),
        orders: filtered.map(item => item.order),
      }
    }

    // Updated paymob orders calculation - include all orders with paymob payment that have collected amounts

    // Now, get metrics for each payment method using the new flat list
    const visaMachineOrders = getPaymentMethodMetrics('visa_machine')
    const instapayOrders = getPaymentMethodMetrics('instapay')
    const walletOrders = getPaymentMethodMetrics('wallet')
    const cashOnHandOrders = getPaymentMethodMetrics('cash')
    const paymobOrders = getPaymentMethodMetrics('paymob')
    const valuOrders = getPaymentMethodMetrics('valu')

    const totalCODOrders = {
      count: visaMachineOrders.count + instapayOrders.count + walletOrders.count + cashOnHandOrders.count,
      amount: visaMachineOrders.amount + instapayOrders.amount + walletOrders.amount + cashOnHandOrders.amount,
      orders: [
        ...visaMachineOrders.orders,
        ...instapayOrders.orders,
        ...walletOrders.orders,
        ...cashOnHandOrders.orders,
      ],
    }

    // Total amount courier should hand to accounting (Cash on Hand only)
    const totalHandToAccounting = cashOnHandOrders.amount

    return {
      totalOrdersCount,
      totalOrdersOriginalValue,
      totalHoldFees,
      totalExtraFees,
      totalAdminDeliveryFees,
      adjustedTotal,
      assigned,
      delivered,
      canceled,
      partial,
      returned,
      receivingPart,
      handToHand,
      totalDeliveryFeesFromAllOrders,
      totalPartialAmounts,
      accountingDifference,
      paymobOrders,
      valuOrders,
      visaMachineOrders,
      instapayOrders,
      walletOrders,
      cashOnHandOrders,
      totalCODOrders,
      totalHandToAccounting,
      allOrders: filteredOrders, // Added allOrders to the returned metrics
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center space-y-4">
          <div
            className={`border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto ${
              isCourier ? "w-8 h-8" : "w-12 h-12"
            }`}
          ></div>
          <p className={`font-medium text-gray-700 ${isCourier ? "text-base" : "text-lg"}`}>{translate("loading")}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center space-y-4">
          <div
            className={`bg-red-100 rounded-full flex items-center justify-center mx-auto ${
              isCourier ? "w-12 h-12" : "w-16 h-16"
            }`}
          >
            <User className={`text-red-600 ${isCourier ? "w-6 h-6" : "w-8 h-8"}`} />
          </div>
          <p className={`font-medium text-gray-700 ${isCourier ? "text-base" : "text-lg"}`}>
            {translate("pleaseLogin")}
          </p>
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
                  <Calculator className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">لوحة المحاسبة التفصيلية</h1>
                  <p className="text-gray-600">تحليل شامل لجميع العمليات المالية</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* Quick Date Filters */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuickDateRange("today")}
                    className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                      activeFilter === "today" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {translate("today")}
                  </button>
                  <button
                    onClick={() => setQuickDateRange("yesterday")}
                    className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                      activeFilter === "yesterday" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {translate("yesterday")}
                  </button>
                  <button
                    onClick={() => setQuickDateRange("last7Days")}
                    className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                      activeFilter === "last7Days" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {translate("last7Days")}
                  </button>
                  <button
                    onClick={() => setQuickDateRange("last30Days")}
                    className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                      activeFilter === "last30Days" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
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
                      setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
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
                      setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
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
              <Calculator className="w-4 h-4" />
              <span>لوحة المحاسبة الشاملة</span>
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
          /* Detailed Accounting Dashboard */
          <div className="max-w-7xl mx-auto px-6 pb-8">
            {(() => {
              const metrics = calculateAccountingMetrics()
              return (
                <div className="space-y-8">
                  {/* 📦 Order Summary Section */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Package className="w-6 h-6 text-blue-600" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">📦 ملخص الطلبات</h2>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {/* Total Orders */}
                      <div
                        className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all group"
                        onClick={() => openOrders(metrics.allOrders, "إجمالي الطلبات")}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-700" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">إجمالي الطلبات</h3>
                            <p className="text-sm text-gray-700">{metrics.totalOrdersCount} طلب</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                            <span className="font-bold text-gray-700">القيمة الأصلية:</span>
                            <span className="font-bold text-gray-900">
                              {metrics.totalOrdersOriginalValue.toFixed(2)} ج.م
                            </span>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                          <Eye className="w-5 h-5 text-gray-600 mx-auto" />
                        </div>
                      </div>
                      {/* Assigned Orders */}
                      <div
                        className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all group"
                        onClick={() => openOrders(metrics.assigned.orders, "الطلبات المكلفة")}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-blue-200 rounded-xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-blue-700" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-blue-900">الطلبات المكلفة</h3>
                            <p className="text-sm text-blue-700">{metrics.assigned.count} طلب</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center pt-2 border-t border-blue-300">
                            <span className="text-sm font-bold text-blue-700">القيمة الأصلية:</span>
                            <span className="font-bold text-xl text-blue-900">
                              {metrics.assigned.originalValue.toFixed(2)} ج.م
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-blue-700">المحصل (تقديري):</span>
                            <span className="font-bold text-xl text-blue-900">
                              {metrics.assigned.courierCollected.toFixed(2)} ج.م
                            </span>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                          <Eye className="w-5 h-5 text-blue-600 mx-auto" />
                        </div>
                      </div>
                      {/* Delivered Orders */}
                      <div
                        className="bg-green-50 border-2 border-green-200 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all group"
                        onClick={() => openOrders(metrics.delivered.orders, "الطلبات المسلمة")}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-700" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-green-900">الطلبات المسلمة</h3>
                            <p className="text-sm text-green-700">{metrics.delivered.count} طلب</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center pt-2 border-t border-green-300">
                            <span className="text-sm font-bold text-green-700">القيمة الأصلية:</span>
                            <span className="font-bold text-xl text-green-900">
                              {metrics.delivered.originalValue.toFixed(2)} ج.م
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-green-700">المحصل فعلياً:</span>
                            <span className="font-bold text-xl text-green-900">
                              {metrics.delivered.courierCollected.toFixed(2)} ج.م
                            </span>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                          <Eye className="w-5 h-5 text-green-600 mx-auto" />
                        </div>
                      </div>
                      {/* Canceled Orders */}
                      <div
                        className="bg-red-50 border-2 border-red-200 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all group"
                        onClick={() => openOrders(metrics.canceled.orders, "الطلبات الملغاة")}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-red-200 rounded-xl flex items-center justify-center">
                            <XCircle className="w-6 h-6 text-red-700" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-red-900">الطلبات الملغاة</h3>
                            <p className="text-sm text-red-700">{metrics.canceled.count} طلب</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center pt-2 border-t border-red-300">
                            <span className="text-sm font-bold text-red-700">القيمة الأصلية:</span>
                            <span className="font-bold text-xl text-red-900">
                              {metrics.canceled.originalValue.toFixed(2)} ج.م
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-red-700">المحصل (رسوم فقط):</span>
                            <span className="font-bold text-xl text-red-900">
                              {metrics.canceled.courierCollected.toFixed(2)} ج.م
                            </span>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                          <Eye className="w-5 h-5 text-red-600 mx-auto" />
                        </div>
                      </div>
                      {/* Partial Orders */}
                      <div
                        className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all group"
                        onClick={() => openOrders(metrics.partial.orders, "الطلبات الجزئية")}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-yellow-200 rounded-xl flex items-center justify-center">
                            <HandCoins className="w-6 h-6 text-yellow-700" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-yellow-900">الطلبات الجزئية</h3>
                            <p className="text-sm text-yellow-700">{metrics.partial.count} طلب</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center pt-2 border-t border-yellow-300">
                            <span className="text-sm font-bold text-yellow-700">القيمة الأصلية:</span>
                            <span className="font-bold text-xl text-yellow-900">
                              {metrics.partial.originalValue.toFixed(2)} ج.م
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-yellow-700">المحصل فعلياً:</span>
                            <span className="font-bold text-xl text-yellow-900">
                              {metrics.partial.courierCollected.toFixed(2)} ج.م
                            </span>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                          <Eye className="w-5 h-5 text-yellow-600 mx-auto" />
                        </div>
                      </div>
                      {/* Returned Orders */}
                      <div
                        className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all group"
                        onClick={() => openOrders(metrics.returned.orders, "الطلبات المؤجله")}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-orange-200 rounded-xl flex items-center justify-center">
                            <Truck className="w-6 h-6 text-orange-700" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-orange-900">الطلبات المؤجله</h3>
                            <p className="text-sm text-orange-700">{metrics.returned.count} طلب</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center pt-2 border-t border-orange-300">
                            <span className="text-sm font-bold text-orange-700">القيمة الأصلية:</span>
                            <span className="font-bold text-xl text-orange-900">
                              {metrics.returned.originalValue.toFixed(2)} ج.م
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-orange-700">المحصل (رسوم فقط):</span>
                            <span className="font-bold text-xl text-orange-900">
                              {metrics.returned.courierCollected.toFixed(2)} ج.م
                            </span>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                          <Eye className="w-5 h-5 text-orange-600 mx-auto" />
                        </div>
                      </div>
                      {/* Receiving Part Orders */}
                      <div
                        className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all group"
                        onClick={() => openOrders(metrics.receivingPart.orders, "طلبات استلام قطعة")}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-indigo-200 rounded-xl flex items-center justify-center">
                            <HandMetal className="w-6 h-6 text-indigo-700" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-indigo-900">طلبات استلام قطعة</h3>
                            <p className="text-sm text-indigo-700">{metrics.receivingPart.count} طلب</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center pt-2 border-t border-indigo-300">
                            <span className="text-sm font-bold text-indigo-700">القيمة الأصلية:</span>
                            <span className="font-bold text-xl text-indigo-900">
                              {metrics.receivingPart.originalValue.toFixed(2)} ج.م
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-indigo-700">المحصل فعلياً:</span>
                            <span className="font-bold text-xl text-indigo-900">
                              {metrics.receivingPart.courierCollected.toFixed(2)} ج.م
                            </span>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                          <Eye className="w-5 h-5 text-indigo-600 mx-auto" />
                        </div>
                      </div>
                      {/* Hand-to-Hand Orders */}
                      <div
                        className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all group"
                        onClick={() => openOrders(metrics.handToHand.orders, "الطلبات يد بيد")}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center">
                            <RefreshCw className="w-6 h-6 text-purple-700" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-purple-900">الطلبات يد بيد</h3>
                            <p className="text-sm text-purple-700">{metrics.handToHand.count} طلب</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center pt-2 border-t border-purple-300">
                            <span className="text-sm font-bold text-purple-700">القيمة الأصلية:</span>
                            <span className="font-bold text-xl text-purple-900">
                              {metrics.handToHand.originalValue.toFixed(2)} ج.م
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-purple-700">المحصل فعلياً:</span>
                            <span className="font-bold text-xl text-purple-900">
                              {metrics.handToHand.courierCollected.toFixed(2)} ج.م
                            </span>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                          <Eye className="w-5 h-5 text-purple-600 mx-auto" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 💳 Payment Breakdown */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-purple-600" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">💳 تفصيل طرق الدفع</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                      {/* Visa Machine */}
                      {metrics.visaMachineOrders.count > 0 && (
                        <div
                          className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all group"
                          onClick={() => openOrders(metrics.visaMachineOrders.orders, "طلبات ماكينة فيزا", 'visa_machine')}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <Monitor className="w-6 h-6 text-slate-600" />
                            <h4 className="font-semibold text-slate-900">ماكينة فيزا</h4>
                          </div>
                          <div className="space-y-1">
                            <p className="text-2xl font-bold text-slate-900">{metrics.visaMachineOrders.count}</p>
                            <p className="text-lg font-semibold text-slate-700">
                              {metrics.visaMachineOrders.amount.toFixed(2)} ج.م
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Instapay */}
                      {metrics.instapayOrders.count > 0 && (
                        <div
                          className="bg-cyan-50 border-2 border-cyan-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all group"
                          onClick={() => openOrders(metrics.instapayOrders.orders, "طلبات إنستاباي", 'instapay')}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <Smartphone className="w-6 h-6 text-cyan-600" />
                            <h4 className="font-semibold text-cyan-900">إنستاباي</h4>
                          </div>
                          <div className="space-y-1">
                            <p className="text-2xl font-bold text-cyan-900">{metrics.instapayOrders.count}</p>
                            <p className="text-lg font-semibold text-cyan-700">
                              {metrics.instapayOrders.amount.toFixed(2)} ج.م
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Wallet */}
                      {metrics.walletOrders.count > 0 && (
                        <div
                          className="bg-teal-50 border-2 border-teal-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all group"
                          onClick={() => openOrders(metrics.walletOrders.orders, "طلبات المحفظة", 'wallet')}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <Wallet className="w-6 h-6 text-teal-600" />
                            <h4 className="font-semibold text-teal-900">المحفظة</h4>
                          </div>
                          <div className="space-y-1">
                            <p className="text-2xl font-bold text-teal-900">{metrics.walletOrders.count}</p>
                            <p className="text-lg font-semibold text-teal-700">
                              {metrics.walletOrders.amount.toFixed(2)} ج.م
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Cash on Hand */}
                      {metrics.cashOnHandOrders.count > 0 && (
                        <div
                          className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all group"
                          onClick={() => openOrders(metrics.cashOnHandOrders.orders, "طلبات نقداً", 'cash')}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <Banknote className="w-6 h-6 text-emerald-600" />
                            <h4 className="font-semibold text-emerald-900">نقداً</h4>
                          </div>
                          <div className="space-y-1">
                            <p className="text-2xl font-bold text-emerald-900">{metrics.cashOnHandOrders.count}</p>
                            <p className="text-lg font-semibold text-emerald-700">
                              {metrics.cashOnHandOrders.amount.toFixed(2)} ج.م
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Total COD */}
                      {metrics.totalCODOrders.count > 0 && (
                        <div
                          className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all group"
                          onClick={() => openOrders(metrics.totalCODOrders.orders, "إجمالي الدفع عند التسليم")}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <HandCoins className="w-6 h-6 text-amber-600" />
                            <h4 className="font-semibold text-amber-900">إجمالي COD</h4>
                          </div>
                          <div className="space-y-1">
                            <p className="text-2xl font-bold text-amber-900">{metrics.totalCODOrders.count}</p>
                            <p className="text-lg font-semibold text-amber-700">
                              {metrics.totalCODOrders.amount.toFixed(2)} ج.م
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Electronic Payments Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Valu */}
                      {metrics.valuOrders.count > 0 && (
                        <div
                          className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all group"
                          onClick={() => openOrders(metrics.valuOrders.orders, "طلبات فاليو", 'valu')}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <Wallet className="w-6 h-6 text-indigo-600" />
                            <h4 className="font-semibold text-indigo-900">فاليو</h4>
                          </div>
                          <div className="space-y-1">
                            <p className="text-2xl font-bold text-indigo-900">{metrics.valuOrders.count}</p>
                            <p className="text-lg font-semibold text-indigo-700">
                              {metrics.valuOrders.amount.toFixed(2)} ج.م
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Paymob - Updated logic to include all paymob orders with collected amounts */}
                      {metrics.paymobOrders.count > 0 && (
                        <div
                          className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all group"
                          onClick={() => openOrders(metrics.paymobOrders.orders, "طلبات paymob", 'paymob')}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <CreditCard className="w-6 h-6 text-blue-600" />
                            <h4 className="font-semibold text-blue-900">Paymob</h4>
                          </div>
                          <div className="space-y-1">
                            <p className="text-2xl font-bold text-blue-900">{metrics.paymobOrders.count}</p>
                            <p className="text-lg font-semibold text-blue-700">
                              {metrics.paymobOrders.amount.toFixed(2)} ج.م
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 🚨 Hold Fees - ALWAYS VISIBLE - ALL DAYS */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">🚨 رسوم الحجز (جميع الأيام)</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Active Hold Fees - ALWAYS VISIBLE - ALL DAYS */}
                      {(() => {
                        const orders = allHoldFeesOrders.filter((o) => {
                          return o.hold_fee && Number(o.hold_fee) > 0
                        })
                        const amount = orders.reduce((acc, o) => acc + Number(o.hold_fee || 0), 0)
                        return (
                          <div
                            className={`${orders.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} border-2 rounded-xl p-4 ${orders.length > 0 ? 'cursor-pointer hover:shadow-lg' : ''} transition-all group`}
                            onClick={orders.length > 0 ? () => openOrders(orders, "رسوم الحجز النشطة (جميع الأيام)") : undefined}
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <AlertCircle className={`w-6 h-6 ${orders.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                              <h4 className={`font-semibold ${orders.length > 0 ? 'text-red-900' : 'text-gray-500'}`}>رسوم حجز نشطة</h4>
                            </div>
                            <div className="space-y-1">
                              <p className={`text-2xl font-bold ${orders.length > 0 ? 'text-red-900' : 'text-gray-500'}`}>{orders.length}</p>
                              <p className={`text-lg font-semibold ${orders.length > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                                {amount.toFixed(2)} ج.م
                              </p>
                            </div>
                          </div>
                        )
                      })()}
                      
                      {/* Removed Hold Fees - ALWAYS VISIBLE with removal date - ALL DAYS */}
                      {(() => {
                        const orders = allHoldFeesOrders.filter((o) => {
                          return !o.hold_fee && o.hold_fee_created_at && o.hold_fee_created_by
                        })
                        // Sort by removal date (most recent first)
                        const sortedOrders = orders.sort((a, b) => 
                          new Date(b.hold_fee_created_at!).getTime() - new Date(a.hold_fee_created_at!).getTime()
                        )
                        return (
                          <div
                            className={`${orders.length > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} border-2 rounded-xl p-4 ${orders.length > 0 ? 'cursor-pointer hover:shadow-lg' : ''} transition-all group`}
                            onClick={orders.length > 0 ? () => openOrders(orders, "رسوم الحجز المزالة (جميع الأيام)") : undefined}
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <CheckCircle className={`w-6 h-6 ${orders.length > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                              <h4 className={`font-semibold ${orders.length > 0 ? 'text-green-900' : 'text-gray-500'}`}>رسوم حجز مزالة</h4>
                            </div>
                            <div className="space-y-1">
                              <p className={`text-2xl font-bold ${orders.length > 0 ? 'text-green-900' : 'text-gray-500'}`}>{orders.length}</p>
                              <p className={`text-lg font-semibold ${orders.length > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                                {orders.length > 0 ? 'تم الإزالة' : 'لا توجد'}
                              </p>
                              {sortedOrders.length > 0 && sortedOrders[0].hold_fee_created_at && (
                                <p className="text-sm text-green-600">
                                  آخر إزالة: {new Date(sortedOrders[0].hold_fee_created_at).toLocaleDateString('ar-EG', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit'
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* 🧾 Total Hand to Accounting */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <Receipt className="w-6 h-6 text-green-600" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">🧾 إجمالي ما يسلم للمحاسبة</h2>
                    </div>
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8 text-center">
                      <div className="text-4xl font-bold text-green-900 mb-2">
                        {metrics.totalHandToAccounting.toFixed(2)} ج.م
                      </div>
                      <p className="text-green-700 font-medium">النقد في اليد فقط</p>
                      <p className="text-sm text-green-600 mt-2">({metrics.cashOnHandOrders.count} طلب نقدي)</p>
                    </div>
                  </div>
                </div>
              )
            })()}
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
                    // Show the correct split payment amount if present (_onther_amount), otherwise fallback
                    const courierOrderAmount = typeof order._onther_amount === 'number' ? order._onther_amount : getCourierOrderAmount(order)
                    const deliveryFee = Number(order.delivery_fee || 0)
                    const totalCourierAmount = typeof order._onther_amount === 'number' ? order._onther_amount : getTotalCourierAmount(order)
                    const displayPaymentMethod = getDisplayPaymentMethod(order)
                    const holdFee = Number(order.hold_fee || 0)
                    return (
                      <div key={order.id + (order._onther_amount ? `_${order._onther_amount}` : '')} className="bg-gray-50 border border-gray-200 rounded-xl p-6">
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
                                <div className={`bg-red-100 rounded flex items-center justify-center mt-0.5`}>
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
                                {/* Hold Fee Section */}
                                {isAdmin && (
                                  <div className="border-t border-gray-200 pt-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-orange-500" />
                                        {translate("holdFee")}:
                                      </span>
                                      {!editingHoldFee || editingHoldFee !== order.id ? (
                                        <div className="flex items-center gap-2">
                                          {holdFee > 0 ? (
                                            <>
                                              <span className="font-semibold text-orange-600">
                                                -{holdFee.toFixed(2)} {translate("EGP")}
                                              </span>
                                              <button
                                                onClick={() =>
                                                  handleEditHoldFee(order.id, holdFee, order.hold_fee_comment ?? "")
                                                }
                                                className="text-blue-600 hover:text-blue-800 p-1"
                                                disabled={holdFeeLoading}
                                              >
                                                <Edit3 className="w-3 h-3" />
                                              </button>
                                              <button
                                                onClick={() => handleRemoveHoldFee(order.id)}
                                                className="text-red-600 hover:text-red-800 p-1"
                                                disabled={holdFeeLoading}
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              onClick={() => handleEditHoldFee(order.id)}
                                              className="text-green-600 hover:text-green-800 p-1 flex items-center gap-1"
                                              disabled={holdFeeLoading}
                                            >
                                              <Plus className="w-3 h-3" />
                                              <span className="text-xs">{translate("addHoldFee")}</span>
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="number"
                                            value={holdFeeAmount}
                                            onChange={(e) => setHoldFeeAmount(e.target.value)}
                                            placeholder={translate("enterAmount")}
                                            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            disabled={holdFeeLoading}
                                          />
                                          <button
                                            onClick={() => handleSaveHoldFee(order.id)}
                                            className="text-green-600 hover:text-green-800 p-1"
                                            disabled={holdFeeLoading}
                                          >
                                            <Save className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={handleCancelHoldFeeEdit}
                                            className="text-gray-600 hover:text-gray-800 p-1"
                                            disabled={holdFeeLoading}
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    {editingHoldFee === order.id && (
                                      <input
                                        type="text"
                                        value={holdFeeComment}
                                        onChange={(e) => setHoldFeeComment(e.target.value)}
                                        placeholder={translate("enterComment")}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 mt-1"
                                        disabled={holdFeeLoading}
                                      />
                                    )}
                                    {holdFee > 0 && order.hold_fee_comment && (
                                      <p className="text-xs text-gray-600 mt-1 italic">"{order.hold_fee_comment}"</p>
                                    )}
                                  </div>
                                )}
                                {totalCourierAmount !== 0 && (
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
                              {/* Show correct payment method for split payments and normal orders */}
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">{translate("paymentSubTypeLabel")}:</span>
                                <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  {getDisplayPaymentMethod(order, translate)}
                                </span>
                              </div>
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

  // Get the current courier to display (either selected courier for admin or current user for courier)
  const currentCourier =
    user.role === "courier" ? { courierId: user.id, courierName: user.name ?? translate("courier") } : selectedCourier

  // Make sure all conditional returns are properly handled
  if (!currentCourier) return null

  // For courier view, show their detailed accounting dashboard
  const metrics = calculateAccountingMetrics()

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header - Mobile Optimized for Couriers */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className={`max-w-7xl mx-auto ${isCourier ? "px-3 py-3" : "px-6 py-6"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user.role !== "courier" && (
                <button
                  onClick={handleBackToCouriers}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">{translate("backToCouriers")}</span>
                </button>
              )}
              <div
                className={`bg-blue-600 rounded-xl flex items-center justify-center ${
                  isCourier ? "w-8 h-8" : "w-12 h-12"
                }`}
              >
                <Calculator className={`text-white ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
              </div>
              <div>
                <h1 className={`font-bold text-gray-900 ${isCourier ? "text-lg" : "text-2xl"}`}>
                  {isCourier ? "المحاسبة" : "لوحة المحاسبة التفصيلية"}
                </h1>
                <p className={`text-gray-600 ${isCourier ? "text-xs" : "text-base"}`}>
                  {isCourier
                    ? currentCourier.courierName
                    : `تقرير شامل للعمليات المالية - ${currentCourier.courierName}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Quick Date Filters - Simplified for Mobile */}
              {!isCourier && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuickDateRange("today")}
                    className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                      activeFilter === "today" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {translate("today")}
                  </button>
                  <button
                    onClick={() => setQuickDateRange("yesterday")}
                    className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                      activeFilter === "yesterday" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {translate("yesterday")}
                  </button>
                  <button
                    onClick={() => setQuickDateRange("last7Days")}
                    className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                      activeFilter === "last7Days" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {translate("last7Days")}
                  </button>
                  <button
                    onClick={() => setQuickDateRange("last30Days")}
                    className={`px-3 py-2 text-sm rounded-lg hover:bg-blue-200 transition-colors ${
                      activeFilter === "last30Days" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {translate("last30Days")}
                  </button>
                </div>
              )}
              {isCourier && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setQuickDateRange("today")}
                    className={`px-2 py-1 text-xs rounded hover:bg-blue-200 transition-colors ${
                      activeFilter === "today" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    اليوم
                  </button>
                  <button
                    onClick={() => setQuickDateRange("yesterday")}
                    className={`px-2 py-1 text-xs rounded hover:bg-blue-200 transition-colors ${
                      activeFilter === "yesterday" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    أمس
                  </button>
                </div>
              )}
              {/* Date Range Picker */}
              <div className="flex items-center gap-2">
                <Calendar className={`text-gray-400 ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => {
                    setActiveFilter("custom")
                    setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                  }}
                  className={`border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isCourier ? "px-2 py-1 text-xs" : "px-4 py-2"
                  }`}
                  dir="ltr"
                  aria-label={translate("selectDate")}
                />
                {!isCourier && (
                  <>
                    <span className="text-gray-500">-</span>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => {
                        setActiveFilter("custom")
                        setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                      }}
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      dir="ltr"
                      aria-label={translate("selectDate")}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Mobile Optimized for Couriers */}
        <div className={`max-w-7xl mx-auto ${isCourier ? "px-3 py-4" : "px-6 py-8"}`}>
          <div className={`space-y-${isCourier ? "4" : "8"}`}>
            {/* 📦 Order Summary Section */}
            <div className={`bg-white rounded-xl border border-gray-200 ${isCourier ? "p-4" : "p-6"}`}>
              <div className={`flex items-center gap-3 ${isCourier ? "mb-4" : "mb-6"}`}>
                <div
                  className={`bg-blue-100 rounded-xl flex items-center justify-center ${
                    isCourier ? "w-8 h-8" : "w-10 h-10"
                  }`}
                >
                  <Package className={`text-blue-600 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                </div>
                <h2 className={`font-bold text-gray-900 ${isCourier ? "text-lg" : "text-xl"}`}>
                  {isCourier ? "📦 الطلبات" : "📦 ملخص الطلبات"}
                </h2>
              </div>
              <div
                className={`grid ${
                  isCourier ? "grid-cols-1 gap-3" : "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
                }`}
              >
                {/* Total Orders */}
                <div
                  className={`bg-gray-50 border-2 border-gray-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                    isCourier ? "p-4" : "p-6"
                  }`}
                  onClick={() => openOrders(metrics.allOrders, "إجمالي الطلبات")}
                >
                  <div className={`flex items-center gap-4 ${isCourier ? "mb-2" : "mb-4"}`}>
                    <div
                      className={`bg-gray-200 rounded-xl flex items-center justify-center ${
                        isCourier ? "w-8 h-8" : "w-12 h-12"
                      }`}
                    >
                      <Package className={`text-gray-700 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-gray-900 ${isCourier ? "text-sm" : "text-lg"}`}>
                        {isCourier ? "الإجمالي" : "إجمالي الطلبات"}
                      </h3>
                      <p className={`text-gray-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        {metrics.totalOrdersCount} طلب
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center pt-2 border-t border-gray-300`}>
                      <span className={`font-bold text-gray-700 ${isCourier ? "text-xs" : "text-sm"}`}>القيمة:</span>
                      <span className={`font-bold text-gray-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.totalOrdersOriginalValue.toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                    <Eye className={`text-gray-600 mx-auto ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                </div>
                {/* Assigned Orders */}
                <div
                  className={`bg-blue-50 border-2 border-blue-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                    isCourier ? "p-4" : "p-6"
                  }`}
                  onClick={() => openOrders(metrics.assigned.orders, "الطلبات المكلفة")}
                >
                  <div className={`flex items-center gap-4 ${isCourier ? "mb-2" : "mb-4"}`}>
                    <div
                      className={`bg-blue-200 rounded-xl flex items-center justify-center ${
                        isCourier ? "w-8 h-8" : "w-12 h-12"
                      }`}
                    >
                      <Clock className={`text-blue-700 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-blue-900 ${isCourier ? "text-sm" : "text-lg"}`}>
                        {isCourier ? "المكلفة" : "الطلبات المكلفة"}
                      </h3>
                      <p className={`text-blue-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        {metrics.assigned.count} طلب
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center pt-2 border-t border-blue-300`}>
                      <span className={`font-bold text-blue-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        القيمة الأصلية:
                      </span>
                      <span className={`font-bold text-blue-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.assigned.originalValue.toFixed(0)} ج.م
                      </span>
                    </div>
                    <div className={`flex justify-between items-center`}>
                      <span className={`font-bold text-blue-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        المحصل (تقديري):
                      </span>
                      <span className={`font-bold text-blue-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.assigned.courierCollected.toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                    <Eye className={`text-blue-600 mx-auto ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                </div>
                {/* Delivered Orders */}
                <div
                  className={`bg-green-50 border-2 border-green-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                    isCourier ? "p-4" : "p-6"
                  }`}
                  onClick={() => openOrders(metrics.delivered.orders, "الطلبات المسلمة")}
                >
                  <div className={`flex items-center gap-4 ${isCourier ? "mb-2" : "mb-4"}`}>
                    <div
                      className={`bg-green-200 rounded-xl flex items-center justify-center ${
                        isCourier ? "w-8 h-8" : "w-12 h-12"
                      }`}
                    >
                      <CheckCircle className={`text-green-700 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-green-900 ${isCourier ? "text-sm" : "text-lg"}`}>
                        {isCourier ? "المسلمة" : "الطلبات المسلمة"}
                      </h3>
                      <p className={`text-green-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        {metrics.delivered.count} طلب
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center pt-2 border-t border-green-300`}>
                      <span className={`font-bold text-green-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        القيمة الأصلية:
                      </span>
                      <span className={`font-bold text-green-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.delivered.originalValue.toFixed(0)} ج.م
                      </span>
                    </div>
                    <div className={`flex justify-between items-center`}>
                      <span className={`font-bold text-green-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        المحصل فعلياً:
                      </span>
                      <span className={`font-bold text-green-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.delivered.courierCollected.toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                    <Eye className={`text-green-600 mx-auto ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                </div>
                {/* Canceled Orders */}
                <div
                  className={`bg-red-50 border-2 border-red-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                    isCourier ? "p-4" : "p-6"
                  }`}
                  onClick={() => openOrders(metrics.canceled.orders, "الطلبات الملغاة")}
                >
                  <div className={`flex items-center gap-4 ${isCourier ? "mb-2" : "mb-4"}`}>
                    <div
                      className={`bg-red-200 rounded-xl flex items-center justify-center ${
                        isCourier ? "w-8 h-8" : "w-12 h-12"
                      }`}
                    >
                      <XCircle className={`text-red-700 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-red-900 ${isCourier ? "text-sm" : "text-lg"}`}>
                        {isCourier ? "الملغاة" : "الطلبات الملغاة"}
                      </h3>
                      <p className={`text-red-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        {metrics.canceled.count} طلب
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center pt-2 border-t border-red-300`}>
                      <span className={`font-bold text-red-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        القيمة الأصلية:
                      </span>
                      <span className={`font-bold text-red-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.canceled.originalValue.toFixed(0)} ج.م
                      </span>
                    </div>
                    <div className={`flex justify-between items-center`}>
                      <span className={`font-bold text-red-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        المحصل (رسوم فقط):
                      </span>
                      <span className={`font-bold text-red-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.canceled.courierCollected.toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                    <Eye className={`text-red-600 mx-auto ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                </div>
                {/* Partial Orders */}
                <div
                  className={`bg-yellow-50 border-2 border-yellow-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                    isCourier ? "p-4" : "p-6"
                  }`}
                  onClick={() => openOrders(metrics.partial.orders, "الطلبات الجزئية")}
                >
                  <div className={`flex items-center gap-4 ${isCourier ? "mb-2" : "mb-4"}`}>
                    <div
                      className={`bg-yellow-200 rounded-xl flex items-center justify-center ${
                        isCourier ? "w-8 h-8" : "w-12 h-12"
                      }`}
                    >
                      <HandCoins className={`text-yellow-700 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-yellow-900 ${isCourier ? "text-sm" : "text-lg"}`}>
                        {isCourier ? "الجزئية" : "الطلبات الجزئية"}
                      </h3>
                      <p className={`text-yellow-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        {metrics.partial.count} طلب
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center pt-2 border-t border-yellow-300`}>
                      <span className={`font-bold text-yellow-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        القيمة الأصلية:
                      </span>
                      <span className={`font-bold text-yellow-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.partial.originalValue.toFixed(0)} ج.م
                      </span>
                    </div>
                    <div className={`flex justify-between items-center`}>
                      <span className={`font-bold text-yellow-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        المحصل فعلياً:
                      </span>
                      <span className={`font-bold text-yellow-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.partial.courierCollected.toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                    <Eye className={`text-yellow-600 mx-auto ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                </div>
                {/* Returned Orders */}
                <div
                  className={`bg-orange-50 border-2 border-orange-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                    isCourier ? "p-4" : "p-6"
                  }`}
                  onClick={() => openOrders(metrics.returned.orders, "الطلبات المؤجله")}
                >
                  <div className={`flex items-center gap-4 ${isCourier ? "mb-2" : "mb-4"}`}>
                    <div
                      className={`bg-orange-200 rounded-xl flex items-center justify-center ${
                        isCourier ? "w-8 h-8" : "w-12 h-12"
                      }`}
                    >
                      <Truck className={`text-orange-700 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-orange-900 ${isCourier ? "text-sm" : "text-lg"}`}>
                        {isCourier ? "المؤجلة" : "الطلبات المؤجله"}
                      </h3>
                      <p className={`text-orange-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        {metrics.returned.count} طلب
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center pt-2 border-t border-orange-300`}>
                      <span className={`font-bold text-orange-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        القيمة الأصلية:
                      </span>
                      <span className={`font-bold text-orange-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.returned.originalValue.toFixed(0)} ج.م
                      </span>
                    </div>
                    <div className={`flex justify-between items-center`}>
                      <span className={`font-bold text-orange-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        المحصل (رسوم فقط):
                      </span>
                      <span className={`font-bold text-orange-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.returned.courierCollected.toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                    <Eye className={`text-orange-600 mx-auto ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                </div>
                {/* Receiving Part Orders */}
                <div
                  className={`bg-indigo-50 border-2 border-indigo-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                    isCourier ? "p-4" : "p-6"
                  }`}
                  onClick={() => openOrders(metrics.receivingPart.orders, "طلبات استلام قطعة")}
                >
                  <div className={`flex items-center gap-4 ${isCourier ? "mb-2" : "mb-4"}`}>
                    <div
                      className={`bg-indigo-200 rounded-xl flex items-center justify-center ${
                        isCourier ? "w-8 h-8" : "w-12 h-12"
                      }`}
                    >
                      <HandMetal className={`text-indigo-700 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-indigo-900 ${isCourier ? "text-sm" : "text-lg"}`}>
                        {isCourier ? "استلام قطعة" : "طلبات استلام قطعة"}
                      </h3>
                      <p className={`text-indigo-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        {metrics.receivingPart.count} طلب
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center pt-2 border-t border-indigo-300`}>
                      <span className={`font-bold text-indigo-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        القيمة الأصلية:
                      </span>
                      <span className={`font-bold text-indigo-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.receivingPart.originalValue.toFixed(0)} ج.م
                      </span>
                    </div>
                    <div className={`flex justify-between items-center`}>
                      <span className={`font-bold text-indigo-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        المحصل فعلياً:
                      </span>
                      <span className={`font-bold text-indigo-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.receivingPart.courierCollected.toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                    <Eye className={`text-indigo-600 mx-auto ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                </div>
                {/* Hand-to-Hand Orders */}
                <div
                  className={`bg-purple-50 border-2 border-purple-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                    isCourier ? "p-4" : "p-6"
                  }`}
                  onClick={() => openOrders(metrics.handToHand.orders, "الطلبات يد بيد")}
                >
                  <div className={`flex items-center gap-4 ${isCourier ? "mb-2" : "mb-4"}`}>
                    <div
                      className={`bg-purple-200 rounded-xl flex items-center justify-center ${
                        isCourier ? "w-8 h-8" : "w-12 h-12"
                      }`}
                    >
                      <RefreshCw className={`text-purple-700 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-purple-900 ${isCourier ? "text-sm" : "text-lg"}`}>
                        {isCourier ? "يد بيد" : "الطلبات يد بيد"}
                      </h3>
                      <p className={`text-purple-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        {metrics.handToHand.count} طلب
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`flex justify-between items-center pt-2 border-t border-purple-300`}>
                      <span className={`font-bold text-purple-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        القيمة الأصلية:
                      </span>
                      <span className={`font-bold text-purple-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.handToHand.originalValue.toFixed(0)} ج.م
                      </span>
                    </div>
                    <div className={`flex justify-between items-center`}>
                      <span className={`font-bold text-purple-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                        المحصل فعلياً:
                      </span>
                      <span className={`font-bold text-purple-900 ${isCourier ? "text-sm" : "text-xl"}`}>
                        {metrics.handToHand.courierCollected.toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-3">
                    <Eye className={`text-purple-600 mx-auto ${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* 💳 Payment Breakdown */}
            <div className={`bg-white rounded-xl border border-gray-200 ${isCourier ? "p-4" : "p-6"}`}>
              <div className={`flex items-center gap-3 ${isCourier ? "mb-4" : "mb-6"}`}>
                <div
                  className={`bg-purple-100 rounded-xl flex items-center justify-center ${
                    isCourier ? "w-8 h-8" : "w-10 h-10"
                  }`}
                >
                  <CreditCard className={`text-purple-600 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                </div>
                <h2 className={`font-bold text-gray-900 ${isCourier ? "text-lg" : "text-xl"}`}>
                  {isCourier ? "💳 طرق الدفع" : "💳 تفصيل طرق الدفع"}
                </h2>
              </div>
              <div
                className={`grid ${
                  isCourier
                    ? "grid-cols-2 gap-2 mb-4"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6"
                }`}
              >
                {/* Visa Machine */}
                {(() => {
                  const orders = allOrders.filter((o) => {
                    return (
                      o.payment_sub_type === "visa_machine" &&
                      getTotalCourierAmount(o) > 0 &&
                      o.assigned_courier_id === currentCourier.courierId
                    )
                  })
                  const amount = orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0)
                  return orders.length > 0 ? (
                    <div
                      className={`bg-slate-50 border-2 border-slate-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                        isCourier ? "p-3" : "p-4"
                      }`}
                      onClick={() => openOrders(orders, "طلبات ماكينة فيزا")}
                    >
                      <div className={`flex items-center gap-3 ${isCourier ? "mb-2" : "mb-3"}`}>
                        <Monitor className={`text-slate-600 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                        <h4 className={`font-semibold text-slate-900 ${isCourier ? "text-xs" : "text-base"}`}>
                          {isCourier ? "فيزا" : "ماكينة فيزا"}
                        </h4>
                      </div>
                      <div className="space-y-1">
                        <p className={`font-bold text-slate-900 ${isCourier ? "text-lg" : "text-2xl"}`}>
                          {orders.length}
                        </p>
                        <p className={`font-semibold text-slate-700 ${isCourier ? "text-sm" : "text-lg"}`}>
                          {amount.toFixed(0)} ج.م
                        </p>
                      </div>
                    </div>
                  ) : null
                })()}
                {/* Instapay */}
                {(() => {
                  const orders = allOrders.filter((o) => {
                    return (
                      o.payment_sub_type === "instapay" &&
                      getTotalCourierAmount(o) > 0 &&
                      o.assigned_courier_id === currentCourier.courierId
                    )
                  })
                  const amount = orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0)
                  return orders.length > 0 ? (
                    <div
                      className={`bg-cyan-50 border-2 border-cyan-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                        isCourier ? "p-3" : "p-4"
                      }`}
                      onClick={() => openOrders(orders, "طلبات إنستاباي")}
                    >
                      <div className={`flex items-center gap-3 ${isCourier ? "mb-2" : "mb-3"}`}>
                        <Smartphone className={`text-cyan-600 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                        <h4 className={`font-semibold text-cyan-900 ${isCourier ? "text-xs" : "text-base"}`}>
                          {isCourier ? "إنستا" : "إنستاباي"}
                        </h4>
                      </div>
                      <div className="space-y-1">
                        <p className={`font-bold text-cyan-900 ${isCourier ? "text-lg" : "text-2xl"}`}>
                          {orders.length}
                        </p>
                        <p className={`font-semibold text-cyan-700 ${isCourier ? "text-sm" : "text-lg"}`}>
                          {amount.toFixed(0)} ج.م
                        </p>
                      </div>
                    </div>
                  ) : null
                })()}
                {/* Wallet */}
                {(() => {
                  const orders = allOrders.filter((o) => {
                    return (
                      o.payment_sub_type === "wallet" &&
                      getTotalCourierAmount(o) > 0 &&
                      o.assigned_courier_id === currentCourier.courierId
                    )
                  })
                  const amount = orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0)
                  return orders.length > 0 ? (
                    <div
                      className={`bg-teal-50 border-2 border-teal-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                        isCourier ? "p-3" : "p-4"
                      }`}
                      onClick={() => openOrders(orders, "طلبات المحفظة")}
                    >
                      <div className={`flex items-center gap-3 ${isCourier ? "mb-2" : "mb-3"}`}>
                        <Wallet className={`text-teal-600 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                        <h4 className={`font-semibold text-teal-900 ${isCourier ? "text-xs" : "text-base"}`}>
                          المحفظة
                        </h4>
                      </div>
                      <div className="space-y-1">
                        <p className={`font-bold text-teal-900 ${isCourier ? "text-lg" : "text-2xl"}`}>
                          {orders.length}
                        </p>
                        <p className={`font-semibold text-teal-700 ${isCourier ? "text-sm" : "text-lg"}`}>
                          {amount.toFixed(0)} ج.م
                        </p>
                      </div>
                    </div>
                  ) : null
                })()}
                {/* Cash on Hand */}
                {(() => {
                  const orders = allOrders.filter((o) => {
                    const displayMethod = getDisplayPaymentMethod(o).toLowerCase()
                    const originalMethod = (o.payment_method || "").toLowerCase()

                    const isGeneralCash =
                      displayMethod === "cash" ||
                      originalMethod === "cash" ||
                      (o.collected_by && o.collected_by.toLowerCase() === "cash") ||
                      (o.collected_by && o.collected_by.toLowerCase() === "on_hand")

                    const isSpecificElectronicCashLike =
                      o.payment_sub_type === "instapay" ||
                      o.payment_sub_type === "wallet" ||
                      o.payment_sub_type === "visa_machine"

                    return (
                      (o.payment_sub_type === "on_hand" || (isGeneralCash && !isSpecificElectronicCashLike)) &&
                      getTotalCourierAmount(o) > 0 &&
                      o.assigned_courier_id === currentCourier.courierId
                    )
                  })
                  const amount = orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0)
                  return orders.length > 0 ? (
                    <div
                      className={`bg-emerald-50 border-2 border-emerald-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                        isCourier ? "p-3" : "p-4"
                      }`}
                      onClick={() => openOrders(orders, "طلبات نقداً")}
                    >
                      <div className={`flex items-center gap-3 ${isCourier ? "mb-2" : "mb-3"}`}>
                        <Banknote className={`text-emerald-600 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                        <h4 className={`font-semibold text-emerald-900 ${isCourier ? "text-xs" : "text-base"}`}>
                          نقداً
                        </h4>
                      </div>
                      <div className="space-y-1">
                        <p className={`font-bold text-emerald-900 ${isCourier ? "text-lg" : "text-2xl"}`}>
                          {orders.length}
                        </p>
                        <p className={`font-semibold text-emerald-700 ${isCourier ? "text-sm" : "text-lg"}`}>
                          {amount.toFixed(0)} ج.م
                        </p>
                      </div>
                    </div>
                  ) : null
                })()}
                {/* Total COD - Hidden for mobile */}
                {!isCourier &&
                  (() => {
                    const orders = allOrders.filter((o) => {
                      const displayMethod = getDisplayPaymentMethod(o).toLowerCase()
                      const originalMethod = (o.payment_method || "").toLowerCase()

                      return (
                        (o.payment_sub_type === "on_hand" ||
                          o.payment_sub_type === "instapay" ||
                          o.payment_sub_type === "wallet" ||
                          o.payment_sub_type === "visa_machine" ||
                          displayMethod === "on_hand" ||
                          displayMethod === "cash" ||
                          displayMethod === "instapay" ||
                          displayMethod === "wallet" ||
                          displayMethod === "visa_machine" ||
                          originalMethod === "cash" ||
                          (o.collected_by &&
                            ["cash", "on_hand", "instapay", "wallet", "visa_machine"].includes(
                              o.collected_by.toLowerCase(),
                            )) ||
                          normalizePaymentMethod(displayMethod) === "cash" ||
                          normalizePaymentMethod(originalMethod) === "cash") &&
                        getTotalCourierAmount(o) > 0 &&
                        o.assigned_courier_id === currentCourier.courierId
                      )
                    })
                    const amount = orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0)
                    return orders.length > 0 ? (
                      <div
                        className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all group"
                        onClick={() => openOrders(orders, "إجمالي الدفع عند التسليم")}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <HandCoins className="w-6 h-6 text-amber-600" />
                          <h4 className="font-semibold text-amber-900">إجمالي COD</h4>
                        </div>
                        <div className="space-y-1">
                          <p className="text-2xl font-bold text-amber-900">{orders.length}</p>
                          <p className="text-lg font-semibold text-amber-700">{amount.toFixed(2)} ج.م</p>
                        </div>
                      </div>
                    ) : null
                  })()}
              </div>
              {/* Electronic Payments Row */}
              <div className={`grid ${isCourier ? "grid-cols-2 gap-2" : "grid-cols-1 sm:grid-cols-2 gap-4"}`}>
                {/* Valu */}
                {(() => {
                  const orders = allOrders.filter((o) => {
                    const displayMethod = getDisplayPaymentMethod(o)
                    const normalizedDisplay = normalizePaymentMethod(displayMethod)
                    const normalizedOriginal = normalizePaymentMethod(o.payment_method)
                    return (
                      (normalizedDisplay === "valu" || (normalizedOriginal === "valu" && !o.collected_by)) &&
                      getTotalCourierAmount(o) > 0 &&
                      o.assigned_courier_id === currentCourier.courierId
                    )
                  })
                  const amount = orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0)
                  return orders.length > 0 ? (
                    <div
                      className={`bg-indigo-50 border-2 border-indigo-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                        isCourier ? "p-3" : "p-4"
                      }`}
                      onClick={() => openOrders(orders, "طلبات فاليو")}
                    >
                      <div className={`flex items-center gap-3 ${isCourier ? "mb-2" : "mb-3"}`}>
                        <Wallet className={`text-indigo-600 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                        <h4 className={`font-semibold text-indigo-900 ${isCourier ? "text-xs" : "text-base"}`}>
                          فاليو
                        </h4>
                      </div>
                      <div className="space-y-1">
                        <p className={`font-bold text-indigo-900 ${isCourier ? "text-lg" : "text-2xl"}`}>
                          {orders.length}
                        </p>
                        <p className={`font-semibold text-indigo-700 ${isCourier ? "text-sm" : "text-lg"}`}>
                          {amount.toFixed(0)} ج.م
                        </p>
                      </div>
                    </div>
                  ) : null
                })()}
                {/* Paymob - Updated logic to include all paymob orders with collected amounts */}
                {(() => {
                  const orders = allOrders.filter((o) => {
                    const displayMethod = getDisplayPaymentMethod(o)
                    const normalizedDisplay = normalizePaymentMethod(displayMethod)
                    const normalizedOriginal = normalizePaymentMethod(o.payment_method)
                    const isValu = normalizedDisplay === "valu" || normalizedOriginal === "valu"
                    // If it's valu, don't count as paymob
                    if (isValu) return false
                    // If it's paid and has collected amount, count as paymob
                    if (o.payment_status === "paid" && getTotalCourierAmount(o) > 0) return true
                    // Check for paymob indicators (excluding visa_machine which is separate)
                    return (
                      ((normalizedDisplay === "paymob" && o.payment_sub_type !== "visa_machine") ||
                        (normalizedOriginal === "paymob" && !o.collected_by && !o.payment_sub_type)) &&
                      getTotalCourierAmount(o) > 0 &&
                      o.assigned_courier_id === currentCourier.courierId
                    )
                  })
                  const amount = orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0)
                  return orders.length > 0 ? (
                    <div
                      className={`bg-blue-50 border-2 border-blue-200 rounded-xl cursor-pointer hover:shadow-lg transition-all group ${
                        isCourier ? "p-3" : "p-4"
                      }`}
                      onClick={() => openOrders(orders, "طلبات paymob")}
                    >
                      <div className={`flex items-center gap-3 ${isCourier ? "mb-2" : "mb-3"}`}>
                        <CreditCard className={`text-blue-600 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                        <h4 className={`font-semibold text-blue-900 ${isCourier ? "text-xs" : "text-base"}`}>Paymob</h4>
                      </div>
                      <div className="space-y-1">
                        <p className={`font-bold text-blue-900 ${isCourier ? "text-lg" : "text-2xl"}`}>
                          {orders.length}
                        </p>
                        <p className={`font-semibold text-blue-700 ${isCourier ? "text-sm" : "text-lg"}`}>
                          {amount.toFixed(0)} ج.م
                        </p>
                      </div>
                    </div>
                  ) : null
                })()}
              </div>
            </div>

            {/* 🚨 Hold Fees - ALWAYS VISIBLE - ALL DAYS */}
            <div className={`bg-white rounded-xl border border-gray-200 ${isCourier ? "p-4" : "p-6"}`}>
              <div className={`flex items-center gap-3 ${isCourier ? "mb-4" : "mb-6"}`}>
                <div
                  className={`bg-red-100 rounded-xl flex items-center justify-center ${
                    isCourier ? "w-8 h-8" : "w-10 h-10"
                  }`}
                >
                  <AlertCircle className={`text-red-600 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                </div>
                <h2 className={`font-bold text-gray-900 ${isCourier ? "text-lg" : "text-xl"}`}>
                  {isCourier ? "رسوم الحجز (جميع الأيام)" : "🚨 رسوم الحجز (جميع الأيام)"}
                </h2>
              </div>
              <div className={`grid ${isCourier ? "grid-cols-1 gap-3" : "grid-cols-1 sm:grid-cols-2 gap-4"}`}>
                {/* Active Hold Fees - ALWAYS VISIBLE - ALL DAYS */}
                {(() => {
                  const orders = allHoldFeesOrders.filter((o) => {
                    return o.hold_fee && Number(o.hold_fee) > 0 && o.assigned_courier_id === currentCourier.courierId
                  })
                  const amount = orders.reduce((acc, o) => acc + Number(o.hold_fee || 0), 0)
                  return (
                    <div
                      className={`${orders.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} border-2 rounded-xl ${orders.length > 0 ? 'cursor-pointer hover:shadow-lg' : ''} transition-all group ${
                        isCourier ? "p-3" : "p-4"
                      }`}
                      onClick={orders.length > 0 ? () => openOrders(orders, "رسوم الحجز النشطة (جميع الأيام)") : undefined}
                    >
                      <div className={`flex items-center gap-3 ${isCourier ? "mb-2" : "mb-3"}`}>
                        <AlertCircle className={`${orders.length > 0 ? 'text-red-600' : 'text-gray-400'} ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                        <h4 className={`font-semibold ${orders.length > 0 ? 'text-red-900' : 'text-gray-500'} ${isCourier ? "text-xs" : "text-base"}`}>
                          رسوم حجز نشطة
                        </h4>
                      </div>
                      <div className="space-y-1">
                        <p className={`font-bold ${orders.length > 0 ? 'text-red-900' : 'text-gray-500'} ${isCourier ? "text-lg" : "text-2xl"}`}>
                          {orders.length}
                        </p>
                        <p className={`font-semibold ${orders.length > 0 ? 'text-red-700' : 'text-gray-400'} ${isCourier ? "text-sm" : "text-lg"}`}>
                          {amount.toFixed(2)} ج.م
                        </p>
                      </div>
                    </div>
                  )
                })()}
                
                {/* Removed Hold Fees - ALWAYS VISIBLE with removal date - ALL DAYS */}
                {(() => {
                  const orders = allHoldFeesOrders.filter((o) => {
                    return !o.hold_fee && o.hold_fee_created_at && o.hold_fee_created_by && o.assigned_courier_id === currentCourier.courierId
                  })
                  // Sort by removal date (most recent first)
                  const sortedOrders = orders.sort((a, b) => 
                    new Date(b.hold_fee_created_at!).getTime() - new Date(a.hold_fee_created_at!).getTime()
                  )
                  return (
                    <div
                      className={`${orders.length > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} border-2 rounded-xl ${orders.length > 0 ? 'cursor-pointer hover:shadow-lg' : ''} transition-all group ${
                        isCourier ? "p-3" : "p-4"
                      }`}
                      onClick={orders.length > 0 ? () => openOrders(orders, "رسوم الحجز المزالة (جميع الأيام)") : undefined}
                    >
                      <div className={`flex items-center gap-3 ${isCourier ? "mb-2" : "mb-3"}`}>
                        <CheckCircle className={`${orders.length > 0 ? 'text-green-600' : 'text-gray-400'} ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                        <h4 className={`font-semibold ${orders.length > 0 ? 'text-green-900' : 'text-gray-500'} ${isCourier ? "text-xs" : "text-base"}`}>
                          رسوم حجز مزالة
                        </h4>
                      </div>
                      <div className="space-y-1">
                        <p className={`font-bold ${orders.length > 0 ? 'text-green-900' : 'text-gray-500'} ${isCourier ? "text-lg" : "text-2xl"}`}>
                          {orders.length}
                        </p>
                        <p className={`font-semibold ${orders.length > 0 ? 'text-green-700' : 'text-gray-400'} ${isCourier ? "text-sm" : "text-lg"}`}>
                          {orders.length > 0 ? 'تم الإزالة' : 'لا توجد'}
                        </p>
                        {sortedOrders.length > 0 && sortedOrders[0].hold_fee_created_at && (
                          <p className={`${orders.length > 0 ? 'text-green-600' : 'text-gray-400'} ${isCourier ? "text-xs" : "text-sm"}`}>
                            آخر إزالة: {new Date(sortedOrders[0].hold_fee_created_at).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* 🧾 Total Hand to Accounting */}
            <div className={`bg-white rounded-xl border border-gray-200 ${isCourier ? "p-4" : "p-6"}`}>
              <div className={`flex items-center gap-3 ${isCourier ? "mb-4" : "mb-6"}`}>
                <div
                  className={`bg-green-100 rounded-xl flex items-center justify-center ${
                    isCourier ? "w-8 h-8" : "w-10 h-10"
                  }`}
                >
                  <Receipt className={`text-green-600 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`} />
                </div>
                <h2 className={`font-bold text-gray-900 ${isCourier ? "text-lg" : "text-xl"}`}>
                  {isCourier ? "للمحاسبة" : "🧾 إجمالي ما يسلم للمحاسبة"}
                </h2>
              </div>
              <div
                className={`bg-green-50 border-2 border-green-200 rounded-xl text-center ${isCourier ? "p-6" : "p-8"}`}
              >
                {(() => {
                  const cashOnHandOrders = allOrders.filter((o) => {
                    const displayMethod = getDisplayPaymentMethod(o).toLowerCase()
                    const originalMethod = (o.payment_method || "").toLowerCase()

                    const isGeneralCash =
                      displayMethod === "cash" ||
                      originalMethod === "cash" ||
                      (o.collected_by && o.collected_by.toLowerCase() === "cash") ||
                      (o.collected_by && o.collected_by.toLowerCase() === "on_hand")

                    const isSpecificElectronicCashLike =
                      o.payment_sub_type === "instapay" ||
                      o.payment_sub_type === "wallet" ||
                      o.payment_sub_type === "visa_machine"

                    return (
                      (o.payment_sub_type === "on_hand" || (isGeneralCash && !isSpecificElectronicCashLike)) &&
                      getTotalCourierAmount(o) > 0 &&
                      o.assigned_courier_id === currentCourier.courierId
                    )
                  })
                  const totalHandToAccounting = cashOnHandOrders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0)
                  return (
                    <>
                      <div className={`font-bold text-green-900 mb-2 ${isCourier ? "text-2xl" : "text-4xl"}`}>
                        {totalHandToAccounting.toFixed(0)} ج.م
                      </div>
                      <p className={`text-green-700 font-medium ${isCourier ? "text-sm" : "text-base"}`}>
                        {isCourier ? "النقد فقط" : "النقد في اليد فقط"}
                      </p>
                      <p className={`text-green-600 mt-2 ${isCourier ? "text-xs" : "text-sm"}`}>
                        ({cashOnHandOrders.length} طلب نقدي)
                      </p>
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Orders Modal - Mobile Optimized */}
        {selectedOrders.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
              className={`bg-white rounded-xl w-full max-h-[90vh] overflow-hidden flex flex-col ${
                isCourier ? "max-w-md" : "max-w-6xl"
              }`}
            >
              {/* Modal Header */}
              <div className={`bg-blue-600 text-white flex items-center justify-between ${isCourier ? "p-4" : "p-6"}`}>
                <div className="flex items-center gap-4">
                  <div
                    className={`bg-blue-500 rounded-lg flex items-center justify-center ${isCourier ? "w-8 h-8" : "w-10 h-10"}`}
                  >
                    <Filter className={`${isCourier ? "w-4 h-4" : "w-5 h-5"}`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${isCourier ? "text-lg" : "text-xl"}`}>{modalTitle}</h3>
                    <p className={`text-blue-100 ${isCourier ? "text-sm" : "text-base"}`}>
                      {selectedOrders.length} {translate("ordersCount")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrders([])}
                  className="text-blue-100 hover:text-white transition-colors p-2"
                  aria-label={translate("close")}
                >
                  <X className={`${isCourier ? "w-5 h-5" : "w-6 h-6"}`} />
                </button>
              </div>
              {/* Modal Content */}
              <div className={`flex-1 overflow-y-auto ${isCourier ? "p-4" : "p-6"}`}>
                <div className={`space-y-${isCourier ? "3" : "4"}`}>
                  {selectedOrders.map((order) => {
                    // For split payments, show the correct payment method for this sub-payment
                    const isSplit = typeof order._onther_amount === 'number' && order.payment_sub_type;
                    const courierOrderAmount = isSplit ? order._onther_amount : getCourierOrderAmount(order);
                    const deliveryFee = Number(order.delivery_fee || 0);
                    const totalCourierAmount = isSplit ? order._onther_amount : getTotalCourierAmount(order);
                    // If _onther_amount is present, use payment_sub_type as the method, else use displayPaymentMethod
                    const paymentMethodLabel = isSplit
                      ? translate(normalizePaymentMethod(order.payment_sub_type ?? ""))
                      : translate(getDisplayPaymentMethod(order));
                    const holdFee = Number(order.hold_fee || 0);
                    // Unique key for split payments: id + method + amount
                    const rowKey = isSplit
                      ? `${order.id}_${order.payment_sub_type}_${order._onther_amount}`
                      : order.id;
                    return (
                      <div
                        key={rowKey}
                        className={`bg-gray-50 border border-gray-200 rounded-xl ${isCourier ? "p-4" : "p-6"}`}
                      >
                        <div className={`grid ${isCourier ? "grid-cols-1 gap-4" : "grid-cols-1 lg:grid-cols-2 gap-6"}`}>
                          {/* Order Information */}
                          <div className={`space-y-${isCourier ? "3" : "4"}`}>
                            <div className={`flex items-center gap-3 pb-3 border-b border-gray-200`}>
                              <div
                                className={`bg-blue-100 rounded-lg flex items-center justify-center ${isCourier ? "w-6 h-6" : "w-8 h-8"}`}
                              >
                                <Package className={`text-blue-600 ${isCourier ? "w-3 h-3" : "w-4 h-4"}`} />
                              </div>
                              <div>
                                <h4 className={`font-semibold text-gray-900 ${isCourier ? "text-sm" : "text-base"}`}>
                                  طلب #{order.order_id}
                                </h4>
                                <p className={`text-gray-600 ${isCourier ? "text-xs" : "text-sm"}`}>
                                  {order.customer_name}
                                </p>
                              </div>
                            </div>
                            <div className={`space-y-${isCourier ? "2" : "3"}`}>
                              <div className="flex items-center gap-3">
                                <div
                                  className={`bg-green-100 rounded flex items-center justify-center ${isCourier ? "w-4 h-4" : "w-6 h-6"}`}
                                >
                                  <User className={`text-green-600 ${isCourier ? "w-2 h-2" : "w-3 h-3"}`} />
                                </div>
                                <span className={`text-gray-600 ${isCourier ? "text-xs" : "text-sm"}`}>العميل:</span>
                                <span className={`font-medium ${isCourier ? "text-xs" : "text-sm"}`}>
                                  {order.customer_name}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div
                                  className={`bg-blue-100 rounded flex items-center justify-center ${isCourier ? "w-4 h-4" : "w-6 h-6"}`}
                                >
                                  <Smartphone className={`text-blue-600 ${isCourier ? "w-2 h-2" : "w-3 h-3"}`} />
                                </div>
                                <span className={`text-gray-600 ${isCourier ? "text-xs" : "text-sm"}`}>الهاتف:</span>
                                <a
                                  href={`tel:${order.mobile_number}`}
                                  className={`text-blue-600 hover:text-blue-800 font-medium transition-colors ${isCourier ? "text-xs" : "text-sm"}`}
                                >
                                  {order.mobile_number}
                                </a>
                              </div>
                              <div className="flex items-start gap-3">
                                <div
                                  className={`bg-red-100 rounded flex items-center justify-center mt-0.5 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`}
                                >
                                  <Package className={`text-red-600 ${isCourier ? "w-2 h-2" : "w-3 h-3"}`} />
                                </div>
                                <span className={`text-gray-600 ${isCourier ? "text-xs" : "text-sm"}`}>العنوان:</span>
                                <span className={`text-gray-800 flex-1 ${isCourier ? "text-xs" : "text-sm"}`}>
                                  {isCourier
                                    ? order.address.length > 50
                                      ? order.address.substring(0, 50) + "..."
                                      : order.address
                                    : order.address}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div
                                  className={`px-3 py-1 rounded-full font-medium ${isCourier ? "text-xs" : "text-xs"} ${
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
                          <div className={`space-y-${isCourier ? "3" : "4"}`}>
                            <div className={`bg-white rounded-lg border border-gray-200 ${isCourier ? "p-3" : "p-4"}`}>
                              <h5
                                className={`font-semibold text-gray-800 mb-3 flex items-center gap-2 ${isCourier ? "text-sm" : "text-base"}`}
                              >
                                <DollarSign className={`${isCourier ? "w-3 h-3" : "w-4 h-4"}`} />
                                {isCourier ? "المالية" : "المعلومات المالية"}
                              </h5>
                              <div className={`space-y-${isCourier ? "2" : "3"}`}>
                                <div className="flex justify-between items-center">
                                  <span className={`text-gray-600 ${isCourier ? "text-xs" : "text-sm"}`}>
                                    {isCourier ? "الطلب:" : translate("orderTotalLabel") + ":"}
                                  </span>
                                  <span className={`font-medium ${isCourier ? "text-xs" : "text-sm"}`}>
                                    {Number(order.total_order_fees).toFixed(0)} {translate("EGP")}
                                  </span>
                                </div>
                                {courierOrderAmount > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span className={`text-gray-600 ${isCourier ? "text-xs" : "text-sm"}`}>
                                      {Number(order.partial_paid_amount || 0) > 0
                                        ? isCourier
                                          ? "جزئي:"
                                          : translate("partialAmountLabel") + ":"
                                        : isCourier
                                          ? "محصل:"
                                          : translate("orderAmountCollectedLabel") + ":"}
                                    </span>
                                    <span
                                      className={`font-semibold text-green-600 ${isCourier ? "text-xs" : "text-sm"}`}
                                    >
                                      {courierOrderAmount.toFixed(0)} {translate("EGP")}
                                    </span>
                                  </div>
                                )}
                                {deliveryFee > 0 && (
                                  <div className="flex justify-between items-center">
                                    <span className={`text-gray-600 ${isCourier ? "text-xs" : "text-sm"}`}>
                                      {isCourier ? "رسوم:" : translate("deliveryFee") + ":"}
                                    </span>
                                    <span
                                      className={`font-semibold text-blue-600 ${isCourier ? "text-xs" : "text-sm"}`}
                                    >
                                      {deliveryFee.toFixed(0)} {translate("EGP")}
                                    </span>
                                  </div>
                                )}
                                {/* Hold Fee Section */}
                                {isAdmin && (
                                  <div className="border-t border-gray-200 pt-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-orange-500" />
                                        {translate("holdFee")}:
                                      </span>
                                      {!editingHoldFee || editingHoldFee !== order.id ? (
                                        <div className="flex items-center gap-2">
                                          {holdFee > 0 ? (
                                            <>
                                              <span className="font-semibold text-orange-600">
                                                -{holdFee.toFixed(2)} {translate("EGP")}
                                              </span>
                                              <button
                                                onClick={() =>
                                                  handleEditHoldFee(order.id, holdFee, order.hold_fee_comment ?? "")
                                                }
                                                className="text-blue-600 hover:text-blue-800 p-1"
                                                disabled={holdFeeLoading}
                                              >
                                                <Edit3 className="w-3 h-3" />
                                              </button>
                                              <button
                                                onClick={() => handleRemoveHoldFee(order.id)}
                                                className="text-red-600 hover:text-red-800 p-1"
                                                disabled={holdFeeLoading}
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              onClick={() => handleEditHoldFee(order.id)}
                                              className="text-green-600 hover:text-green-800 p-1 flex items-center gap-1"
                                              disabled={holdFeeLoading}
                                            >
                                              <Plus className="w-3 h-3" />
                                              <span className="text-xs">{translate("addHoldFee")}</span>
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="number"
                                            value={holdFeeAmount}
                                            onChange={(e) => setHoldFeeAmount(e.target.value)}
                                            placeholder={translate("enterAmount")}
                                            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            disabled={holdFeeLoading}
                                          />
                                          <button
                                            onClick={() => handleSaveHoldFee(order.id)}
                                            className="text-green-600 hover:text-green-800 p-1"
                                            disabled={holdFeeLoading}
                                          >
                                            <Save className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={handleCancelHoldFeeEdit}
                                            className="text-gray-600 hover:text-gray-800 p-1"
                                            disabled={holdFeeLoading}
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    {editingHoldFee === order.id && (
                                      <input
                                        type="text"
                                        value={holdFeeComment}
                                        onChange={(e) => setHoldFeeComment(e.target.value)}
                                        placeholder={translate("enterComment")}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 mt-1"
                                        disabled={holdFeeLoading}
                                      />
                                    )}
                                    {holdFee > 0 && order.hold_fee_comment && (
                                      <p className="text-xs text-gray-600 mt-1 italic">"{order.hold_fee_comment}"</p>
                                    )}
                                  </div>
                                )}
                                {totalCourierAmount !== 0 && (
                                  <div className={`flex justify-between items-center pt-3 border-t border-gray-200`}>
                                    <span
                                      className={`font-semibold text-gray-700 ${isCourier ? "text-xs" : "text-sm"}`}
                                    >
                                      {isCourier ? "الإجمالي:" : translate("totalCourierHandledLabel") + ":"}
                                    </span>
                                    <span
                                      className={`font-bold text-purple-600 ${isCourier ? "text-sm" : "text-base"}`}
                                    >
                                      {totalCourierAmount.toFixed(0)} {translate("EGP")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Payment Information */}
                            <div className={`space-y-${isCourier ? "1" : "2"}`}>
                              <div className="flex items-center gap-2">
                                <span className={`text-gray-600 ${isCourier ? "text-xs" : "text-sm"}`}>
                                  {isCourier ? "الدفع:" : translate("paymentMethod") + ":"}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded font-medium bg-purple-100 text-purple-800 ${isCourier ? "text-xs" : "text-xs"}`}
                                >
                                  {paymentMethodLabel}
                                </span>
                                {isSplit && (
                                  <span className={`ml-2 px-2 py-1 rounded font-medium bg-gray-100 text-gray-800 ${isCourier ? "text-xs" : "text-xs"}`}>
                                    {courierOrderAmount} {translate('EGP')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Comment */}
                        {order.internal_comment && (
                          <div className={`mt-4 pt-4 border-t border-gray-200`}>
                            <div className="flex items-start gap-3">
                              <div
                                className={`bg-gray-100 rounded flex items-center justify-center mt-0.5 ${isCourier ? "w-4 h-4" : "w-6 h-6"}`}
                              >
                                <Package className={`text-gray-600 ${isCourier ? "w-2 h-2" : "w-3 h-3"}`} />
                              </div>
                              <div>
                                <span className={`font-medium text-gray-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                                  {isCourier ? "تعليق:" : translate("comment") + ":"}
                                </span>
                                <p className={`text-gray-600 mt-1 ${isCourier ? "text-xs" : "text-sm"}`}>
                                  {isCourier
                                    ? order.internal_comment.length > 50
                                      ? order.internal_comment.substring(0, 50) + "..."
                                      : order.internal_comment
                                    : order.internal_comment}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Proof Images */}
                        {order.order_proofs && order.order_proofs.length > 0 && (
                          <div className={`mt-4 pt-4 border-t border-gray-200`}>
                            <div className={`flex items-center gap-2 mb-3`}>
                              <div
                                className={`bg-blue-100 rounded flex items-center justify-center ${isCourier ? "w-4 h-4" : "w-6 h-6"}`}
                              >
                                <Eye className={`text-blue-600 ${isCourier ? "w-2 h-2" : "w-3 h-3"}`} />
                              </div>
                              <span className={`font-medium text-gray-700 ${isCourier ? "text-xs" : "text-sm"}`}>
                                {isCourier
                                  ? `صور (${order.order_proofs.length})`
                                  : `${translate("proofImagesLabel")} (${order.order_proofs.length})`}
                              </span>
                            </div>
                            <div className={`grid ${isCourier ? "grid-cols-3 gap-2" : "grid-cols-4 gap-3"}`}>
                              {order.order_proofs.map((proof) => (
                                <img
                                  key={proof.id}
                                  src={proof.image_data || "/placeholder.svg"}
                                  alt="إثبات"
                                  className={`w-full rounded-lg border border-gray-200 object-cover cursor-pointer hover:opacity-75 transition-opacity ${isCourier ? "h-16" : "h-20"}`}
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