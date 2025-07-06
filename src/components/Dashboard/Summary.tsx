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
      loading: "Loading... / جاري التحميل...",
      pleaseLogin: "Please login / يرجى تسجيل الدخول",
      noDataForDate: "No data for this date / لا توجد بيانات لهذا التاريخ",
      todaySummary: "Today's Summary / ملخص اليوم",
      selectDate: "Select Date / اختر التاريخ",
      courier: "Courier / المندوب",
      ordersCount: "orders / طلبات",
      amount: "Amount / المبلغ",
      EGP: "ج.م",

      // Order Status Metrics
      deliveredOrders: "Delivered Orders / الطلبات المسلمة",
      partialOrders: "Partial Orders / الطلبات الجزئية",
      handToHandOrders: "Hand to Hand Orders / الطلبات يد بيد",
      returnOrders: "Return Orders / الطلبات المرتجعة",
      canceledOrders: "Canceled Orders / الطلبات الملغاة",

      // Electronic Payment Methods
      visaOrders: "Visa Orders / طلبات فيزا",
      valuOrders: "ValU Orders / طلبات فاليو",

      // Cash-based Payment Sub-types
      cashOnHandOrders: "Cash on Hand Orders / طلبات نقداً",
      instapayOrders: "Instapay Orders / طلبات إنستاباي",
      walletOrders: "Wallet Orders / طلبات المحفظة",

      // Collection Metrics
      totalCashOnHand: "Total Cash on Hand / إجمالي النقد في اليد",
      totalVisaCollected: "Total Visa Collected / إجمالي فيزا محصل",
      totalValuCollected: "Total ValU Collected / إجمالي فاليو محصل",
      deliveryFeesCollected: "Delivery Fees Collected / رسوم التوصيل المحصلة",
      totalCollected: "Total Collected / إجمالي المحصل",

      orderId: "Order ID / رقم الطلب",
      customer: "Customer / العميل",
      total: "Total / الإجمالي",
      status: "Status / الحالة",
      address: "Address / العنوان",
      phone: "Phone / الهاتف",
      comment: "Comment / تعليق",
      close: "Close / إغلاق",
      paymentMethod: "Payment Method / طريقة الدفع",
      collectedBy: "Collected By / محصل بواسطة",
      partialAmount: "Partial Amount / المبلغ الجزئي",
      deliveryFee: "Delivery Fee / رسوم التوصيل",
      assigned: "Assigned / مكلف",
      delivered: "Delivered / تم التوصيل",
      canceled: "Canceled / ملغي",
      partial: "Partial / جزئي",
      hand_to_hand: "Hand to Hand / استبدال",
      return: "Return / مرتجع",
      cash: "Cash / نقداً",
      visa: "Visa / فيزا",
      valu: "ValU / فاليو",
      courier_payment: "Courier / المندوب",
      on_hand: "Cash on Hand / نقداً",
      instapay: "Instapay / إنستاباي",
      wallet: "Wallet / المحفظة",
    }
    return translations[key] || key
  }

  const [summaryList, setSummaryList] = useState<CourierSummary[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([])
  const [modalTitle, setModalTitle] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])

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
  }, [user, selectedDate])

  const fetchSummary = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      let orders: Order[] = []
      if (user.role === "courier") {
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
      } else {
        const { data: couriers } = await supabase.from("users").select("id, name").eq("role", "courier")
        setSummaryList((couriers ?? []).map((c) => ({ courierId: c.id, courierName: c.name })))
        const allOrdersData = await Promise.all(
          (couriers ?? []).map((courier) =>
            supabase
              .from("orders")
              .select(`
                *,
                order_proofs (id, image_data)
              `)
              .eq("assigned_courier_id", courier.id)
              .gte("updated_at", `${selectedDate}T00:00:00`)
              .lte("updated_at", `${selectedDate}T23:59:59`)
              .then(({ data }) => data ?? []),
          ),
        )
        orders = allOrdersData.flat()
      }
      setAllOrders(orders)
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
    filter: (order: Order, courierId: string) => boolean
    calculateAmount?: (orders: Order[]) => number
  }

  const metrics: Metric[] = [
    // ORDER STATUS METRICS
    {
      label: "deliveredOrders",
      icon: CheckCircle,
      isMoney: true,
      filter: (o, courierId) => o.status === "delivered" && o.assigned_courier_id === courierId,
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "partialOrders",
      icon: Clock,
      isMoney: true,
      filter: (o, courierId) => o.status === "partial" && o.assigned_courier_id === courierId,
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "handToHandOrders",
      icon: HandMetal,
      isMoney: true,
      filter: (o, courierId) => o.status === "hand_to_hand" && o.assigned_courier_id === courierId,
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "returnOrders",
      icon: Truck,
      isMoney: true,
      filter: (o, courierId) => o.status === "return" && o.assigned_courier_id === courierId,
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "canceledOrders",
      icon: XCircle,
      isMoney: true, // Changed to true because canceled orders can have delivery fees
      filter: (o, courierId) => o.status === "canceled" && o.assigned_courier_id === courierId,
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },

    // ELECTRONIC PAYMENT METHODS
    {
      label: "visaOrders",
      icon: CreditCard,
      isMoney: true,
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
      filter: (o, courierId) =>
        o.payment_sub_type === "on_hand" && o.assigned_courier_id === courierId && shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "instapayOrders",
      icon: Smartphone,
      isMoney: true,
      filter: (o, courierId) =>
        o.payment_sub_type === "instapay" && o.assigned_courier_id === courierId && shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "walletOrders",
      icon: Wallet,
      isMoney: true,
      filter: (o, courierId) =>
        o.payment_sub_type === "wallet" && o.assigned_courier_id === courierId && shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },

    // COLLECTION SUMMARY METRICS
    {
      label: "totalCashOnHand",
      icon: DollarSign,
      isMoney: true,
      filter: (o, courierId) =>
        o.payment_sub_type === "on_hand" && o.assigned_courier_id === courierId && shouldIncludeOrder(o),
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + getTotalCourierAmount(o), 0),
    },
    {
      label: "totalVisaCollected",
      icon: CreditCard,
      isMoney: true,
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
      filter: (o, courierId) => Number(o.delivery_fee || 0) > 0 && o.assigned_courier_id === courierId,
      calculateAmount: (orders) => orders.reduce((acc, o) => acc + Number(o.delivery_fee || 0), 0),
    },
    {
      label: "totalCollected",
      icon: CheckCircle,
      isMoney: true,
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

  if (loading) return <div className="p-6 text-center">{translate("loading")}</div>
  if (!user) return <div className="p-6 text-center">{translate("pleaseLogin")}</div>
  if (summaryList.length === 0) return <div className="p-6 text-center">{translate("noDataForDate")}</div>

  const renderMetric = (metric: Metric, courierId: string) => {
    const { count, amount } = calcCountAmount(metric, courierId)

    if (count === 0) return null // Don't show metrics with 0 count

    return (
      <div
        key={metric.label}
        onClick={() => openOrders((o) => metric.filter(o, courierId), translate(metric.label))}
        className="cursor-pointer bg-white hover:bg-gray-50 p-6 rounded-lg shadow-md border border-gray-200 transition-all duration-200 hover:shadow-lg"
        role="button"
        tabIndex={0}
        onKeyPress={(e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter") openOrders((o) => metric.filter(o, courierId), translate(metric.label))
        }}
        aria-label={`${translate(metric.label)}: ${count} ${translate("ordersCount")}${metric.isMoney ? `, ${translate("amount")}: ${amount.toFixed(2)}` : ""}`}
      >
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <p className="text-sm text-gray-600 font-medium mb-1">{translate(metric.label)}</p>
            <p className="text-lg font-bold text-gray-900 mb-2">
              {count} {translate("ordersCount")}
            </p>
            {metric.isMoney && (
              <p className="text-xl font-bold text-green-600">
                {translate("EGP")} {amount.toFixed(2)}
              </p>
            )}
          </div>
          <div className="p-3 bg-blue-50 rounded-full">
            <metric.icon className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 text-left">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">{translate("todaySummary")}</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          dir="ltr"
          aria-label={translate("selectDate")}
        />
      </div>

      {summaryList.map((summary) => (
        <div key={summary.courierId} className="mb-12">
          <h3 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">
            {`${translate("courier")}: ${summary.courierName}`}
          </h3>

          {/* Order Status Section */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-700 mb-4">Order Status / حالة الطلبات</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {metrics
                .slice(0, 5)
                .map((metric) => renderMetric(metric, summary.courierId))
                .filter(Boolean)}
            </div>
          </div>

          {/* Electronic Payment Methods Section */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-700 mb-4">Electronic Payments / المدفوعات الإلكترونية</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
              {metrics
                .slice(5, 7)
                .map((metric) => renderMetric(metric, summary.courierId))
                .filter(Boolean)}
            </div>
          </div>

          {/* Cash-based Payment Methods Section */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-700 mb-4">Cash-based Payments / المدفوعات النقدية</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {metrics
                .slice(7, 10)
                .map((metric) => renderMetric(metric, summary.courierId))
                .filter(Boolean)}
            </div>
          </div>

          {/* Collection Summary Section */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-700 mb-4">Collection Summary / ملخص التحصيل</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {metrics
                .slice(10)
                .map((metric) => renderMetric(metric, summary.courierId))
                .filter(Boolean)}
            </div>
          </div>
        </div>
      ))}

      {selectedOrders.length > 0 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto relative text-left">
            <div className="flex justify-between items-center mb-6">
              <h3 id="modal-title" className="text-2xl font-bold text-gray-900">
                {modalTitle} ({selectedOrders.length} {translate("ordersCount")})
              </h3>
              <button
                onClick={() => setSelectedOrders([])}
                className="text-gray-500 hover:text-red-600 text-2xl font-bold p-2"
                aria-label={translate("close")}
                autoFocus
              >
                ✖
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {selectedOrders.map((order) => {
                const courierOrderAmount = getCourierOrderAmount(order)
                const deliveryFee = Number(order.delivery_fee || 0)
                const totalCourierAmount = getTotalCourierAmount(order)

                return (
                  <div key={order.id} className="border border-gray-200 p-4 rounded-lg bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="font-semibold">
                          <strong>{translate("orderId")}:</strong> #{order.order_id}
                        </p>
                        <p>
                          <strong>{translate("customer")}:</strong> {order.customer_name}
                        </p>
                        <p>
                          <strong>{translate("phone")}:</strong>
                          <a href={`tel:${order.mobile_number}`} className="text-blue-600 hover:underline ml-1">
                            {order.mobile_number}
                          </a>
                        </p>
                        <p>
                          <strong>{translate("status")}:</strong>
                          <span
                            className={`ml-1 px-2 py-1 rounded text-sm ${
                              order.status === "canceled" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {translate(order.status)}
                          </span>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p>
                          <strong>Order Total / إجمالي الطلب:</strong>
                          <span className="text-gray-600 ml-1">
                            {translate("EGP")} {Number(order.total_order_fees).toFixed(2)}
                          </span>
                        </p>

                        {courierOrderAmount > 0 && (
                          <p>
                            <strong>
                              {Number(order.partial_paid_amount || 0) > 0
                                ? "Partial Amount / المبلغ الجزئي:"
                                : "Order Amount Collected / مبلغ الطلب المحصل:"}
                            </strong>
                            <span className="text-green-600 font-semibold ml-1">
                              {translate("EGP")} {courierOrderAmount.toFixed(2)}
                            </span>
                          </p>
                        )}

                        {deliveryFee > 0 && (
                          <p>
                            <strong>{translate("deliveryFee")}:</strong>
                            <span className="text-blue-600 font-semibold ml-1">
                              {translate("EGP")} {deliveryFee.toFixed(2)}
                            </span>
                          </p>
                        )}

                        {totalCourierAmount > 0 && (
                          <p className="border-t pt-2">
                            <strong>Total Courier Handled / إجمالي ما تعامل معه المندوب:</strong>
                            <span className="text-purple-600 font-bold ml-1">
                              {translate("EGP")} {totalCourierAmount.toFixed(2)}
                            </span>
                          </p>
                        )}

                        {order.payment_sub_type && (
                          <p>
                            <strong>Payment Sub-Type / نوع الدفع:</strong>
                            <span className="ml-1 px-2 py-1 rounded text-sm bg-purple-100 text-purple-800">
                              {translate(order.payment_sub_type)}
                            </span>
                          </p>
                        )}

                        {order.collected_by && (
                          <p>
                            <strong>{translate("collectedBy")}:</strong>
                            <span className="ml-1 px-2 py-1 rounded text-sm bg-green-100 text-green-800">
                              {translate(order.collected_by)}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      <p>
                        <strong>{translate("address")}:</strong> {order.address}
                      </p>
                      {order.internal_comment && (
                        <p className="mt-2">
                          <strong>{translate("comment")}:</strong>
                          <span className="italic text-gray-700 ml-1">{order.internal_comment}</span>
                        </p>
                      )}
                    </div>

                    {order.order_proofs && order.order_proofs.length > 0 && (
                      <div className="mt-4">
                        <strong className="block mb-2">Proof Images / صور الإثبات:</strong>
                        <div className="flex flex-wrap gap-2">
                          {order.order_proofs.map((proof) => (
                            <img
                              key={proof.id}
                              src={proof.image_data || "/placeholder.svg"}
                              alt="Proof"
                              className="h-20 w-auto rounded border object-contain"
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
      )}
    </div>
  )
}

export default Summary
