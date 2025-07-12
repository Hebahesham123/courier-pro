"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Edit,
  Phone,
  MapPin,
  Package,
  CoinsIcon,
  Camera,
  Check,
  X,
  Clock,
  RefreshCw,
  Truck,
  MessageCircle,
  Eye,
  AlertCircle,
  Loader2,
  User,
  CreditCard,
  FileText,
  Upload,
  Save,
  XCircle,
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
}

const statusLabels: Record<string, { label: string; icon: React.ComponentType<any>; color: string; bgColor: string }> =
  {
    assigned: {
      label: "مكلف",
      icon: Clock,
      color: "text-blue-700",
      bgColor: "bg-blue-50 border-blue-200",
    },
    delivered: {
      label: "تم التوصيل",
      icon: Check,
      color: "text-green-700",
      bgColor: "bg-green-50 border-green-200",
    },
    canceled: {
      label: "ملغي",
      icon: X,
      color: "text-red-700",
      bgColor: "bg-red-50 border-red-200",
    },
    partial: {
      label: "جزئي",
      icon: Clock,
      color: "text-yellow-700",
      bgColor: "bg-yellow-50 border-yellow-200",
    },
    hand_to_hand: {
      label: "استبدال",
      icon: RefreshCw,
      color: "text-purple-700",
      bgColor: "bg-purple-50 border-purple-200",
    },
    return: {
      label: "مرتجع",
      icon: Truck,
      color: "text-orange-700",
      bgColor: "bg-orange-50 border-orange-200",
    },
  }

const collectionMethods: Record<string, string> = {
  visa: "فيزا",
  valu: "فاليو",
  courier: "المندوب",
}

const paymentSubTypes: Record<string, string> = {
  on_hand: "نقداً",
  instapay: "إنستاباي",
  wallet: "المحفظة",
}

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = "dclsvvfu2"
const CLOUDINARY_UPLOAD_PRESET = "hebaaa"

const OrdersList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [phoneOptionsOpen, setPhoneOptionsOpen] = useState(false)
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>("")
  const [updateData, setUpdateData] = useState({
    status: "",
    delivery_fee: "",
    partial_paid_amount: "",
    internal_comment: "",
    payment_sub_type: "",
    collected_by: "",
  })
  const [imageUploading, setImageUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    if (user?.id) fetchOrders()
  }, [user])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_proofs (id, image_data)
        `)
        .or(`assigned_courier_id.eq.${user?.id},and(payment_method.in.(paymob,paymob.valu),status.eq.assigned)`)
        .order("created_at", { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error("Error fetching orders:", error)
      alert("فشل تحميل الطلبات")
    } finally {
      setLoading(false)
    }
  }

  const normalizeMethod = (method: string) => {
    if (method?.includes("paymob.valu")) return "valu"
    if (method?.includes("paymob")) return "visa"
    return method
  }

  const handlePhoneClick = (phoneNumber: string) => {
    setSelectedPhoneNumber(phoneNumber)
    setPhoneOptionsOpen(true)
  }

  const handlePhoneCall = () => {
    window.location.href = `tel:${selectedPhoneNumber}`
    setPhoneOptionsOpen(false)
  }

  const handleWhatsApp = () => {
    const cleanNumber = selectedPhoneNumber.replace(/\D/g, "")
    const whatsappNumber = cleanNumber.startsWith("20") ? cleanNumber : `20${cleanNumber}`
    window.open(`https://wa.me/${whatsappNumber}`, "_blank")
    setPhoneOptionsOpen(false)
  }

  const openModal = (order: Order) => {
    const method = normalizeMethod(order.payment_method)
    const isPaid = ["visa", "valu", "card", "paymob"].includes(method)
    setSelectedOrder(order)
    setUpdateData({
      status: order.status,
      delivery_fee: order.delivery_fee?.toString() || "",
      partial_paid_amount: order.partial_paid_amount?.toString() || "",
      internal_comment: order.internal_comment || "",
      payment_sub_type: order.payment_sub_type || "",
      collected_by: isPaid ? method : order.collected_by || "",
    })
    setModalOpen(true)
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !selectedOrder || !user) return
    const file = e.target.files[0]
    setImageUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!data.secure_url) throw new Error("فشل رفع الصورة على كلاودينارى")

      const { error } = await supabase.from("order_proofs").insert({
        order_id: selectedOrder.id,
        courier_id: user.id,
        image_data: data.secure_url,
      })
      if (error) throw error

      alert("تم رفع الصورة بنجاح!")
      setSelectedOrder((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          order_proofs: [...(prev.order_proofs || []), { id: crypto.randomUUID(), image_data: data.secure_url }],
        }
      })
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrder.id
            ? {
                ...o,
                order_proofs: [...(o.order_proofs || []), { id: crypto.randomUUID(), image_data: data.secure_url }],
              }
            : o,
        ),
      )
    } catch (error: any) {
      alert("فشل الرفع: " + error.message)
    } finally {
      setImageUploading(false)
    }
  }

  const handleSaveUpdate = async () => {
    if (!selectedOrder) return
    setSaving(true)
    try {
      const method = normalizeMethod(selectedOrder.payment_method)
      const isPaid = ["visa", "valu", "card", "paymob"].includes(method)
      const updatePayload: any = {
        status: updateData.status,
        updated_at: new Date().toISOString(),
      }

      const fee = Number.parseFloat(updateData.delivery_fee)
      updatePayload.delivery_fee = isNaN(fee) ? 0 : fee

      const partial = Number.parseFloat(updateData.partial_paid_amount)
      updatePayload.partial_paid_amount = isNaN(partial) ? 0 : partial

      if (updateData.internal_comment?.trim()) updatePayload.internal_comment = updateData.internal_comment.trim()

      if (["partial", "canceled", "delivered", "hand_to_hand", "return"].includes(updateData.status)) {
        const collected = updateData.collected_by || (isPaid ? method : "")
        if (collected) {
          const allowedCollected = ["visa", "valu", "courier"]
          if (!allowedCollected.includes(collected)) {
            alert("يرجى اختيار طريقة تحصيل صحيحة.")
            return
          }
          updatePayload.collected_by = collected
          if (collected === "courier") {
            if (updateData.payment_sub_type) {
              updatePayload.payment_sub_type = updateData.payment_sub_type
            } else {
              updatePayload.payment_sub_type = null
            }
          } else {
            updatePayload.payment_sub_type = null
          }
        } else {
          updatePayload.collected_by = null
          updatePayload.payment_sub_type = null
        }
      } else {
        updatePayload.collected_by = null
        updatePayload.payment_sub_type = null
      }

      const { error } = await supabase.from("orders").update(updatePayload).eq("id", selectedOrder.id)
      if (error) {
        console.error("Supabase error:", error.message)
        alert("خطأ في الحفظ: " + error.message)
        return
      }

      await fetchOrders()
      setModalOpen(false)
      setSelectedOrder(null)
      alert("تم تحديث الطلب بنجاح!")
    } catch (error: any) {
      alert("خطأ: " + error.message)
    } finally {
      setSaving(false)
    }
  }

  const getStatusInfo = (status: string) => {
    return (
      statusLabels[status] || {
        label: status,
        icon: Clock,
        color: "text-gray-700",
        bgColor: "bg-gray-50 border-gray-200",
      }
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <Package className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-800">جاري تحميل الطلبات</h2>
            <p className="text-gray-600">يرجى الانتظار قليلاً...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">طلبياتي</h1>
              <p className="text-gray-600">إدارة ومتابعة طلبات التوصيل</p>
            </div>
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full border border-blue-200">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium">{orders.length} طلب</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {orders.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <div className="space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-800">لا توجد طلبات متاحة</h3>
                <p className="text-gray-600 max-w-md mx-auto">لم يتم العثور على أي طلبات مخصصة لك في الوقت الحالي</p>
              </div>
              <button
                onClick={fetchOrders}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                تحديث
              </button>
            </div>
          </div>
        ) : (
          /* Orders Grid */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => {
              const method = normalizeMethod(order.payment_method)
              const isPaid = ["visa", "valu", "card", "paymob"].includes(method)
              const statusInfo = getStatusInfo(order.status)
              const StatusIcon = statusInfo.icon

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-gray-900">طلب #{order.order_id}</h3>
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="w-4 h-4" />
                          <span className="text-sm">{order.customer_name}</span>
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.bgColor} ${statusInfo.color}`}
                      >
                        <div className="flex items-center gap-1">
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 space-y-6">
                    {/* Amount Section */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                            <CoinsIcon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-green-700">{order.total_order_fees.toFixed(2)}</p>
                            <p className="text-xs text-green-600">جنيه مصري</p>
                          </div>
                        </div>
                        {isPaid && (
                          <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">مدفوع</span>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <div className="flex items-center gap-2 text-sm text-green-700">
                          <CreditCard className="w-4 h-4" />
                          <span>
                            {paymentSubTypes[order.payment_sub_type ?? ""] ||
                              collectionMethods[normalizeMethod(order.payment_method)] ||
                              order.payment_method}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                      {/* Phone */}
                      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Phone className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">رقم الهاتف</p>
                          <button
                            onClick={() => handlePhoneClick(order.mobile_number)}
                            className="text-blue-700 hover:text-blue-900 font-medium transition-colors truncate block"
                          >
                            {order.mobile_number}
                          </button>
                        </div>
                      </div>

                      {/* Address */}
                      <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <MapPin className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-1">عنوان التوصيل</p>
                          <p className="text-sm text-gray-800 leading-relaxed">{order.address}</p>
                        </div>
                      </div>
                    </div>

                    {/* Additional Information */}
                    {(order.notes ||
                      order.payment_sub_type ||
                      order.collected_by ||
                      order.delivery_fee ||
                      order.partial_paid_amount ||
                      order.internal_comment) && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertCircle className="w-4 h-4 text-gray-600" />
                          <h4 className="text-sm font-medium text-gray-700">معلومات إضافية</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          {order.delivery_fee && Number(order.delivery_fee) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">رسوم التوصيل:</span>
                              <span className="font-medium text-gray-900">
                                {Number(order.delivery_fee).toFixed(2)} ج.م
                              </span>
                            </div>
                          )}
                          {order.partial_paid_amount && Number(order.partial_paid_amount) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">المبلغ الجزئي:</span>
                              <span className="font-medium text-gray-900">
                                {Number(order.partial_paid_amount).toFixed(2)} ج.م
                              </span>
                            </div>
                          )}
                          {order.notes && (
                            <div>
                              <span className="text-gray-600 block mb-1">ملاحظات:</span>
                              <p className="text-gray-800 bg-white p-2 rounded border text-xs">{order.notes}</p>
                            </div>
                          )}
                          {order.internal_comment && (
                            <div>
                              <span className="text-gray-600 block mb-1">تعليق داخلي:</span>
                              <p className="text-gray-800 bg-white p-2 rounded border text-xs">
                                {order.internal_comment}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Proof Images */}
                    {order.order_proofs && order.order_proofs.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Camera className="w-4 h-4 text-gray-600" />
                          <h4 className="text-sm font-medium text-gray-700">
                            صور الإثبات ({order.order_proofs.length})
                          </h4>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {order.order_proofs.map((proof) => (
                            <div key={proof.id} className="relative group">
                              <img
                                src={proof.image_data || "/placeholder.svg"}
                                alt="صورة إثبات"
                                className="w-full h-16 rounded-lg border border-gray-200 object-cover cursor-pointer hover:opacity-75 transition-opacity"
                                onClick={() => window.open(proof.image_data, "_blank")}
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Eye className="w-4 h-4 text-white drop-shadow-lg" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="px-6 pb-6">
                    <button
                      onClick={() => openModal(order)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      تحديث الطلب
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Phone Options Modal */}
        {phoneOptionsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full">
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">اختر طريقة التواصل</h3>
                  <p className="text-gray-600 bg-gray-50 px-3 py-2 rounded-lg font-mono">{selectedPhoneNumber}</p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={handlePhoneCall}
                    className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    مكالمة هاتفية
                  </button>
                  <button
                    onClick={handleWhatsApp}
                    className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    رسالة واتساب
                  </button>
                  <button
                    onClick={() => setPhoneOptionsOpen(false)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Update Order Modal */}
        {modalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
              {/* Modal Header */}
              <div className="bg-blue-600 text-white p-6 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">تحديث الطلب #{selectedOrder.order_id}</h3>
                    <p className="text-blue-100 mt-1">العميل: {selectedOrder.customer_name}</p>
                  </div>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="text-blue-100 hover:text-white transition-colors"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <form
                  className="space-y-6"
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSaveUpdate()
                  }}
                >
                  {/* Status Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      حالة الطلب <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={updateData.status}
                      onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      {Object.entries(statusLabels).map(([key, { label }]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Delivery Fee */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">رسوم التوصيل</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={updateData.delivery_fee}
                        onChange={(e) => setUpdateData({ ...updateData, delivery_fee: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                      <span className="absolute left-3 top-2 text-gray-500 text-sm">ج.م</span>
                    </div>
                  </div>

                  {/* Collection Fields */}
                  {["partial", "canceled", "delivered", "hand_to_hand", "return"].includes(updateData.status) && (
                    <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-800 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        تفاصيل التحصيل
                      </h4>

                      {/* Collected By */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">تم تحصيل الدفع بواسطة</label>
                        <select
                          value={updateData.collected_by}
                          onChange={(e) => setUpdateData({ ...updateData, collected_by: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">اختر الطريقة</option>
                          {Object.entries(collectionMethods).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Payment Sub-Type */}
                      {updateData.collected_by === "courier" && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">نوع الدفع الفرعي</label>
                          <select
                            value={updateData.payment_sub_type}
                            onChange={(e) => setUpdateData({ ...updateData, payment_sub_type: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">اختر النوع</option>
                            {Object.entries(paymentSubTypes).map(([key, label]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Partial Amount */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">المبلغ المدفوع جزئياً</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            value={updateData.partial_paid_amount}
                            onChange={(e) => setUpdateData({ ...updateData, partial_paid_amount: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                          <span className="absolute left-3 top-2 text-gray-500 text-sm">ج.م</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Internal Comment */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      التعليق الداخلي
                    </label>
                    <textarea
                      rows={3}
                      value={updateData.internal_comment}
                      onChange={(e) => setUpdateData({ ...updateData, internal_comment: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="أضف أي ملاحظات أو تعليقات..."
                    />
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      رفع صورة إثبات
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                          {imageUploading ? (
                            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                          ) : (
                            <Camera className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleImageChange}
                            disabled={imageUploading}
                            className="hidden"
                            id="image-upload"
                          />
                          <label
                            htmlFor="image-upload"
                            className={`cursor-pointer text-blue-600 hover:text-blue-700 font-medium ${
                              imageUploading ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                          >
                            {imageUploading ? "جاري رفع الصورة..." : "التقط صورة"}
                          </label>
                          <p className="text-xs text-gray-500 mt-1">اضغط لالتقاط صورة من الكاميرا</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Current Images */}
                  {selectedOrder.order_proofs && selectedOrder.order_proofs.length > 0 && (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">
                        صور الإثبات الحالية ({selectedOrder.order_proofs.length})
                      </label>
                      <div className="grid grid-cols-4 gap-3">
                        {selectedOrder.order_proofs.map((proof) => (
                          <div key={proof.id} className="relative group">
                            <img
                              src={proof.image_data || "/placeholder.svg"}
                              alt="إثبات حالي"
                              className="w-full h-20 rounded-lg border border-gray-200 object-cover cursor-pointer hover:opacity-75 transition-opacity"
                              onClick={() => window.open(proof.image_data, "_blank")}
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye className="w-5 h-5 text-white drop-shadow-lg" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="flex-1 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition-colors"
                      disabled={saving}
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          جاري الحفظ...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          حفظ التغييرات
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrdersList
