"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts"
import {
  TrendingUp,
  Package,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  Activity,
  Target,
  Users,
  Percent,
  Search,
} from "lucide-react"
import { supabase } from "../../lib/supabase"

interface Courier {
  id: string
  name: string
  email: string
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
  created_at: string
  updated_at: string
  archived?: boolean
  archived_at?: string
}

interface AnalyticsData {
  totalOrders: number
  deliveredOrders: number
  canceledOrders: number
  partialOrders: number
  returnedOrders: number
  totalRevenue: number
  deliveredRevenue: number
  averageOrderValue: number
  completionRate: number
  dailyStats: Array<{
    date: string
    orders: number
    revenue: number
    delivered: number
  }>
  statusDistribution: Array<{
    status: string
    count: number
    percentage: number
    color: string
  }>
  paymentMethodStats: Array<{
    method: string
    count: number
    percentage: number
    revenue: number
  }>
  hourlyDistribution: Array<{
    hour: string
    orders: number
  }>
  weeklyTrend: Array<{
    week: string
    orders: number
    revenue: number
  }>
  monthlyComparison: Array<{
    month: string
    current: number
    previous: number
  }>
  topAreas: Array<{
    area: string
    orders: number
    revenue: number
  }>
  performanceMetrics: {
    avgDeliveryTime: number
    customerSatisfaction: number
    onTimeDelivery: number
    efficiency: number
  }
}

const statusConfig = {
  assigned: { label: "Assigned", color: "#3B82F6" },
  delivered: { label: "Delivered", color: "#10B981" },
  canceled: { label: "Canceled", color: "#EF4444" },
  partial: { label: "Partial", color: "#F59E0B" },
  hand_to_hand: { label: "Hand to Hand", color: "#06B6D4" },
  return: { label: "Returned", color: "#8B5CF6" },
  card: { label: "Card", color: "#3B82F6" },
  valu: { label: "Valu", color: "#A855F7" },
}

const paymentMethodConfig = {
  cash: { label: "Cash", color: "#10B981" },
  card: { label: "Card", color: "#3B82F6" },
  valu: { label: "Valu", color: "#8B5CF6" },
  partial: { label: "Partial", color: "#F59E0B" },
}

const AdminAnalytics: React.FC = () => {
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days ago
    end: new Date().toISOString().split("T")[0], // today
    preset: "" as string
  })
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d" | "custom">("30d")
  const [chartType, setChartType] = useState<"bar" | "line" | "area">("bar")
  const [viewMode, setViewMode] = useState<"overview" | "detailed" | "orders">("overview")
  const [searchTerm, setSearchTerm] = useState("")
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [orderSearchTerm, setOrderSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [selectedDay, setSelectedDay] = useState<string>("")

  // Fetch all couriers
  const fetchCouriers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("role", "courier")
        .order("name")

      if (error) throw error
      setCouriers(data || [])
    } catch (error) {
      console.error("Error fetching couriers:", error)
    }
  }, [])

  // Fetch detailed orders for selected courier
  const fetchDetailedOrders = useCallback(async (courierId: string) => {
    if (!courierId) return

    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("assigned_courier_id", courierId)
        .gte("created_at", `${dateRange.start}T00:00:00`)
        .lte("created_at", `${dateRange.end}T23:59:59`)
        .order("created_at", { ascending: false })

      if (error) throw error
      setOrders(orders || [])
      setFilteredOrders(orders || [])
    } catch (error) {
      console.error("Error fetching detailed orders:", error)
    }
  }, [dateRange])

  // Fetch analytics data for selected courier
  const fetchAnalyticsData = useCallback(async (courierId: string, startDate?: string, endDate?: string) => {
    if (!courierId) return

    setLoadingAnalytics(true)
    try {
      // Use provided dates or fall back to current dateRange state
      const start = startDate || dateRange.start
      const end = endDate || dateRange.end
      
      // Fetch orders for the selected courier and date range
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("assigned_courier_id", courierId)
        .gte("created_at", `${start}T00:00:00`)
        .lte("created_at", `${end}T23:59:59`)
        .order("created_at", { ascending: true })

      if (error) throw error

      const ordersData = orders || []

      // Calculate basic stats
      const totalOrders = ordersData.length
      const deliveredOrders = ordersData.filter((o) => o.status === "delivered").length
      const partialOrders = ordersData.filter((o) => o.status === "partial").length
      // Count partial orders as successful deliveries
      const successfulOrders = deliveredOrders + partialOrders
      const canceledOrders = ordersData.filter((o) => o.status === "canceled").length
      const returnedOrders = ordersData.filter((o) => o.status === "return").length

      const totalRevenue = ordersData.reduce((sum, o) => sum + o.total_order_fees, 0)
      const deliveredRevenue = ordersData
        .filter((o) => o.status === "delivered" || o.status === "partial")
        .reduce((sum, o) => sum + o.total_order_fees, 0)

      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
      const completionRate = totalOrders > 0 ? (successfulOrders / totalOrders) * 100 : 0

      // Daily stats
      const dailyStatsMap = new Map()
      ordersData.forEach((order) => {
        const date = order.created_at.split("T")[0]
        if (!dailyStatsMap.has(date)) {
          dailyStatsMap.set(date, { date, orders: 0, revenue: 0, delivered: 0 })
        }
        const dayData = dailyStatsMap.get(date)
        dayData.orders += 1
        dayData.revenue += order.total_order_fees
        if (order.status === "delivered" || order.status === "partial") {
          dayData.delivered += 1
        }
      })

      const dailyStats = Array.from(dailyStatsMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      // Status distribution - only include statuses that have data
      const statusCounts = Object.keys(statusConfig).reduce((acc, status) => {
        const count = ordersData.filter((o) => o.status === status).length
        if (count > 0) {
          acc[status] = count
        }
        return acc
      }, {} as Record<string, number>)

      const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        status: statusConfig[status as keyof typeof statusConfig]?.label || status,
        count,
        percentage: totalOrders > 0 ? (count / totalOrders) * 100 : 0,
        color: statusConfig[status as keyof typeof statusConfig]?.color || "#6B7280",
      }))

      // Payment method stats
      const paymentCounts = Object.keys(paymentMethodConfig).reduce((acc, method) => {
        const count = ordersData.filter((o) => o.payment_method === method).length
        const revenue = ordersData
          .filter((o) => o.payment_method === method)
          .reduce((sum, o) => sum + o.total_order_fees, 0)
        return { ...acc, [method]: { count, revenue } }
      }, {} as Record<string, { count: number; revenue: number }>)

      const paymentMethodStats = Object.entries(paymentCounts).map(([method, data]) => ({
        method: paymentMethodConfig[method as keyof typeof paymentMethodConfig]?.label || method,
        count: data.count,
        percentage: totalOrders > 0 ? (data.count / totalOrders) * 100 : 0,
        revenue: data.revenue,
      }))

      // Hourly distribution
      const hourlyCounts = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, orders: 0 }))
      ordersData.forEach((order) => {
        const hour = new Date(order.created_at).getHours()
        hourlyCounts[hour].orders += 1
      })

      // Weekly trend (last 8 weeks)
      const weeklyTrend = []
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - (i * 7))
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)

        const weekOrders = ordersData.filter((order) => {
          const orderDate = new Date(order.created_at)
          return orderDate >= weekStart && orderDate <= weekEnd
        })

        weeklyTrend.push({
          week: `Week ${8 - i}`,
          orders: weekOrders.length,
          revenue: weekOrders.reduce((sum, o) => sum + o.total_order_fees, 0),
        })
      }

      // Monthly comparison (current vs previous month)
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear

      const currentMonthOrders = ordersData.filter((order) => {
        const orderDate = new Date(order.created_at)
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear
      })

      const previousMonthOrders = ordersData.filter((order) => {
        const orderDate = new Date(order.created_at)
        return orderDate.getMonth() === previousMonth && orderDate.getFullYear() === previousYear
      })

      const monthlyComparison = [
        {
          month: "Current Month",
          current: currentMonthOrders.length,
          previous: 0,
        },
        {
          month: "Previous Month",
          current: 0,
          previous: previousMonthOrders.length,
        },
      ]

      // Top areas (simplified - using first part of address)
      const areaCounts = new Map()
      ordersData.forEach((order) => {
        const area = order.address.split(",")[0].trim()
        if (!areaCounts.has(area)) {
          areaCounts.set(area, { orders: 0, revenue: 0 })
        }
        const areaData = areaCounts.get(area)
        areaData.orders += 1
        areaData.revenue += order.total_order_fees
      })

      const topAreas = Array.from(areaCounts.entries())
        .map(([area, data]) => ({ area, ...data }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 5)

      // Performance metrics (simulated for now)
      const performanceMetrics = {
        avgDeliveryTime: Math.random() * 2 + 1, // 1-3 hours
        customerSatisfaction: Math.random() * 20 + 80, // 80-100%
        onTimeDelivery: Math.random() * 15 + 85, // 85-100%
        efficiency: Math.random() * 10 + 90, // 90-100%
      }

      setAnalyticsData({
        totalOrders,
        deliveredOrders: successfulOrders, // Now includes partial orders
        canceledOrders,
        partialOrders,
        returnedOrders,
        totalRevenue,
        deliveredRevenue,
        averageOrderValue,
        completionRate,
        dailyStats,
        statusDistribution,
        paymentMethodStats,
        hourlyDistribution: hourlyCounts,
        weeklyTrend,
        monthlyComparison,
        topAreas,
        performanceMetrics,
      })
    } catch (error) {
      console.error("Error fetching analytics data:", error)
    } finally {
      setLoadingAnalytics(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchCouriers()
    setLoading(false)
  }, [fetchCouriers])

  useEffect(() => {
    if (selectedCourier) {
      fetchAnalyticsData(selectedCourier.id, dateRange.start, dateRange.end)
      fetchDetailedOrders(selectedCourier.id)
    }
  }, [selectedCourier, fetchAnalyticsData, fetchDetailedOrders, dateRange])

  const handlePeriodChange = (period: "7d" | "30d" | "90d" | "custom") => {
    setSelectedPeriod(period)
    if (period !== "custom") {
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      setDateRange({
        start: startDate.toISOString().split("T")[0],
        end: new Date().toISOString().split("T")[0],
        preset: ""
      })
    }
  }

  const exportData = () => {
    if (!analyticsData || !selectedCourier) return

    const dataToExport = {
      courier: selectedCourier.name,
      period: `${dateRange.start} to ${dateRange.end}`,
      summary: {
        totalOrders: analyticsData.totalOrders,
        deliveredOrders: analyticsData.deliveredOrders,
        completionRate: analyticsData.completionRate,
        totalRevenue: analyticsData.totalRevenue,
        averageOrderValue: analyticsData.averageOrderValue,
      },
      dailyStats: analyticsData.dailyStats,
      statusDistribution: analyticsData.statusDistribution,
      paymentMethodStats: analyticsData.paymentMethodStats,
    }

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `analytics-${selectedCourier.name}-${dateRange.start}-${dateRange.end}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Filter orders based on search term, status, and day
  const filterOrders = useCallback(() => {
    let filtered = [...orders]

    // Filter by search term
    if (orderSearchTerm) {
      filtered = filtered.filter(order =>
        order.order_id.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
        order.mobile_number.includes(orderSearchTerm) ||
        order.address.toLowerCase().includes(orderSearchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter.length > 0) {
      filtered = filtered.filter(order => statusFilter.includes(order.status))
    }

    // Filter by specific day
    if (selectedDay) {
      filtered = filtered.filter(order => {
        const orderDate = order.created_at.split("T")[0]
        return orderDate === selectedDay
      })
    }

    setFilteredOrders(filtered)
  }, [orders, orderSearchTerm, statusFilter, selectedDay])

  useEffect(() => {
    filterOrders()
  }, [filterOrders])

  const filteredCouriers = couriers.filter(courier =>
    courier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    courier.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading couriers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Courier Analytics</h1>
                <p className="text-sm text-gray-500">Performance insights for all couriers</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Date Range Filter */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-medium text-gray-900">Date Range</h3>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                  {/* Preset Date Ranges */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Quick Ranges</label>
                    <select
                      value={dateRange.preset || ""}
                      onChange={(e) => {
                        const preset = e.target.value
                        if (preset) {
                          const today = new Date()
                          let startDate = new Date()
                          
                          switch (preset) {
                            case "today":
                              startDate = new Date(today)
                              break
                            case "yesterday":
                              startDate = new Date(today)
                              startDate.setDate(today.getDate() - 1)
                              break
                            case "last7days":
                              startDate = new Date(today)
                              startDate.setDate(today.getDate() - 7)
                              break
                            case "last30days":
                              startDate = new Date(today)
                              startDate.setDate(today.getDate() - 30)
                              break
                            case "thisMonth":
                              startDate = new Date(today.getFullYear(), today.getMonth(), 1)
                              break
                            case "lastMonth":
                              startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                              today.setDate(0) // Last day of previous month
                              break
                          }
                          
                          const endDate = preset === "today" || preset === "yesterday" ? startDate : today
                          
                          setDateRange({
                            start: startDate.toISOString().split('T')[0],
                            end: endDate.toISOString().split('T')[0],
                            preset
                          })
                        }
                      }}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select Range</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="last7days">Last 7 Days</option>
                      <option value="last30days">Last 30 Days</option>
                      <option value="thisMonth">This Month</option>
                      <option value="lastMonth">Last Month</option>
                    </select>
                  </div>

                  {/* Custom Start Date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => {
                        setDateRange(prev => ({ ...prev, start: e.target.value, preset: "" }))
                      }}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Custom End Date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => {
                        setDateRange(prev => ({ ...prev, end: e.target.value, preset: "" }))
                      }}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => {
                        if (selectedCourier) {
                          fetchAnalyticsData(selectedCourier.id, dateRange.start, dateRange.end)
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Apply
                    </button>
                    <button
                      onClick={() => {
                        const today = new Date()
                        const last30Days = new Date()
                        last30Days.setDate(today.getDate() - 30)
                        
                        setDateRange({
                          start: last30Days.toISOString().split('T')[0],
                          end: today.toISOString().split('T')[0],
                          preset: ""
                        })
                      }}
                      className="px-2 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                      title="Reset"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Selected Date Range Display */}
                <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-md p-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{dateRange.start} - {dateRange.end}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {(() => {
                      const start = new Date(dateRange.start)
                      const end = new Date(dateRange.end)
                      const startTime = start.getTime()
                      const endTime = end.getTime()
                      const diffTime = Math.abs(endTime - startTime)
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
                      return `${diffDays} days`
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex items-center bg-gray-100 rounded-md p-0.5">
                <button
                  onClick={() => setViewMode("overview")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === "overview"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>Overview</span>
                </button>
                <button
                  onClick={() => setViewMode("detailed")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === "detailed"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  <span>Detailed</span>
                </button>
                <button
                  onClick={() => setViewMode("orders")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === "orders"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  <Package className="w-3 h-3" />
                  <span>Orders</span>
                </button>
              </div>
              {selectedCourier && (
                <button
                  onClick={exportData}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Export
                </button>
              )}
              <button
                onClick={() => selectedCourier && fetchAnalyticsData(selectedCourier.id, dateRange.start, dateRange.end)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Courier Selection Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Select Courier</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="relative mb-4">
                  <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search couriers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredCouriers.map((courier) => (
                    <button
                      key={courier.id}
                      onClick={() => setSelectedCourier(courier)}
                      className={`w-full text-right p-3 rounded-lg transition-colors ${
                        selectedCourier?.id === courier.id
                          ? "bg-blue-100 border-2 border-blue-500 text-blue-900"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {courier.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{courier.name}</p>
                          <p className="text-xs text-gray-500">{courier.email}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedCourier ? (
              <div className="space-y-8">
                {/* Selected Courier Info */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {selectedCourier.name.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{selectedCourier.name}</h2>
                        <p className="text-gray-600">{selectedCourier.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{dateRange.start} - {dateRange.end}</span>
                    </div>
                  </div>
                </div>

                {/* Period Selection */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Select Time Period</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: "7d", label: "Last 7 Days" },
                      { key: "30d", label: "Last 30 Days" },
                      { key: "90d", label: "Last 90 Days" },
                      { key: "custom", label: "Custom" },
                    ].map((period) => (
                      <button
                        key={period.key}
                        onClick={() => handlePeriodChange(period.key as any)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          selectedPeriod === period.key
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                  {selectedPeriod === "custom" && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
                        <input
                          type="date"
                          value={dateRange.start}
                          onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
                        <input
                          type="date"
                          value={dateRange.end}
                          onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Analytics Content */}
                {loadingAnalytics ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg font-medium text-gray-700">جاري تحميل التحليلات...</p>
                  </div>
                ) : viewMode === "overview" ? (
                  <div className="space-y-6">
                    {/* Comprehensive Courier Statistics */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-gray-900">إحصائيات مفصلة للمندوب: {selectedCourier.name}</h3>
                        <div className="text-sm text-gray-600">
                          الفترة: {dateRange.start} - {dateRange.end}
                        </div>
                      </div>
                      
                      {/* Main Statistics Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">{analyticsData?.totalOrders || 0}</p>
                              <p className="text-sm text-gray-600 font-medium">Total Orders</p>
                              <p className="text-xs text-gray-500 mt-1">100% of all orders</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-green-600 font-medium">+12%</span>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-blue-600">المجموع الكلي</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">{analyticsData?.deliveredOrders || 0}</p>
                              <p className="text-sm text-gray-600 font-medium">Successful Orders</p>
                              <p className="text-xs text-gray-500 mt-1">{analyticsData?.completionRate.toFixed(1) || 0}% of total orders</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Percent className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-green-600 font-medium">{analyticsData?.completionRate.toFixed(1) || 0}%</span>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-green-600">معدل النجاح</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                              <XCircle className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">{analyticsData?.canceledOrders || 0}</p>
                              <p className="text-sm text-gray-600 font-medium">Canceled Orders</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {analyticsData?.totalOrders ? ((analyticsData.canceledOrders / analyticsData.totalOrders) * 100).toFixed(1) : 0}% of total orders
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <XCircle className="w-4 h-4 text-red-500" />
                              <span className="text-sm text-red-600 font-medium">
                                {analyticsData?.totalOrders ? ((analyticsData.canceledOrders / analyticsData.totalOrders) * 100).toFixed(1) : 0}%
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-red-600">معدل الإلغاء</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                              <DollarSign className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">{analyticsData?.totalRevenue.toFixed(0) || 0}</p>
                              <p className="text-sm text-gray-600 font-medium">Total Revenue (EGP)</p>
                              <p className="text-xs text-gray-500 mt-1">Avg {analyticsData?.averageOrderValue.toFixed(0) || 0} EGP per order</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-green-600 font-medium">+8%</span>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-purple-600">الإيرادات الكلية</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Status Breakdown */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-base font-semibold text-gray-900 mb-3">Order Status Breakdown</h4>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                          {analyticsData?.statusDistribution.map((statusData, index) => {
                            const percentage = analyticsData?.totalOrders ? (statusData.count / analyticsData.totalOrders) * 100 : 0
                            return (
                              <div key={index} className="text-center p-3 bg-white rounded-md border border-gray-200">
                                <div 
                                  className="w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center"
                                  style={{ backgroundColor: statusData.color + '20' }}
                                >
                                  <div 
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: statusData.color }}
                                  ></div>
                                </div>
                                <p className="text-lg font-bold text-gray-900">{statusData.count}</p>
                                <p className="text-xs text-gray-600 mb-1">{statusData.status}</p>
                                <p className="text-xs text-gray-500">{percentage.toFixed(1)}%</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Financial Breakdown */}
                      <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-white" />
                          </div>
                          <h4 className="text-base font-semibold text-gray-900">Financial Analysis</h4>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                              <DollarSign className="w-4 h-4 text-green-600" />
                            </div>
                            <p className="text-xl font-bold text-gray-900">{analyticsData?.deliveredRevenue.toFixed(0) || 0}</p>
                            <p className="text-xs text-gray-600 font-medium mb-1">Successful Revenue</p>
                            <p className="text-xs text-gray-500">
                              {analyticsData?.totalRevenue ? ((analyticsData.deliveredRevenue / analyticsData.totalRevenue) * 100).toFixed(1) : 0}% of total
                            </p>
                          </div>
                          <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                              <Target className="w-4 h-4 text-blue-600" />
                            </div>
                            <p className="text-xl font-bold text-gray-900">{analyticsData?.averageOrderValue.toFixed(0) || 0}</p>
                            <p className="text-xs text-gray-600 font-medium mb-1">Average Order Value</p>
                            <p className="text-xs text-gray-500">EGP per order</p>
                          </div>
                          <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                              <Percent className="w-4 h-4 text-purple-600" />
                            </div>
                            <p className="text-xl font-bold text-gray-900">
                              {analyticsData?.totalRevenue ? ((analyticsData.deliveredRevenue / analyticsData.totalRevenue) * 100).toFixed(1) : 0}%
                            </p>
                            <p className="text-xs text-gray-600 font-medium mb-1">Revenue Achievement</p>
                            <p className="text-xs text-gray-500">of total revenue</p>
                          </div>
                          <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                              <CheckCircle className="w-4 h-4 text-orange-600" />
                            </div>
                            <p className="text-xl font-bold text-gray-900">
                              {analyticsData?.completionRate.toFixed(1) || 0}%
                            </p>
                            <p className="text-xs text-gray-600 font-medium mb-1">Success Rate</p>
                            <p className="text-xs text-gray-500">successful orders</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : viewMode === "orders" ? (
                  <div className="space-y-6">
                    {/* Orders Filters */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">تصفية الطلبات</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">البحث في الطلبات</label>
                          <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                            <input
                              type="text"
                              placeholder="رقم الطلب، اسم العميل، الهاتف..."
                              value={orderSearchTerm}
                              onChange={(e) => setOrderSearchTerm(e.target.value)}
                              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">تصفية حسب الحالة</label>
                          <select
                            multiple
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(Array.from(e.target.selectedOptions, option => option.value))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="assigned">مكلف</option>
                            <option value="delivered">تم التوصيل</option>
                            <option value="canceled">ملغي</option>
                            <option value="partial">جزئي</option>
                            <option value="hand_to_hand">استبدال</option>
                            <option value="return">مرتجع</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">تصفية حسب اليوم</label>
                          <input
                            type="date"
                            value={selectedDay}
                            onChange={(e) => setSelectedDay(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={() => {
                              setOrderSearchTerm("")
                              setStatusFilter([])
                              setSelectedDay("")
                            }}
                            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                          >
                            مسح المرشحات
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Orders Summary */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">ملخص الطلبات</h3>
                        <div className="text-sm text-gray-600">
                          عرض {filteredOrders.length} من {orders.length} طلب
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                        {Object.entries(statusConfig).map(([status, config]) => {
                          const count = filteredOrders.filter(order => order.status === status).length
                          if (count === 0) return null // Don't show statuses with 0 count
                          const percentage = filteredOrders.length > 0 ? (count / filteredOrders.length) * 100 : 0
                          return (
                            <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
                              <div className="w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ backgroundColor: config.color + '20' }}>
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: config.color }}></div>
                              </div>
                              <p className="text-2xl font-bold text-gray-900">{count}</p>
                              <p className="text-sm text-gray-600">{config.label}</p>
                              <p className="text-xs text-gray-500">{percentage.toFixed(1)}%</p>
                            </div>
                          )
                        }).filter(Boolean)}
                      </div>
                    </div>

                    {/* Orders Table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم الطلب</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العميل</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الهاتف</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المبلغ</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">طريقة الدفع</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العنوان</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredOrders.map((order) => {
                              const orderStatusConfig = statusConfig[order.status as keyof typeof statusConfig] || { label: order.status, color: "#6B7280" }
                              return (
                                <tr key={order.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    #{order.order_id}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {order.customer_name}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <a href={`tel:${order.mobile_number}`} className="text-blue-600 hover:text-blue-800">
                                      {order.mobile_number}
                                    </a>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {order.total_order_fees.toFixed(2)} ج.م
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {paymentMethodConfig[order.payment_method as keyof typeof paymentMethodConfig]?.label || order.payment_method}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                      style={{ backgroundColor: orderStatusConfig.color + '20', color: orderStatusConfig.color }}
                                    >
                                      {orderStatusConfig.label}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(order.created_at).toLocaleDateString("ar-EG")}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                                    {order.address}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      {filteredOrders.length === 0 && (
                        <div className="text-center py-12">
                          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد طلبات</h3>
                          <p className="text-gray-600">جرب تعديل المرشحات أو اختيار فترة زمنية أخرى</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : analyticsData ? (
                  <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{analyticsData.totalOrders}</p>
                            <p className="text-sm text-gray-600">إجمالي الطلبات</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600 font-medium">+12%</span>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{analyticsData.deliveredOrders}</p>
                            <p className="text-sm text-gray-600">طلبات مسلمة</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600 font-medium">{analyticsData.completionRate.toFixed(1)}%</span>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-purple-600" />
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{analyticsData.totalRevenue.toFixed(0)}</p>
                            <p className="text-sm text-gray-600">إجمالي الإيرادات (ج.م)</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600 font-medium">+8%</span>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                            <Target className="w-6 h-6 text-yellow-600" />
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{analyticsData.averageOrderValue.toFixed(0)}</p>
                            <p className="text-sm text-gray-600">متوسط قيمة الطلب (ج.م)</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600 font-medium">+5%</span>
                        </div>
                      </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Daily Orders Chart */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-semibold text-gray-900">الطلبات اليومية</h3>
                          <div className="flex items-center gap-2">
                            {["bar", "line", "area"].map((type) => (
                              <button
                                key={type}
                                onClick={() => setChartType(type as any)}
                                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                                  chartType === type
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                }`}
                              >
                                {type === "bar" ? "أعمدة" : type === "line" ? "خط" : "منطقة"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            {chartType === "bar" ? (
                              <BarChart data={analyticsData.dailyStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="orders" fill="#3B82F6" />
                              </BarChart>
                            ) : chartType === "line" ? (
                              <LineChart data={analyticsData.dailyStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} />
                              </LineChart>
                            ) : (
                              <AreaChart data={analyticsData.dailyStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="orders" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                              </AreaChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Status Distribution */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Order Status Distribution</h3>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={analyticsData.statusDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ status, count }) => {
                                  const total = analyticsData?.statusDistribution.reduce((sum, item) => sum + item.count, 0) || 1
                                  const percentage = ((count as number) / total * 100).toFixed(1)
                                  return `${status}: ${percentage}%`
                                }}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="count"
                              >
                                {analyticsData.statusDistribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">لا توجد بيانات متاحة</h3>
                    <p className="text-gray-600">لا توجد طلبات في الفترة المحددة لهذا المندوب</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* All Couriers Overview */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">نظرة عامة على جميع المندوبين</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {couriers.map((courier: Courier) => {
                      // Calculate basic stats for each courier (simplified for now)
                      const courierOrders = orders.filter(order => order.assigned_courier_id === courier.id)
                      const totalOrders = courierOrders.length
                      const deliveredOrders = courierOrders.filter(o => o.status === "delivered").length
                      const partialOrders = courierOrders.filter(o => o.status === "partial").length
                      const successfulOrders = deliveredOrders + partialOrders // Count partial as successful
                      const canceledOrders = courierOrders.filter(o => o.status === "canceled").length
                      const returnedOrders = courierOrders.filter(o => o.status === "return").length
                      const totalRevenue = courierOrders.reduce((sum, o) => sum + o.total_order_fees, 0)
                      const completionRate = totalOrders > 0 ? (successfulOrders / totalOrders) * 100 : 0

                      return (
                        <div 
                          key={courier.id}
                          className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                            (selectedCourier as Courier | null)?.id === courier.id 
                              ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg' 
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedCourier(courier)}
                        >
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                              {courier.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 text-lg">{courier.name}</h4>
                              <p className="text-sm text-gray-600">{courier.email}</p>
                              <div className="mt-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-xs text-green-600 font-medium">معدل النجاح: {completionRate.toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                              <p className="text-3xl font-bold text-blue-600">{totalOrders}</p>
                              <p className="text-sm text-gray-700 font-medium">إجمالي الطلبات</p>
                              <p className="text-xs text-blue-600 mt-1">100%</p>
                            </div>
                            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                              <p className="text-3xl font-bold text-green-600">{successfulOrders}</p>
                              <p className="text-sm text-gray-700 font-medium">تم التوصيل والجزئي</p>
                              <p className="text-xs text-green-600 mt-1">{completionRate.toFixed(1)}%</p>
                            </div>
                            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                              <p className="text-3xl font-bold text-red-600">{canceledOrders}</p>
                              <p className="text-sm text-gray-700 font-medium">ملغاة</p>
                              <p className="text-xs text-red-600 mt-1">{totalOrders > 0 ? ((canceledOrders / totalOrders) * 100).toFixed(1) : 0}%</p>
                            </div>
                            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                              <p className="text-3xl font-bold text-purple-600">{totalRevenue.toFixed(0)}</p>
                              <p className="text-sm text-gray-700 font-medium">إيرادات (ج.م)</p>
                              <p className="text-xs text-purple-600 mt-1">متوسط {totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(0) : 0} ج.م</p>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-4">
                            <h5 className="text-sm font-semibold text-gray-700 mb-3">تفصيل الحالات</h5>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600">جزئي:</span>
                                <span className="font-medium text-orange-600">{partialOrders} ({totalOrders > 0 ? ((partialOrders / totalOrders) * 100).toFixed(1) : 0}%)</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600">مرتجع:</span>
                                <span className="font-medium text-purple-600">{returnedOrders} ({totalOrders > 0 ? ((returnedOrders / totalOrders) * 100).toFixed(1) : 0}%)</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600">استبدال:</span>
                                <span className="font-medium text-cyan-600">{courierOrders.filter(o => o.status === "hand_to_hand").length} ({totalOrders > 0 ? ((courierOrders.filter(o => o.status === "hand_to_hand").length / totalOrders) * 100).toFixed(1) : 0}%)</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600">بطاقة:</span>
                                <span className="font-medium text-blue-600">{courierOrders.filter(o => o.status === "card").length} ({totalOrders > 0 ? ((courierOrders.filter(o => o.status === "card").length / totalOrders) * 100).toFixed(1) : 0}%)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                  <div className="space-y-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <Users className="w-10 h-10 text-gray-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-gray-800">اختر مندوب لعرض تحليلاته التفصيلية</h3>
                      <p className="text-gray-600 max-w-md mx-auto">
                        اضغط على أي مندوب من القائمة أعلاه لعرض إحصائياته المفصلة والرسوم البيانية
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminAnalytics
