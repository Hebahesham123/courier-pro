"use client"
import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  Edit,
  Phone,
  MapPin,
  Package,
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
  CreditCard,
  FileText,
  Upload,
  Save,
  XCircle,
  Calculator,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  HandMetal,
  CheckCircle,
  DollarSign,
  ChevronUp,
  ChevronDown,
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
  payment_status?: string
  payment_sub_type: string | null
  status: string
  partial_paid_amount: number | null
  internal_comment: string | null
  collected_by: string | null
  assigned_courier_id: string | null
  notes?: string | null
  created_at: string
  updated_at: string
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
      label: "مؤجل",
      icon: Truck,
      color: "text-orange-700",
      bgColor: "bg-orange-50 border-orange-200",
    },
    receiving_part: {
      label: "استلام قطعه",
      icon: HandMetal,
      color: "text-indigo-700",
      bgColor: "bg-indigo-50 border-indigo-200",
    },
  }

// Modified collection methods for courier's choice in modal
const collectionMethodsForCourier: Record<string, string> = {
  courier: "المندوب",
}

// Modified payment sub-types for courier's choice in modal
const paymentSubTypesForCourier: Record<string, string> = {
  on_hand: "نقداً",
  instapay: "إنستاباي",
  wallet: "المحفظة",
  visa_machine: "ماكينة فيزا",
}

// Full collection methods for display purposes
const allCollectionMethods: Record<string, string> = {
  paymob: "باي موب",
  valu: "فاليو",
  courier: "المندوب",
  fawry: "فوري",
  instapay: "إنستاباي",
  vodafone_cash: "فودافون كاش",
  orange_cash: "أورانج كاش",
  we_pay: "وي باي",
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
  const [showScrollButtons, setShowScrollButtons] = useState(false)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Helper function to get today's date in YYYY-MM-DD format (local timezone)
  const getTodayDateString = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = (today.getMonth() + 1).toString().padStart(2, "0")
    const day = today.getDate().toString().padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString())
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
  }, [user, selectedDate])

  // Scroll detection and button visibility
  useEffect(() => {
    const checkScrollability = () => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
        const isScrollable = scrollHeight > clientHeight
        const isAtTop = scrollTop <= 10
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10

        setShowScrollButtons(isScrollable)
        setCanScrollUp(!isAtTop && isScrollable)
        setCanScrollDown(!isAtBottom && isScrollable)
      }
    }

    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      checkScrollability()
      scrollContainer.addEventListener("scroll", checkScrollability)
      window.addEventListener("resize", checkScrollability)

      return () => {
        scrollContainer.removeEventListener("scroll", checkScrollability)
        window.removeEventListener("resize", checkScrollability)
      }
    }
  }, [orders])

  // Scroll functions
  const scrollUp = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        top: -window.innerHeight * 0.8,
        behavior: "smooth",
      })
    }
  }

  const scrollDown = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        top: window.innerHeight * 0.8,
        behavior: "smooth",
      })
    }
  }

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    }
  }

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  }

  // Enhanced payment detection function
  const isOrderPaid = (order: Order) => {
    // First check if payment_status is explicitly set
    if (order.payment_status) {
      return order.payment_status === "paid"
    }

    // Fallback to payment method analysis
    const method = order.payment_method?.toLowerCase() || ""

    // Payment gateways and online payments (PAID)
    if (method.includes("paymob") || method.includes("pay mob")) return true
    if (method.includes("valu") || method.includes("val u")) return true
    if (method.includes("fawry")) return true
    if (method.includes("instapay") || method.includes("insta pay")) return true
    if (method.includes("vodafone cash") || method.includes("vodafone-cash")) return true
    if (method.includes("orange cash") || method.includes("orange-cash")) return true
    if (method.includes("we pay") || method.includes("we-pay") || method.includes("wepay")) return true

    // Card payments (PAID)
    if (
      method.includes("visa") ||
      method.includes("mastercard") ||
      method.includes("amex") ||
      method.includes("discover")
    )
      return true
    if (method.includes("card") || method.includes("credit") || method.includes("debit")) return true

    // International payment gateways (PAID)
    if (
      method.includes("paypal") ||
      method.includes("stripe") ||
      method.includes("square") ||
      method.includes("razorpay")
    )
      return true

    // Status-based detection (PAID)
    if (
      method.includes("paid") ||
      method.includes("completed") ||
      method.includes("successful") ||
      method.includes("success")
    )
      return true

    // Cash on delivery and failed payments are NOT paid
    if (method.includes("cash") || method.includes("cod") || method.includes("cash on delivery")) return false
    if (
      method.includes("failed") ||
      method.includes("cancelled") ||
      method.includes("declined") ||
      method.includes("rejected")
    )
      return false

    // If we can't identify it clearly, check if it's not explicitly cash/cod
    // This is a conservative approach - assume paid unless explicitly cash/cod
    return !method.includes("cash") && !method.includes("cod") && method.length > 0
  }

  // Updated normalize method function
  const normalizeMethod = (method: string) => {
    if (!method) return "cash"
    const m = method.toLowerCase()

    if (m.includes("paymob")) {
      if (m.includes("valu")) return "valu"
      return "paymob"
    }
    if (m.includes("valu")) return "valu"
    if (m.includes("fawry")) return "fawry"
    if (m.includes("instapay")) return "instapay"
    if (m.includes("vodafone cash")) return "vodafone_cash"
    if (m.includes("orange cash")) return "orange_cash"
    if (m.includes("we pay")) return "we_pay"

    // All card payments (visa, mastercard, etc.) should be categorized as paymob
    if (
      m.includes("visa") ||
      m.includes("mastercard") ||
      m.includes("card") ||
      m.includes("credit") ||
      m.includes("debit")
    )
      return "paymob"

    if (m.includes("cash") || m.includes("cod")) return "cash"

    return method
  }

  // Helper function to format date in Arabic
  const formatDateInArabic = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "اليوم"
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "أمس"
    }

    const arabicDays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    const arabicMonths = [
      "يناير",
      "فبراير",
      "مارس",
      "أبريل",
      "مايو",
      "يونيو",
      "يوليو",
      "أغسطس",
      "سبتمبر",
      "أكتوبر",
      "نوفمبر",
      "ديسمبر",
    ]

    const dayName = arabicDays[date.getDay()]
    const day = date.getDate()
    const month = arabicMonths[date.getMonth()]
    const year = date.getFullYear()

    return `${dayName} ${day} ${month} ${year}`
  }

  // Helper function to format time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  // Navigation functions
  const goToPreviousDay = () => {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() - 1)
    setSelectedDate(currentDate.toISOString().split("T")[0])
  }

  const goToNextDay = () => {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() + 1)
    setSelectedDate(currentDate.toISOString().split("T")[0])
  }

  const goToToday = () => {
    setSelectedDate(getTodayDateString())
  }

  // Helper function to check if order was edited by courier
  const wasOrderEditedByCourier = (order: Order) => {
    return order.updated_at !== order.created_at
  }

  // Helper function to extract numeric part from order_id for sorting
  const getOrderNumber = (orderId: string) => {
    const match = orderId.match(/\d+/)
    return match ? Number.parseInt(match[0], 10) : 0
  }

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const startDate = new Date(selectedDate)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(selectedDate)
      endDate.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          order_proofs (id, image_data)
        `,
        )
        .or(`assigned_courier_id.eq.${user?.id},and(payment_method.in.(paymob,paymob.valu),status.eq.assigned)`)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false })

      if (error) throw error

      // Sort by order number (numeric part of order_id)
      const sortedData = (data || []).sort((a, b) => {
        const isAEdited = wasOrderEditedByCourier(a)
        const isBEdited = wasOrderEditedByCourier(b)
        const isAAssigned = a.status === "assigned"
        const isBAssigned = b.status === "assigned"

        // First priority: edited orders go to bottom
        if (isAEdited && !isBEdited) return 1
        if (!isAEdited && isBEdited) return -1

        // Second priority: assigned orders go to top (among non-edited)
        if (!isAEdited && !isBEdited) {
          if (isAAssigned && !isBAssigned) return -1
          if (!isAAssigned && isBAssigned) return 1
        }

        // Third priority: sort by order number (ascending - lowest numbers first)
        const orderNumA = getOrderNumber(a.order_id)
        const orderNumB = getOrderNumber(b.order_id)
        return orderNumA - orderNumB
      })

      setOrders(sortedData)
    } catch (error) {
      console.error("Error fetching orders:", error)
      alert("فشل تحميل الطلبات")
    } finally {
      setLoading(false)
    }
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
    const isOrderOriginallyPaidOnline = isOrderPaid(order)

    let initialDeliveryFee = order.delivery_fee?.toString() || ""
    let initialPartialPaidAmount = order.partial_paid_amount?.toString() || ""
    let initialCollectedBy = order.collected_by || ""
    let initialPaymentSubType = order.payment_sub_type || ""

    if (
      order.status === "return" ||
      (order.status === "receiving_part" && !order.delivery_fee && !order.partial_paid_amount)
    ) {
      initialDeliveryFee = "0"
      initialPartialPaidAmount = "0"
      initialCollectedBy = ""
      initialPaymentSubType = ""
    } else if (isOrderOriginallyPaidOnline && !order.delivery_fee && !order.partial_paid_amount) {
      initialCollectedBy = method
      initialPaymentSubType = ""
    } else if (!isOrderOriginallyPaidOnline && !isOrderPaid(order) && order.status !== "canceled") {
      initialCollectedBy = "courier"
    } else if (order.status === "canceled" && (order.delivery_fee || order.partial_paid_amount)) {
      initialCollectedBy = "courier"
    } else if (order.status === "canceled" && !order.delivery_fee && !order.partial_paid_amount) {
      initialCollectedBy = ""
      initialPaymentSubType = ""
    }

    setSelectedOrder(order)
    setUpdateData({
      status: order.status,
      delivery_fee: initialDeliveryFee,
      partial_paid_amount: initialPartialPaidAmount,
      internal_comment: order.internal_comment || "",
      collected_by: initialCollectedBy,
      payment_sub_type: initialPaymentSubType,
    })
    setModalOpen(true)
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !selectedOrder || !user) return

    const originalFile = e.target.files[0]
    setImageUploading(true)

    try {
      const compressedFile = await new Promise<File>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (event) => {
          const img = new Image()
          img.crossOrigin = "anonymous"
          img.onload = () => {
            const canvas = document.createElement("canvas")
            const MAX_WIDTH = 720
            const MAX_HEIGHT = 540

            let width = img.width
            let height = img.height

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width
                width = MAX_WIDTH
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height
                height = MAX_HEIGHT
              }
            }

            canvas.width = width
            canvas.height = height

            const ctx = canvas.getContext("2d")
            if (!ctx) {
              reject(new Error("Failed to get canvas context"))
              return
            }

            ctx.drawImage(img, 0, 0, width, height)

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(new File([blob], originalFile.name, { type: "image/jpeg", lastModified: Date.now() }))
                } else {
                  resolve(originalFile)
                }
              },
              "image/jpeg",
              0.5,
            )
          }
          img.onerror = (err) => {
            reject(new Error("Failed to load image for compression"))
          }
          img.src = event.target?.result as string
        }
        reader.onerror = (err) => {
          reject(new Error("Failed to read file"))
        }
        reader.readAsDataURL(originalFile)
      })

      const formData = new FormData()
      formData.append("file", compressedFile)
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

  const calculateTotalAmount = (order: Order, deliveryFee: number, partialAmount: number, currentStatus: string) => {
    if (currentStatus === "hand_to_hand" && deliveryFee === 0 && partialAmount === 0) {
      return 0
    }

    if (["canceled", "return", "hand_to_hand", "receiving_part"].includes(currentStatus)) {
      if (deliveryFee === 0 && partialAmount === 0) {
        return 0
      }
      return deliveryFee + partialAmount
    }

    if (currentStatus === "partial") {
      return partialAmount > 0 ? partialAmount : 0
    }

    return order.total_order_fees
  }

  const handleSaveUpdate = async () => {
    if (!selectedOrder) return

    setSaving(true)
    try {
      const method = normalizeMethod(selectedOrder.payment_method)
      const isOrderOriginallyPaidOnline = isOrderPaid(selectedOrder)
      const isOrderUnpaid = !isOrderPaid(selectedOrder)

      const updatePayload: any = {
        status: updateData.status,
        updated_at: new Date().toISOString(),
      }

      let fee = Number.parseFloat(updateData.delivery_fee) || 0
      let partial = Number.parseFloat(updateData.partial_paid_amount) || 0

      const isReturnStatus = updateData.status === "return"
      const isReceivingPartWithNoFees = updateData.status === "receiving_part" && fee === 0 && partial === 0
      const isHandToHandWithNoFees = updateData.status === "hand_to_hand" && fee === 0 && partial === 0
      const isCanceledWithNoFees = updateData.status === "canceled" && fee === 0 && partial === 0

      if (isReturnStatus || isReceivingPartWithNoFees || isCanceledWithNoFees) {
        fee = 0
        partial = 0
        updatePayload.collected_by = null
        updatePayload.payment_sub_type = null
      }

      updatePayload.delivery_fee = fee
      updatePayload.partial_paid_amount = partial

      if (updateData.internal_comment?.trim()) {
        updatePayload.internal_comment = updateData.internal_comment.trim()
      }

      if (
        ["partial", "canceled", "delivered", "hand_to_hand", "return", "receiving_part"].includes(updateData.status)
      ) {
        if (isReturnStatus || isReceivingPartWithNoFees || isCanceledWithNoFees) {
          // Already handled above
        } else if (isHandToHandWithNoFees) {
          updatePayload.collected_by = null
          updatePayload.payment_sub_type = null
        } else if (isOrderOriginallyPaidOnline) {
          if (fee > 0 || partial > 0) {
            if (!updateData.collected_by) {
              alert("يرجى اختيار طريقة تحصيل للرسوم الإضافية.")
              return
            }
            if (updateData.collected_by === "courier" && !updateData.payment_sub_type) {
              alert("يرجى اختيار نوع الدفع الفرعي للمندوب للرسوم الإضافية.")
              return
            }
            updatePayload.collected_by = updateData.collected_by
            updatePayload.payment_sub_type = updateData.payment_sub_type
          } else {
            updatePayload.collected_by = method
            updatePayload.payment_sub_type = null
          }
        } else if (updateData.status === "canceled" && fee > 0) {
          if (!updateData.payment_sub_type) {
            alert("يرجى اختيار نوع الدفع الفرعي للمندوب عند إضافة رسوم التوصيل لطلب ملغي.")
            return
          }
          updatePayload.collected_by = "courier"
          updatePayload.payment_sub_type = updateData.payment_sub_type
        } else if (isOrderUnpaid) {
          if (updateData.payment_sub_type) {
            updatePayload.collected_by = "courier"
            updatePayload.payment_sub_type = updateData.payment_sub_type
          } else {
            updatePayload.collected_by = null
            updatePayload.payment_sub_type = null
          }
        } else if (fee > 0 || partial > 0) {
          const collected = updateData.collected_by
          if (!collected) {
            alert("يرجى اختيار طريقة تحصيل عند إضافة رسوم التوصيل.")
            return
          }
          if (collected === "courier") {
            if (!updateData.payment_sub_type) {
              alert("يرجى اختيار نوع الدفع الفرعي للمندوب.")
              return
            }
            updatePayload.collected_by = collected
            updatePayload.payment_sub_type = updateData.payment_sub_type
          } else {
            updatePayload.collected_by = collected
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

  const canEditOrder = (order: Order) => {
    return order.assigned_courier_id === user?.id || order.status === "assigned"
  }

  // Helper function to get display payment method
  const getDisplayPaymentMethod = (order: Order) => {
    const method = normalizeMethod(order.payment_method)

    // If collected_by and payment_sub_type are set, prioritize them for display
    if (order.collected_by && allCollectionMethods[order.collected_by]) {
      if (
        order.collected_by === "courier" &&
        order.payment_sub_type &&
        paymentSubTypesForCourier[order.payment_sub_type]
      ) {
        return paymentSubTypesForCourier[order.payment_sub_type]
      }

      // If collected_by is set but no sub-type (e.g., for online payments or non-courier collection)
      if (order.collected_by === "valu") return `${allCollectionMethods.valu} (مدفوع)`
      if (order.collected_by === "paymob") return `${allCollectionMethods.paymob} (مدفوع)`
      if (order.collected_by === "fawry") return `${allCollectionMethods.fawry} (مدفوع)`
      if (order.collected_by === "instapay") return `${allCollectionMethods.instapay} (مدفوع)`
      if (order.collected_by === "vodafone_cash") return `${allCollectionMethods.vodafone_cash} (مدفوع)`
      if (order.collected_by === "orange_cash") return `${allCollectionMethods.orange_cash} (مدفوع)`
      if (order.collected_by === "we_pay") return `${allCollectionMethods.we_pay} (مدفوع)`

      return allCollectionMethods[order.collected_by]
    }

    // Fallback to original payment method if no collected_by is set
    if (method === "valu") {
      return `${allCollectionMethods.valu} (مدفوع)`
    }
    if (method === "paymob") {
      return `${allCollectionMethods.paymob} (مدفوع)`
    }
    if (method === "fawry") {
      return `${allCollectionMethods.fawry} (مدفوع)`
    }
    if (method === "instapay") {
      return `${allCollectionMethods.instapay} (مدفوع)`
    }
    if (method === "vodafone_cash") {
      return `${allCollectionMethods.vodafone_cash} (مدفوع)`
    }
    if (method === "orange_cash") {
      return `${allCollectionMethods.orange_cash} (مدفوع)`
    }
    if (method === "we_pay") {
      return `${allCollectionMethods.we_pay} (مدفوع)`
    }

    return order.payment_method === "cash_on_delivery" ? "الدفع عند الاستلام" : order.payment_method
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
    <div className="min-h-screen bg-gray-50 relative" dir="rtl" ref={scrollContainerRef}>
      {/* Scroll Buttons */}
      {showScrollButtons && (
        <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-40 flex flex-col gap-2">
          {/* Scroll Up Button */}
          <button
            onClick={scrollUp}
            disabled={!canScrollUp}
            className={`p-3 rounded-full shadow-lg transition-all duration-200 ${
              canScrollUp
                ? "bg-blue-600 hover:bg-blue-700 text-white hover:scale-110"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            title="التمرير لأعلى"
          >
            <ChevronUp className="w-5 h-5" />
          </button>

          {/* Scroll to Top Button */}
          <button
            onClick={scrollToTop}
            disabled={!canScrollUp}
            className={`p-2 rounded-full shadow-lg transition-all duration-200 ${
              canScrollUp
                ? "bg-green-600 hover:bg-green-700 text-white hover:scale-110"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            title="الذهاب للأعلى"
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          {/* Scroll to Bottom Button */}
          <button
            onClick={scrollToBottom}
            disabled={!canScrollDown}
            className={`p-2 rounded-full shadow-lg transition-all duration-200 ${
              canScrollDown
                ? "bg-green-600 hover:bg-green-700 text-white hover:scale-110"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            title="الذهاب للأسفل"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* Scroll Down Button */}
          <button
            onClick={scrollDown}
            disabled={!canScrollDown}
            className={`p-3 rounded-full shadow-lg transition-all duration-200 ${
              canScrollDown
                ? "bg-blue-600 hover:bg-blue-700 text-white hover:scale-110"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            title="التمرير لأسفل"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 rounded-xl">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">طلبياتي</h1>
              <p className="text-xs sm:text-sm text-gray-600">إدارة ومتابعة طلبات التوصيل</p>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={goToPreviousDay}
                className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs transition-colors"
              >
                <ChevronRight className="w-3 h-3" />
                <span className="hidden sm:inline">السابق</span>
              </button>

              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1.5 rounded-lg border border-blue-200 text-xs">
                  <Calendar className="w-3 h-3" />
                  <span className="font-medium text-xs">{formatDateInArabic(selectedDate)}</span>
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-1.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-xs w-24"
                  title="اختر تاريخ"
                />
              </div>

              <button
                onClick={goToNextDay}
                className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs transition-colors"
              >
                <span className="hidden sm:inline">التالي</span>
                <ChevronLeft className="w-3 h-3" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-center gap-2 mt-3">
              <button
                onClick={goToToday}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs"
              >
                <CalendarDays className="w-3 h-3" />
                اليوم
              </button>
              <button
                onClick={fetchOrders}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs"
              >
                <RefreshCw className="w-3 h-3" />
                تحديث
              </button>
            </div>

            <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200 mt-3">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span className="text-xs font-medium">
                {orders.length} {orders.length === 1 ? "طلب" : "طلب"}
                {selectedDate === getTodayDateString() ? " اليوم" : ` في ${formatDateInArabic(selectedDate)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 py-4 sm:px-6 lg:px-8">
        {orders.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  لا توجد طلبات{" "}
                  {selectedDate === getTodayDateString() ? "اليوم" : `في ${formatDateInArabic(selectedDate)}`}
                </h3>
                <p className="text-gray-600 max-w-xs mx-auto text-sm">
                  لم يتم العثور على أي طلبات مخصصة لك في هذا التاريخ
                </p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={goToToday}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  عرض طلبات اليوم
                </button>
                <button
                  onClick={fetchOrders}
                  className="inline-flex items-center gap-1.5 bg-gray-600 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  تحديث
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Orders Grid - Updated for mobile-friendly 2 columns
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
            {orders.map((order) => {
              const statusInfo = getStatusInfo(order.status)
              const StatusIcon = statusInfo.icon
              const deliveryFee = order.delivery_fee || 0
              const partialAmount = order.partial_paid_amount || 0
              const totalAmount = calculateTotalAmount(order, deliveryFee, partialAmount, order.status)
              const isPaid = isOrderPaid(order)
              const isEditedOrder = wasOrderEditedByCourier(order)

              return (
                <div
                  key={order.id}
                  className={`relative bg-white rounded-xl shadow-sm hover:shadow-lg transition-all border overflow-hidden ${
                    isEditedOrder ? "border-red-400 bg-red-100 shadow-red-200" : "border-gray-200"
                  }`}
                >
                  {/* Diagonal Slashes and Completion Overlay for Edited Orders */}
                  {isEditedOrder && (
                    <>
                      {/* Diagonal Slash Pattern */}
                      <div className="absolute inset-0 pointer-events-none z-10">
                        {/* Main diagonal lines */}
                        <div className="absolute inset-0">
                          {[...Array(8)].map((_, i) => (
                            <div
                              key={`slash-${i}`}
                              className="absolute bg-red-400 opacity-30"
                              style={{
                                width: "2px",
                                height: "200%",
                                left: `${i * 15}%`,
                                top: "-50%",
                                transform: "rotate(45deg)",
                                transformOrigin: "center",
                              }}
                            />
                          ))}
                        </div>
                        {/* Cross diagonal lines */}
                        <div className="absolute inset-0">
                          {[...Array(8)].map((_, i) => (
                            <div
                              key={`cross-slash-${i}`}
                              className="absolute bg-red-400 opacity-30"
                              style={{
                                width: "2px",
                                height: "200%",
                                left: `${i * 15}%`,
                                top: "-50%",
                                transform: "rotate(-45deg)",
                                transformOrigin: "center",
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      {/* Completion Badge */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <div
                          className="bg-red-600 text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg transform rotate-12"
                          style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}
                        >
                          مكتمل ✓
                        </div>
                      </div>
                    </>
                  )}

                  {/* Card Header */}
                  <div
                    className={`px-3 py-2 border-b ${
                      isEditedOrder ? "border-red-300 bg-red-200" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-gray-900 truncate">#{order.order_id}</h3>
                        <p className="text-xs text-gray-600 mt-1">{formatTime(order.created_at)}</p>
                      </div>
                      <div className="flex flex-col gap-1 ml-2">
                        {/* Payment Status Indicator */}
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            isPaid
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span>مدفوع</span>
                            </>
                          ) : (
                            <>
                              <DollarSign className="w-3 h-3" />
                              <span>غير مدفوع</span>
                            </>
                          )}
                        </div>
                        {/* Status Badge */}
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.bgColor} ${statusInfo.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusInfo.label}</span>
                        </div>
                        {/* Edited Badge */}
                        {isEditedOrder && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-600 text-white border border-red-700">
                            <Check className="w-3 h-3" />
                            <span>تم التعديل</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-3 space-y-3">
                    {/* Customer Name */}
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900 truncate" title={order.customer_name}>
                        {order.customer_name}
                      </p>
                    </div>

                    {/* Address - Full display without truncation */}
                    <div
                      className={`flex items-start gap-2 border rounded-lg p-2 ${
                        isEditedOrder ? "bg-red-50 border-red-300" : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-700 leading-relaxed break-words" title={order.address}>
                        {order.address}
                      </p>
                    </div>

                    {/* Amount */}
                    <div
                      className={`border rounded-lg p-2 text-center ${
                        isEditedOrder ? "bg-red-50 border-red-300" : "bg-green-50 border-green-200"
                      }`}
                    >
                      <p className={`text-sm font-bold ${isEditedOrder ? "text-red-700" : "text-green-700"}`}>
                        {totalAmount.toFixed(0)}
                      </p>
                      <p className={`text-xs ${isEditedOrder ? "text-red-600" : "text-green-600"}`}>ج.م</p>
                    </div>

                    {/* Phone Button */}
                    <button
                      onClick={() => handlePhoneClick(order.mobile_number)}
                      className={`w-full border py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
                        isEditedOrder
                          ? "bg-red-50 hover:bg-red-100 border-red-300 text-red-700"
                          : "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                      }`}
                    >
                      <Phone className="w-4 h-4" />
                      <span className="font-mono text-sm truncate">{order.mobile_number}</span>
                    </button>

                    {/* Payment Method Display */}
                    <div
                      className={`border rounded-lg p-2 text-center text-sm ${
                        isEditedOrder ? "bg-red-50 border-red-300" : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <p className={`font-medium truncate ${isEditedOrder ? "text-red-700" : "text-gray-700"}`}>
                        {getDisplayPaymentMethod(order)}
                      </p>
                    </div>

                    {/* Notes Display */}
                    {order.notes && (
                      <div
                        className={`border rounded-lg p-2 text-sm ${
                          isEditedOrder ? "bg-red-50 border-red-300" : "bg-yellow-50 border-yellow-200"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <p
                            className={`text-sm leading-relaxed break-words ${
                              isEditedOrder ? "text-red-700" : "text-yellow-700"
                            }`}
                            title={order.notes}
                          >
                            {order.notes}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Edit Button */}
                    {canEditOrder(order) ? (
                      <button
                        onClick={() => openModal(order)}
                        className={`w-full font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm ${
                          isEditedOrder
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        <Edit className="w-4 h-4" />
                        <span>تحديث</span>
                      </button>
                    ) : (
                      <div className="w-full bg-gray-100 text-gray-500 font-medium py-2 px-3 rounded-lg text-center text-sm">
                        مكتمل
                      </div>
                    )}
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

        {/* Update Order Modal - keeping the same as before */}
        {modalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
              {/* Modal Header */}
              <div className="bg-blue-600 text-white p-6 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">تحديث الطلب #{selectedOrder.order_id}</h3>
                    <p className="text-blue-100 mt-1">العميل: {selectedOrder.customer_name}</p>
                    <p className="text-blue-100 text-sm mt-1">وقت الطلب: {formatTime(selectedOrder.created_at)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <MapPin className="w-4 h-4 text-blue-200" />
                      <p className="text-blue-100 text-sm">{selectedOrder.address}</p>
                    </div>
                    {/* Notes Display in Modal Header */}
                    {selectedOrder.notes && (
                      <div className="flex items-start gap-2 mt-3 p-2 bg-blue-500 rounded-lg">
                        <FileText className="w-4 h-4 text-blue-200 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-blue-100 text-xs font-medium mb-1">ملاحظات الإدارة:</p>
                          <p className="text-blue-100 text-sm leading-relaxed">{selectedOrder.notes}</p>
                        </div>
                      </div>
                    )}
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
                  {/* Order Summary */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator className="w-4 h-4 text-gray-600" />
                      <h4 className="text-sm font-medium text-gray-700">ملخص الطلب</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">قيمة الطلب الأساسية:</span>
                        <span className="font-medium text-gray-900">
                          {selectedOrder.total_order_fees.toFixed(2)} ج.م
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">رسوم التوصيل (منفصلة):</span>
                        <span className="font-medium text-amber-600">{updateData.delivery_fee || "0.00"} ج.م</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">مبلغ جزئي (منفصل):</span>
                        <span className="font-medium text-amber-600">
                          {updateData.partial_paid_amount || "0.00"} ج.م
                        </span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-medium">
                        <span className="text-gray-700">
                          {updateData.status === "partial"
                            ? "المبلغ المحصل:"
                            : ["canceled", "return", "hand_to_hand", "receiving_part"].includes(updateData.status)
                              ? "إجمالي الرسوم:"
                              : "إجمالي الطلب:"}
                        </span>
                        <span className="text-green-600">
                          {calculateTotalAmount(
                            selectedOrder,
                            Number.parseFloat(updateData.delivery_fee) || 0,
                            Number.parseFloat(updateData.partial_paid_amount) || 0,
                            updateData.status,
                          ).toFixed(2)}{" "}
                          ج.م
                        </span>
                      </div>
                      <div className="bg-blue-50 p-2 rounded text-xs text-blue-700">
                        <strong>ملاحظة:</strong> الرسوم منفصلة عن قيمة الطلب الأساسية ولا تُضاف إليها
                      </div>
                    </div>
                  </div>

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
                        disabled={
                          updateData.status === "return" ||
                          (updateData.status === "receiving_part" &&
                            Number.parseFloat(updateData.partial_paid_amount) === 0)
                        }
                        placeholder="0.00"
                      />
                      <span className="absolute left-3 top-2 text-gray-500 text-sm">ج.م</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      رسوم التوصيل منفصلة تماماً عن قيمة الطلب الأساسية ولا تُضاف إليها
                    </p>
                  </div>

                  {/* Collection Fields */}
                  {["partial", "canceled", "delivered", "hand_to_hand", "return", "receiving_part"].includes(
                    updateData.status,
                  ) && (
                    <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-800 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        تفاصيل التحصيل
                      </h4>
                      {(() => {
                        const currentMethod = normalizeMethod(selectedOrder.payment_method)
                        const isOrderOriginallyPaidOnline = isOrderPaid(selectedOrder)
                        const isOrderUnpaid = !isOrderPaid(selectedOrder)
                        const currentFee = Number.parseFloat(updateData.delivery_fee) || 0
                        const currentPartial = Number.parseFloat(updateData.partial_paid_amount) || 0
                        const isReturnStatus = updateData.status === "return"
                        const isReceivingPartWithNoFees =
                          updateData.status === "receiving_part" && currentFee === 0 && currentPartial === 0
                        const isHandToHandWithNoFees =
                          updateData.status === "hand_to_hand" && currentFee === 0 && currentPartial === 0
                        const isCanceledWithNoFees =
                          updateData.status === "canceled" && currentFee === 0 && currentPartial === 0

                        // Condition for the "Order Paid" message
                        const showOrderPaidMessage =
                          isOrderOriginallyPaidOnline && currentFee === 0 && currentPartial === 0

                        // Condition for the "Order Unpaid" message
                        const showOrderUnpaidMessage =
                          isOrderUnpaid &&
                          !isReturnStatus &&
                          !isHandToHandWithNoFees &&
                          !isReceivingPartWithNoFees &&
                          !isCanceledWithNoFees

                        // Condition for "Return Status" message
                        const showReturnStatusMessage = isReturnStatus

                        // Condition for "Receiving Part No Fees" message
                        const showReceivingPartNoFeesMessage = isReceivingPartWithNoFees

                        // Condition for "Hand to Hand No Fees" message
                        const showHandToHandNoFeesMessage = isHandToHandWithNoFees

                        // Condition for "Canceled No Fees" message
                        const showCanceledNoFeesMessage = isCanceledWithNoFees

                        // Condition to show Payment Sub-Type dropdown
                        const showPaymentSubTypeDropdown =
                          !isReturnStatus &&
                          !isHandToHandWithNoFees &&
                          !isReceivingPartWithNoFees &&
                          !isCanceledWithNoFees &&
                          ((isOrderOriginallyPaidOnline && (currentFee > 0 || currentPartial > 0)) ||
                            isOrderUnpaid ||
                            (updateData.status === "canceled" && currentFee > 0) ||
                            (updateData.status === "receiving_part" && (currentFee > 0 || currentPartial > 0)))

                        // Condition to show Collected By dropdown
                        const showCollectedByDropdown =
                          !isReturnStatus &&
                          !isHandToHandWithNoFees &&
                          !isReceivingPartWithNoFees &&
                          !isCanceledWithNoFees &&
                          (currentFee > 0 || currentPartial > 0) &&
                          (isOrderOriginallyPaidOnline ||
                            (!isOrderOriginallyPaidOnline && !isOrderUnpaid && updateData.status !== "canceled"))

                        return (
                          <>
                            {showOrderPaidMessage && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-green-700">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-sm font-medium">طلب مدفوع</span>
                                </div>
                                <p className="text-xs text-green-600 mt-1">
                                  هذا الطلب مدفوع بالفعل عبر {allCollectionMethods[currentMethod] || currentMethod}.
                                  طريقة التحصيل لا يمكن تغييرها.
                                </p>
                              </div>
                            )}

                            {showReturnStatusMessage && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-yellow-700">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-sm font-medium">طلب مؤجل</span>
                                </div>
                                <p className="text-xs text-yellow-600 mt-1">
                                  الطلبات المؤجلة لا تتطلب تحصيل رسوم. سيتم حساب الإجمالي كصفر.
                                </p>
                              </div>
                            )}

                            {showReceivingPartNoFeesMessage && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-yellow-700">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-sm font-medium">استلام قطعة بدون رسوم</span>
                                </div>
                                <p className="text-xs text-yellow-600 mt-1">
                                  لا يتطلب اختيار طريقة دفع عند عدم وجود رسوم توصيل أو مبلغ جزئي.
                                </p>
                              </div>
                            )}

                            {showHandToHandNoFeesMessage && (
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-purple-700">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-sm font-medium">استبدال بدون رسوم</span>
                                </div>
                                <p className="text-xs text-purple-600 mt-1">
                                  لا يتطلب اختيار طريقة دفع عند عدم وجود رسوم توصيل أو مبلغ جزئي.
                                </p>
                              </div>
                            )}

                            {showCanceledNoFeesMessage && (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-gray-700">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-sm font-medium">طلب ملغي بدون رسوم</span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  الطلبات الملغاة بدون رسوم سيتم حساب إجماليها كصفر تلقائياً.
                                </p>
                              </div>
                            )}

                            {showOrderUnpaidMessage && (
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-orange-700">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-sm font-medium">طلب غير مدفوع</span>
                                </div>
                                <p className="text-xs text-orange-600 mt-1">
                                  يمكن للمندوب اختيار طريقة الدفع المناسبة لهذا الطلب.
                                </p>
                              </div>
                            )}

                            {showPaymentSubTypeDropdown && (
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  طريقة الدفع {isOrderUnpaid ? "(للطلب غير المدفوع)" : "(نوع الدفع الفرعي)"}
                                </label>
                                <select
                                  value={updateData.payment_sub_type}
                                  onChange={(e) => setUpdateData({ ...updateData, payment_sub_type: e.target.value })}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  required={
                                    showPaymentSubTypeDropdown &&
                                    (isOrderUnpaid ||
                                      updateData.collected_by === "courier" ||
                                      (updateData.status === "canceled" && currentFee > 0) ||
                                      (updateData.status === "receiving_part" &&
                                        (currentFee > 0 || currentPartial > 0)))
                                  }
                                >
                                  <option value="">اختر طريقة الدفع</option>
                                  {Object.entries(paymentSubTypesForCourier).map(([key, label]) => (
                                    <option key={key} value={key}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {showCollectedByDropdown && (
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">تم تحصيل الدفع بواسطة</label>
                                <select
                                  value={updateData.collected_by}
                                  onChange={(e) => setUpdateData({ ...updateData, collected_by: e.target.value })}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  required={showCollectedByDropdown}
                                >
                                  <option value="">اختر الطريقة</option>
                                  {Object.entries(collectionMethodsForCourier).map(([key, label]) => (
                                    <option key={key} value={key}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </>
                        )
                      })()}

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
                            disabled={
                              updateData.status === "return" ||
                              (updateData.status === "receiving_part" &&
                                Number.parseFloat(updateData.delivery_fee) === 0)
                            }
                            placeholder="0.00"
                          />
                          <span className="absolute left-3 top-2 text-gray-500 text-sm">ج.م</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          للطلبات الجزئية - هذا المبلغ منفصل عن قيمة الطلب الأساسية
                        </p>
                      </div>

                      {/* Zero Amount Warning */}
                      {["canceled", "return", "hand_to_hand", "receiving_part"].includes(updateData.status) && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-yellow-700">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">تنبيه</span>
                          </div>
                          <p className="text-xs text-yellow-600 mt-1">
                            إذا لم يتم وضع أي رسوم، سيتم حساب إجمالي الطلب كصفر (الرسوم منفصلة عن قيمة الطلب الأساسية)
                          </p>
                        </div>
                      )}
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
                            {imageUploading ? "جاري رفع الصورة..." : "اختر صورة من المعرض أو التقط صورة"}
                          </label>
                          <p className="text-xs text-gray-500 mt-1">يمكنك اختيار صورة من المعرض أو التقاط صورة جديدة</p>
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
                            <button
                              type="button"
                              title="حذف الصورة"
                              onClick={() => handleRemoveImage(proof.id, proof.image_data)}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-90 hover:opacity-100 transition-opacity z-10"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

  // Remove image proof handler

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
