"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Edit, Phone, MapPin, Package, DollarSign, Camera, Check, X, Clock, RefreshCw, Truck } from "lucide-react"
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

const statusLabels: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
  assigned: { label: "مكلف", icon: Clock, color: "bg-blue-100 text-blue-800 border-blue-200" },
  delivered: { label: "تم التوصيل", icon: Check, color: "bg-green-100 text-green-800 border-green-200" },
  canceled: { label: "ملغي", icon: X, color: "bg-red-100 text-red-800 border-red-200" },
  partial: { label: "جزئي", icon: Clock, color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  hand_to_hand: {
    label: "استبدال",
    icon: RefreshCw,
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
  return: { label: "مرتجع", icon: Truck, color: "bg-orange-100 text-orange-800 border-orange-200" },
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
    return statusLabels[status] || { label: status, icon: Clock, color: "bg-gray-100 text-gray-800 border-gray-200" }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">جاري تحميل الطلبات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6" dir="rtl">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">طلبياتي</h1>
          <p className="text-gray-600">إدارة طلبات التوصيل</p>
        </div>

        {/* Orders Grid */}
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-gray-600 mb-2">لا توجد طلبات</h3>
            <p className="text-gray-500">تحقق لاحقاً</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => {
              const method = normalizeMethod(order.payment_method)
              const isPaid = ["visa", "valu", "card", "paymob"].includes(method)
              const statusInfo = getStatusInfo(order.status)
              const StatusIcon = statusInfo.icon

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-bold">طلب رقم #{order.order_id}</h3>
                        <p className="text-blue-100 text-sm">العميل: {order.customer_name}</p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.color} bg-white`}
                      >
                        <div className="flex items-center gap-1">
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Amount */}
                    <div className="mb-4 p-4 bg-green-50 rounded-xl border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <span className="text-2xl font-bold text-green-700">
                            {order.total_order_fees.toFixed(2)} ج.م
                          </span>
                        </div>
                        {isPaid && (
                          <span className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                            مدفوع
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        طريقة الدفع:{" "}
                        {paymentSubTypes[order.payment_sub_type ?? ""] ||
                          collectionMethods[normalizeMethod(order.payment_method)] ||
                          order.payment_method}
                      </p>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 mb-1">الهاتف</p>
                          <a
                            href={`tel:${order.mobile_number}`}
                            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                          >
                            {order.mobile_number}
                          </a>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 mb-1">العنوان</p>
                          <p className="text-gray-700 text-sm leading-relaxed">{order.address}</p>
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    {(order.notes ||
                      order.payment_sub_type ||
                      order.collected_by ||
                      order.delivery_fee ||
                      order.partial_paid_amount) && (
                      <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-lg">
                        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                          تفاصيل إضافية
                        </h4>

                        {order.delivery_fee && Number(order.delivery_fee) > 0 && (
                          <div>
                            <span className="text-xs font-semibold text-gray-600">رسوم التوصيل:</span>
                            <p className="text-sm text-gray-700">{Number(order.delivery_fee).toFixed(2)} ج.م</p>
                          </div>
                        )}

                        {order.partial_paid_amount && Number(order.partial_paid_amount) > 0 && (
                          <div>
                            <span className="text-xs font-semibold text-gray-600">المبلغ الجزئي:</span>
                            <p className="text-sm text-gray-700">
                              {Number(order.partial_paid_amount).toFixed(2)} ج.م
                            </p>
                          </div>
                        )}

                        {order.notes && (
                          <div>
                            <span className="text-xs font-semibold text-gray-600">ملاحظات:</span>
                            <p className="text-sm text-gray-700">{order.notes}</p>
                          </div>
                        )}

                        {order.payment_sub_type && (
                          <div>
                            <span className="text-xs font-semibold text-gray-600">نوع الدفع:</span>
                            <p className="text-sm text-gray-700">
                              {paymentSubTypes[order.payment_sub_type] || order.payment_sub_type}
                            </p>
                          </div>
                        )}

                        {order.collected_by && (
                          <div>
                            <span className="text-xs font-semibold text-gray-600">
                              تم التحصيل بواسطة:
                            </span>
                            <p className="text-sm text-gray-700">
                              {collectionMethods[order.collected_by] || order.collected_by}
                            </p>
                          </div>
                        )}

                        {order.internal_comment && (
                          <div>
                            <span className="text-xs font-semibold text-gray-600">تعليق داخلي:</span>
                            <p className="text-sm text-gray-700">{order.internal_comment}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Proof Images */}
                    {order.order_proofs && order.order_proofs.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                          <Camera className="w-4 h-4" />
                          صور الإثبات
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {order.order_proofs.map((proof) => (
                            <img
                              key={proof.id}
                              src={proof.image_data || "/placeholder.svg"}
                              alt="صورة إثبات"
                              className="h-16 w-16 rounded-lg border border-gray-200 object-cover shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                              onClick={() => window.open(proof.image_data, "_blank")}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      onClick={() => openModal(order)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <Edit className="w-5 h-5" />
                      تحديث الطلب
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal */}
        {modalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white rounded-t-3xl">
                <h3 className="text-2xl font-bold">تحديث الطلب رقم #{selectedOrder.order_id}</h3>
                <p className="text-blue-100 mt-1">العميل: {selectedOrder.customer_name}</p>
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
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">حالة الطلب</label>
                    <select
                      value={updateData.status}
                      onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      {Object.entries(statusLabels).map(([key, { label }]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Delivery Fee */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      رسوم التوصيل
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={updateData.delivery_fee}
                        onChange={(e) => setUpdateData({ ...updateData, delivery_fee: e.target.value })}
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="أدخل المبلغ"
                      />
                      <span className="absolute left-3 top-3 text-gray-500">ج.م</span>
                    </div>
                  </div>

                  {/* Collection Fields */}
                  {["partial", "canceled", "delivered", "hand_to_hand", "return"].includes(updateData.status) && (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <h4 className="font-semibold text-blue-800">تفاصيل التحصيل</h4>

                      {/* Collected By */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          تم تحصيل الدفع بواسطة
                        </label>
                        <select
                          value={updateData.collected_by}
                          onChange={(e) => setUpdateData({ ...updateData, collected_by: e.target.value })}
                          className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
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
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            نوع الدفع الفرعي
                          </label>
                          <select
                            value={updateData.payment_sub_type}
                            onChange={(e) => setUpdateData({ ...updateData, payment_sub_type: e.target.value })}
                            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
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
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          المبلغ المدفوع جزئياً
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            value={updateData.partial_paid_amount}
                            onChange={(e) => setUpdateData({ ...updateData, partial_paid_amount: e.target.value })}
                            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="أدخل المبلغ الجزئي"
                          />
                          <span className="absolute left-3 top-3 text-gray-500">ج.م</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Comment */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      التعليق الداخلي
                    </label>
                    <textarea
                      rows={3}
                      value={updateData.internal_comment}
                      onChange={(e) => setUpdateData({ ...updateData, internal_comment: e.target.value })}
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      placeholder="أضف أي ملاحظات أو تعليقات..."
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      رفع صورة إثبات
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                      <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
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
                      <p className="text-xs text-gray-500 mt-2">اضغط لالتقاط صورة</p>
                    </div>
                  </div>

                  {/* Current Images Display */}
                  {selectedOrder.order_proofs && selectedOrder.order_proofs.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        صور الإثبات الحالية
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedOrder.order_proofs.map((proof) => (
                          <img
                            key={proof.id}
                            src={proof.image_data || "/placeholder.svg"}
                            alt="إثبات حالي"
                            className="h-20 w-20 rounded-lg border border-gray-200 object-cover shadow-sm cursor-pointer"
                            onClick={() => window.open(proof.image_data, "_blank")}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="flex-1 px-6 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold transition-colors"
                      disabled={saving}
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          جاري الحفظ...
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
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