"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
} from "recharts"
import {
  Package,
  AlertCircle,
  Clock,
  Zap,
  TrendingUp,
  Users,
  Wallet,
  ArrowUpRight,
  CheckCircle2,
  RefreshCw,
  Wrench,
  Layers,
  CalendarClock,
  ShieldAlert,
} from "lucide-react"
import {
  getDashboardStats,
  getIssues,
  getInventoryItems,
  getCustomers,
  getMonthlyCollectionsReport,
  getDailyIssuesReport,
} from "@/lib/db"

interface AdminDashboardProps {
  organizationId: number
  activeTab?: "overview" | "financials" | "inventory"
}

export function AdminDashboard({ organizationId, activeTab = "overview" }: AdminDashboardProps) {
  const [stats, setStats] = useState<any>(null)
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [returns, setReturns] = useState<any[]>([])
  const [weekOverview, setWeekOverview] = useState<any[]>([])
  const [issues, setIssues] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [monthlyCollections, setMonthlyCollections] = useState<any[]>([])
  const [dailyIssues, setDailyIssues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function loadDashboard(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      const [
        dashData,
        issuesData,
        inventoryData,
        customersData,
        monthlyData,
        dailyIssueData,
      ] = await Promise.all([
        getDashboardStats(organizationId).catch(() => null),
        getIssues(organizationId).catch(() => []),
        getInventoryItems(organizationId).catch(() => []),
        getCustomers(organizationId).catch(() => []),
        getMonthlyCollectionsReport(organizationId).catch(() => ({ data: [], summary: {} })),
        getDailyIssuesReport(organizationId).catch(() => ({ data: [], summary: {} })),
      ])

      const invList = Array.isArray(inventoryData) ? inventoryData : []
      const issList = Array.isArray(issuesData) ? issuesData : []
      const custList = Array.isArray(customersData) ? customersData : []

      const computedTotal = invList.reduce((s, i) => s + Number(i.quantity_total || 0), 0)
      const computedAvailable = invList.reduce((s, i) => s + Number(i.quantity_available || 0), 0)
      const computedReserved = invList.reduce((s, i) => s + Number(i.quantity_reserved || 0), 0)
      const computedDelivered = invList.reduce((s, i) => s + Number(i.quantity_delivered || 0), 0)
      const computedDamaged = invList.reduce((s, i) => s + Number(i.quantity_damaged || 0), 0)

      setStats({
        total_inventory: dashData?.inventorySummary?.total ?? computedTotal,
        available_items: dashData?.inventorySummary?.available ?? computedAvailable,
        reserved_items: dashData?.inventorySummary?.reserved ?? computedReserved,
        delivered_items: dashData?.inventorySummary?.delivered ?? computedDelivered,
        damaged_items: dashData?.inventorySummary?.damaged ?? computedDamaged,
        today_deliveries: dashData?.todayDeliveries?.length || 0,
        pending_returns: dashData?.pendingReturns?.length || 0,
      })

      setDeliveries(dashData?.todayDeliveries || [])
      setReturns(dashData?.pendingReturns || [])
      setWeekOverview(dashData?.weekOverview || [])
      setIssues(issList)
      setInventory(invList)
      setCustomers(custList)
      setMonthlyCollections(Array.isArray(monthlyData?.data) ? monthlyData.data : [])
      setDailyIssues(Array.isArray(dailyIssueData?.data) ? dailyIssueData.data : [])
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [organizationId])

  const todayMidnight = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const isOverdue = (returnDate: string) => {
    if (!returnDate) return false
    const rDate = new Date(returnDate)
    rDate.setHours(0, 0, 0, 0)
    return rDate < todayMidnight
  }

  const getDaysDiff = (returnDate: string) => {
    if (!returnDate) return 0
    const rDate = new Date(returnDate)
    rDate.setHours(0, 0, 0, 0)
    return Math.round((rDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Compute rich operational & financial metrics from live records
  const metrics = useMemo(() => {
    const totalBilled = issues.reduce((s, i) => s + Number(i.total_amount || 0), 0)
    const paidIssues = issues.filter((i) => i.payment_status === "paid")
    const unpaidIssues = issues.filter((i) => i.payment_status !== "paid")

    const collectedRevenue = paidIssues.reduce((s, i) => s + Number(i.total_amount || 0), 0)
    const pendingReceivables = unpaidIssues.reduce((s, i) => s + Number(i.total_amount || 0), 0)

    const cashCollected = paidIssues
      .filter((i) => (i.payment_type || "Cash") === "Cash")
      .reduce((s, i) => s + Number(i.total_amount || 0), 0)
    const creditCollected = paidIssues
      .filter((i) => i.payment_type === "Credit")
      .reduce((s, i) => s + Number(i.total_amount || 0), 0)

    const todayStr = new Date().toISOString().split("T")[0]
    const todayIssuedList = issues.filter(
      (i) => i.issue_date && String(i.issue_date).startsWith(todayStr)
    )
    const todayRevenue = todayIssuedList.reduce((s, i) => s + Number(i.total_amount || 0), 0)

    const activeIssues = issues.filter((i) => i.status === "Issued")
    const returnedIssues = issues.filter((i) => i.status === "Returned" || i.status === "Returned Damaged")
    const overdueIssues = activeIssues.filter((i) => isOverdue(i.return_date))
    const dueTodayIssues = activeIssues.filter((i) => getDaysDiff(i.return_date) === 0)
    const overdueValue = overdueIssues.reduce((s, i) => s + Number(i.total_amount || 0), 0)

    const totalStock = stats?.total_inventory || 0
    const availableStock = stats?.available_items || 0
    const issuedStock = stats?.delivered_items || 0
    const damagedStock = stats?.damaged_items || 0
    const utilizationRate = totalStock > 0 ? Math.round((issuedStock / totalStock) * 100) : 0
    const availabilityRate = totalStock > 0 ? Math.round((availableStock / totalStock) * 100) : 0
    const collectionRate = totalBilled > 0 ? Math.round((collectedRevenue / totalBilled) * 100) : 0
    const avgOrderValue = issues.length > 0 ? totalBilled / issues.length : 0

    const serializedSkuCount = inventory.filter((i) => i.is_have_serial === 1 || i.is_have_serial === true).length
    const lowStockItems = inventory.filter(
      (i) => Number(i.quantity_total || 0) > 0 && Number(i.quantity_available || 0) <= 2
    )

    // Category aggregation
    const categoryMap = new Map<
      string,
      { category: string; skus: number; total: number; available: number; issued: number; damaged: number; avgRate: number; rateSum: number }
    >()
    inventory.forEach((item) => {
      const cat = item.category || "Uncategorized"
      const prev = categoryMap.get(cat) || {
        category: cat,
        skus: 0,
        total: 0,
        available: 0,
        issued: 0,
        damaged: 0,
        avgRate: 0,
        rateSum: 0,
      }
      prev.skus += 1
      prev.total += Number(item.quantity_total || 0)
      prev.available += Number(item.quantity_available || 0)
      prev.issued += Number(item.quantity_delivered || 0)
      prev.damaged += Number(item.quantity_damaged || 0)
      prev.rateSum += Number(item.rental_rate_per_day || 0)
      prev.avgRate = prev.skus > 0 ? prev.rateSum / prev.skus : 0
      categoryMap.set(cat, prev)
    })
    const categoryBreakdown = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total)

    // Top customers by spend & rental count
    const customerStatsMap = new Map<
      string,
      { id: string; name: string; phone: string; totalOrders: number; activeOrders: number; totalSpend: number; unpaidAmount: number }
    >()
    issues.forEach((iss) => {
      const cid = String(iss.customer_id || iss.customer_name)
      const prev = customerStatsMap.get(cid) || {
        id: cid,
        name: iss.customer_name || "Unknown",
        phone: iss.customer_phone || "N/A",
        totalOrders: 0,
        activeOrders: 0,
        totalSpend: 0,
        unpaidAmount: 0,
      }
      prev.totalOrders += 1
      if (iss.status === "Issued") prev.activeOrders += 1
      prev.totalSpend += Number(iss.total_amount || 0)
      if (iss.payment_status !== "paid") prev.unpaidAmount += Number(iss.total_amount || 0)
      customerStatsMap.set(cid, prev)
    })
    const topCustomers = Array.from(customerStatsMap.values())
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 8)

    // Top rented equipment from dailyIssues or issues.items
    const itemDemandMap = new Map<
      string,
      { name: string; category: string; totalQty: number; totalRevenue: number }
    >()
    if (dailyIssues.length > 0) {
      dailyIssues.forEach((row) => {
        const key = row.item_name || "Equipment"
        const prev = itemDemandMap.get(key) || {
          name: key,
          category: row.item_category || "General",
          totalQty: 0,
          totalRevenue: 0,
        }
        prev.totalQty += Number(row.total_quantity || 0)
        prev.totalRevenue += Number(row.total_revenue || 0)
        itemDemandMap.set(key, prev)
      })
    } else {
      issues.forEach((iss) => {
        if (Array.isArray(iss.items)) {
          iss.items.forEach((itm: any) => {
            const key = itm.name || "Equipment"
            const prev = itemDemandMap.get(key) || {
              name: key,
              category: itm.sku || "Equipment",
              totalQty: 0,
              totalRevenue: 0,
            }
            prev.totalQty += Number(itm.quantity || 0)
            prev.totalRevenue += Number(itm.price || 0) * Number(itm.quantity || 0)
            itemDemandMap.set(key, prev)
          })
        }
      })
    }
    const topEquipment = Array.from(itemDemandMap.values())
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 8)

    // Monthly chart data
    const monthMap = new Map<string, { month: string; Cash: number; Credit: number; Total: number }>()
    monthlyCollections.forEach((m) => {
      const monthKey = m.month || "Current"
      const prev = monthMap.get(monthKey) || { month: monthKey, Cash: 0, Credit: 0, Total: 0 }
      const amt = Number(m.collection_amount || 0)
      if (m.payment_method === "Credit") prev.Credit += amt
      else prev.Cash += amt
      prev.Total += amt
      monthMap.set(monthKey, prev)
    })
    const monthlyChart = Array.from(monthMap.values()).reverse()

    return {
      totalBilled,
      collectedRevenue,
      pendingReceivables,
      cashCollected,
      creditCollected,
      paidCount: paidIssues.length,
      unpaidCount: unpaidIssues.length,
      unpaidIssues,
      todayIssuedCount: todayIssuedList.length || stats?.today_deliveries || 0,
      todayRevenue,
      activeCount: activeIssues.length || stats?.pending_returns || 0,
      returnedCount: returnedIssues.length,
      overdueIssues,
      overdueCount: overdueIssues.length,
      dueTodayCount: dueTodayIssues.length,
      overdueValue,
      totalStock,
      availableStock,
      issuedStock,
      damagedStock,
      utilizationRate,
      availabilityRate,
      collectionRate,
      avgOrderValue,
      skuCount: inventory.length,
      serializedSkuCount,
      lowStockItems,
      categoryBreakdown,
      topCustomers,
      topEquipment,
      monthlyChart,
      activeCustomerCount: new Set(activeIssues.map((i) => i.customer_id)).size,
    }
  }, [issues, inventory, stats, monthlyCollections, dailyIssues, todayMidnight])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="w-7 h-7 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
          Synchronizing Live Telemetry...
        </p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12 bg-white border border-dashed border-slate-200 rounded-xl p-6 max-w-md mx-auto">
        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h3 className="font-bold text-slate-800 text-sm">No Operational Data</h3>
        <p className="text-slate-400 text-xs mt-1">
          Please ensure your inventory items and issues databases are populated.
        </p>
      </div>
    )
  }

  const inventoryPieData = [
    { name: "Available", value: metrics.availableStock, fill: "#10b981" },
    { name: "Issued", value: metrics.issuedStock, fill: "#3b82f6" },
    { name: "Damaged", value: metrics.damagedStock, fill: "#f43f5e" },
  ].filter((item) => item.value > 0)

  const formatLKR = (val: number) =>
    `LKR ${Number(val || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const formatCompactLKR = (val: number) =>
    `LKR ${Number(val || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Top 6 Compact High-Density KPI Strip (Always visible across tabs) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
        {/* KPI 1: Collected Revenue */}
        <Card className="p-3 bg-white border border-slate-200 shadow-sm rounded-xl hover:border-emerald-300 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block truncate">
                Collected Revenue
              </span>
              <p className="text-base font-black text-slate-900 mt-0.5 truncate" title={formatLKR(metrics.collectedRevenue)}>
                {formatCompactLKR(metrics.collectedRevenue)}
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="font-bold text-emerald-600">{metrics.collectionRate}% Settled</span>
            <span className="font-semibold text-slate-400">{metrics.paidCount} Paid</span>
          </div>
        </Card>

        {/* KPI 2: Outstanding Receivables */}
        <Card className="p-3 bg-white border border-slate-200 shadow-sm rounded-xl hover:border-amber-300 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block truncate">
                Unpaid Balance
              </span>
              <p className="text-base font-black text-amber-600 mt-0.5 truncate" title={formatLKR(metrics.pendingReceivables)}>
                {formatCompactLKR(metrics.pendingReceivables)}
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="font-bold text-amber-600">{metrics.unpaidCount} Unpaid</span>
            <span className="font-semibold text-slate-400">Total: {formatCompactLKR(metrics.totalBilled)}</span>
          </div>
        </Card>

        {/* KPI 3: Active Rentals */}
        <Card className="p-3 bg-white border border-slate-200 shadow-sm rounded-xl hover:border-blue-300 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block truncate">
                Active Rentals
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <p className="text-lg font-black text-slate-900 leading-none">{metrics.activeCount}</p>
                <span className="text-[10px] font-bold text-blue-600">+{metrics.todayIssuedCount} Today</span>
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="font-semibold text-slate-500">
              Returned: <b className="text-slate-700">{metrics.returnedCount}</b>
            </span>
            <span className="font-bold text-indigo-600">Due Today: {metrics.dueTodayCount}</span>
          </div>
        </Card>

        {/* KPI 4: Overdue Alerts */}
        <Card
          className={`p-3 bg-white border shadow-sm rounded-xl transition-all ${
            metrics.overdueCount > 0
              ? "border-rose-200 bg-rose-50/20 hover:border-rose-300"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block truncate">
                Overdue Returns
              </span>
              <p
                className={`text-lg font-black mt-0.5 leading-none ${
                  metrics.overdueCount > 0 ? "text-rose-600" : "text-slate-900"
                }`}
              >
                {metrics.overdueCount}
              </p>
            </div>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                metrics.overdueCount > 0
                  ? "bg-rose-50 text-rose-600 border-rose-100"
                  : "bg-slate-50 text-slate-400 border-slate-100"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="font-semibold text-slate-500">At-Risk Value:</span>
            <span className={`font-black ${metrics.overdueCount > 0 ? "text-rose-600" : "text-slate-600"}`}>
              {formatCompactLKR(metrics.overdueValue)}
            </span>
          </div>
        </Card>

        {/* KPI 5: Physical Stock & Utilization */}
        <Card className="p-3 bg-white border border-slate-200 shadow-sm rounded-xl hover:border-primary/30 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block truncate">
                Total Stock ({metrics.skuCount} SKUs)
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <p className="text-lg font-black text-slate-900 leading-none">{metrics.totalStock}</p>
                <span className="text-[10px] font-bold text-emerald-600">{metrics.utilizationRate}% In-Use</span>
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/15">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="font-semibold text-slate-500">
              Avail: <b className="text-emerald-600">{metrics.availableStock}</b>
            </span>
            <span className="font-semibold text-slate-500">
              Issued: <b className="text-blue-600">{metrics.issuedStock}</b>
            </span>
          </div>
        </Card>

        {/* KPI 6: Customers & Damaged Stock */}
        <Card className="p-3 bg-white border border-slate-200 shadow-sm rounded-xl hover:border-slate-300 transition-all">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block truncate">
                Customers & Repair
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <p className="text-lg font-black text-slate-900 leading-none">{customers.length}</p>
                <span className="text-[10px] font-bold text-slate-500">Clients</span>
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 border border-violet-100">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="font-semibold text-slate-500">
              Active: <b className="text-violet-600">{metrics.activeCustomerCount}</b>
            </span>
            <span className={`font-bold ${metrics.damagedStock > 0 ? "text-rose-600" : "text-slate-400"}`}>
              Damaged: {metrics.damagedStock}
            </span>
          </div>
        </Card>
      </div>

      {/* ───────────────────────────── TAB 1: OVERVIEW ───────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-3">
          {/* Row 2: 7-Day Activity Bar Chart + Compact Stock Health Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* 7-Day Rental Activity (7 cols) */}
            <Card className="lg:col-span-7 p-3.5 bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                    Operational Flow
                  </span>
                  <h3 className="font-bold text-slate-800 text-xs mt-0.5">
                    7-Day Issuances vs Returns Activity
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Issued (
                    {weekOverview.reduce((s, d) => s + Number(d.Deliveries || 0), 0)})
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Returned (
                    {weekOverview.reduce((s, d) => s + Number(d.Returns || 0), 0)})
                  </span>
                  <button
                    onClick={() => loadDashboard(true)}
                    className="p-1 rounded-md border border-slate-200 text-slate-500 hover:text-primary hover:bg-slate-50 transition-colors"
                    title="Refresh Dashboard"
                  >
                    <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin text-primary" : ""}`} />
                  </button>
                </div>
              </div>

              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekOverview} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(255, 255, 255, 0.98)",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    />
                    <Bar dataKey="Deliveries" name="Issued Rentals" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={18} />
                    <Bar dataKey="Returns" name="Returned Items" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Stock Distribution & Quick Telemetry (5 cols) */}
            <Card className="lg:col-span-5 p-3.5 bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                    Inventory Telemetry
                  </span>
                  <h3 className="font-bold text-slate-800 text-xs mt-0.5">
                    Physical Stock Allocation & Health
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black uppercase">
                  {metrics.availabilityRate}% Available
                </span>
              </div>

              <div className="grid grid-cols-12 items-center gap-2 my-auto">
                <div className="col-span-5 h-[145px]">
                  {inventoryPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={inventoryPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={58}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {inventoryPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            fontSize: "11px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-[11px]">
                      No stock data
                    </div>
                  )}
                </div>

                <div className="col-span-7 space-y-2 pr-1">
                  {/* Available Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Available Ready
                      </span>
                      <span className="text-slate-900">
                        {metrics.availableStock} <span className="text-slate-400">({metrics.availabilityRate}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${metrics.availabilityRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Issued Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" /> Out on Rental
                      </span>
                      <span className="text-slate-900">
                        {metrics.issuedStock} <span className="text-slate-400">({metrics.utilizationRate}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${metrics.utilizationRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Damaged Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> Damaged / Repair
                      </span>
                      <span className="text-rose-600">{metrics.damagedStock} units</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{
                          width: `${
                            metrics.totalStock > 0
                              ? Math.min(100, Math.round((metrics.damagedStock / metrics.totalStock) * 100))
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini Footer Summary */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50/70 rounded-lg py-1 px-2">
                  <span className="text-[8px] font-black text-slate-400 uppercase block">Total Catalog</span>
                  <span className="text-xs font-black text-slate-800">{metrics.skuCount} Items</span>
                </div>
                <div className="bg-slate-50/70 rounded-lg py-1 px-2">
                  <span className="text-[8px] font-black text-slate-400 uppercase block">Serialized</span>
                  <span className="text-xs font-black text-primary">{metrics.serializedSkuCount} SKUs</span>
                </div>
                <div className="bg-slate-50/70 rounded-lg py-1 px-2">
                  <span className="text-[8px] font-black text-slate-400 uppercase block">Low Stock</span>
                  <span
                    className={`text-xs font-black ${
                      metrics.lowStockItems.length > 0 ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    {metrics.lowStockItems.length} Alerts
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Row 3: Actionable Operational Tables (Pending/Overdue Returns & Recent Issues) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Pending & Overdue Returns Table (7 cols) */}
            <Card className="lg:col-span-7 border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
              <div className="p-3 px-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                <div>
                  <span className="text-[8px] font-black text-primary uppercase tracking-widest block">
                    Return Control Queue
                  </span>
                  <h3 className="font-bold text-slate-800 text-xs">
                    Active & Overdue Rentals ({returns.length})
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  {metrics.overdueCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase">
                      {metrics.overdueCount} Overdue
                    </span>
                  )}
                  <Link href="/issue-items">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[9px] font-black uppercase tracking-wider border-slate-200"
                    >
                      Manage Returns <ArrowUpRight className="w-3 h-3 ml-0.5" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[270px] overflow-y-auto">
                {returns.length > 0 ? (
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 bg-slate-50 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="py-2 px-3">Issue ID</th>
                        <th className="py-2 px-3">Customer</th>
                        <th className="py-2 px-3">Return Due</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                        <th className="py-2 px-3 text-center">Timeline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {returns.slice(0, 12).map((ret, idx) => {
                        const diff = getDaysDiff(ret.return_date)
                        const overdue = diff < 0
                        const matchedIssue = issues.find(
                          (i) => String(i.id) === String(ret.id) || i.issue_number === ret.booking_number
                        )
                        return (
                          <tr
                            key={idx}
                            className={`transition-colors ${
                              overdue ? "bg-rose-50/30 hover:bg-rose-50/60" : "hover:bg-slate-50/70"
                            }`}
                          >
                            <td className="py-2 px-3">
                              <span className="text-[10px] font-black text-primary bg-primary/5 px-1.5 py-0.5 rounded">
                                {ret.booking_number}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-bold text-slate-800 text-[11px] truncate max-w-[140px]">
                                {ret.customer_name}
                              </div>
                              {matchedIssue?.customer_phone && (
                                <div className="text-[9px] font-mono text-slate-400">
                                  {matchedIssue.customer_phone}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-[10px] font-bold text-slate-500">
                              {new Date(ret.return_date).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-3 text-right font-black text-slate-800 text-[11px]">
                              {matchedIssue ? formatCompactLKR(matchedIssue.total_amount) : "—"}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                                  overdue
                                    ? "bg-rose-50 text-rose-600 border-rose-200"
                                    : diff === 0
                                      ? "bg-amber-50 text-amber-600 border-amber-200"
                                      : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                }`}
                              >
                                {overdue
                                  ? `${Math.abs(diff)}d Overdue`
                                  : diff === 0
                                    ? "Due Today"
                                    : `${diff}d Left`}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-10 text-center text-slate-400 text-xs font-bold">
                    No active rentals pending return
                  </div>
                )}
              </div>
            </Card>

            {/* Recent Issue Orders & Today's Activity (5 cols) */}
            <Card className="lg:col-span-5 border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
              <div className="p-3 px-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                <div>
                  <span className="text-[8px] font-black text-primary uppercase tracking-widest block">
                    Latest Dispatch Logs
                  </span>
                  <h3 className="font-bold text-slate-800 text-xs">
                    Recent Rental Orders ({issues.length})
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-black uppercase">
                  {metrics.todayIssuedCount} Issued Today
                </span>
              </div>

              <div className="overflow-x-auto max-h-[270px] overflow-y-auto">
                {issues.length > 0 ? (
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 bg-slate-50 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="py-2 px-3">Issue ID</th>
                        <th className="py-2 px-3">Customer</th>
                        <th className="py-2 px-3 text-right">Total</th>
                        <th className="py-2 px-3 text-center">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {issues.slice(0, 10).map((iss) => (
                        <tr key={iss.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-3">
                            <span className="text-[10px] font-black text-primary bg-primary/5 px-1.5 py-0.5 rounded">
                              {iss.issue_number}
                            </span>
                            <div className="text-[9px] text-slate-400 font-semibold mt-0.5">
                              {new Date(iss.issue_date).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-800 text-[11px] truncate max-w-[125px]">
                              {iss.customer_name}
                            </div>
                            <div className="text-[9px] text-slate-400 font-semibold">
                              {Array.isArray(iss.items) && iss.items.length > 0
                                ? `${iss.items.length} item(s)`
                                : iss.status}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right font-black text-slate-800 text-[11px]">
                            {formatCompactLKR(iss.total_amount)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase ${
                                iss.payment_status === "paid"
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                  : "bg-amber-50 text-amber-600 border-amber-100"
                              }`}
                            >
                              {iss.payment_status === "paid" ? "Paid" : "Unpaid"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-10 text-center text-slate-400 text-xs font-bold">
                    No issue records found
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ────────────────────── TAB 2: REVENUE & COLLECTIONS ────────────────────── */}
      {activeTab === "financials" && (
        <div className="space-y-3">
          {/* Financial Breakdown Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <Card className="p-3 bg-slate-900 text-white border border-slate-800 rounded-xl">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                Gross Billed Volume
              </span>
              <p className="text-lg font-black mt-1">{formatLKR(metrics.totalBilled)}</p>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
                Across {issues.length} total rental contracts
              </span>
            </Card>

            <Card className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                Cash Collections
              </span>
              <p className="text-lg font-black text-emerald-600 mt-1">{formatLKR(metrics.cashCollected)}</p>
              <span className="text-[10px] text-slate-500 font-semibold mt-1 block">
                Settled via direct cash payment
              </span>
            </Card>

            <Card className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                Credit Settlements
              </span>
              <p className="text-lg font-black text-blue-600 mt-1">{formatLKR(metrics.creditCollected)}</p>
              <span className="text-[10px] text-slate-500 font-semibold mt-1 block">
                Settled via credit / account transfer
              </span>
            </Card>

            <Card className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                Average Contract Value
              </span>
              <p className="text-lg font-black text-slate-900 mt-1">{formatLKR(metrics.avgOrderValue)}</p>
              <span className="text-[10px] text-slate-500 font-semibold mt-1 block">
                Today&apos;s New Volume: {formatCompactLKR(metrics.todayRevenue)}
              </span>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Monthly Revenue Chart (6 cols) */}
            <Card className="lg:col-span-6 p-3.5 bg-white border border-slate-200 shadow-sm rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                    Revenue Velocity
                  </span>
                  <h3 className="font-bold text-slate-800 text-xs mt-0.5">
                    Monthly Collections Breakdown (LKR)
                  </h3>
                </div>
                <Link href="/reports">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[9px] font-black uppercase tracking-wider border-slate-200"
                  >
                    Full Reports <ArrowUpRight className="w-3 h-3 ml-0.5" />
                  </Button>
                </Link>
              </div>
              <div className="h-[230px]">
                {metrics.monthlyChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.monthlyChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
                      />
                      <Tooltip
                        formatter={(value: any) => formatLKR(Number(value))}
                        contentStyle={{
                          background: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                      />
                      <Bar dataKey="Cash" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={24} />
                      <Bar dataKey="Credit" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                    No monthly paid collection logs yet
                  </div>
                )}
              </div>
            </Card>

            {/* Top Customers by Rental Spend (6 cols) */}
            <Card className="lg:col-span-6 border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
              <div className="p-3 px-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                <div>
                  <span className="text-[8px] font-black text-primary uppercase tracking-widest block">
                    Client Leaderboard
                  </span>
                  <h3 className="font-bold text-slate-800 text-xs">
                    Top Customers by Rental Volume
                  </h3>
                </div>
                <Link href="/customers">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[9px] font-black uppercase tracking-wider border-slate-200"
                  >
                    All Clients <ArrowUpRight className="w-3 h-3 ml-0.5" />
                  </Button>
                </Link>
              </div>
              <div className="overflow-x-auto max-h-[245px] overflow-y-auto">
                {metrics.topCustomers.length > 0 ? (
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 bg-slate-50 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="py-2 px-3">Customer</th>
                        <th className="py-2 px-3 text-center">Orders</th>
                        <th className="py-2 px-3 text-right">Total Billed</th>
                        <th className="py-2 px-3 text-right">Unpaid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {metrics.topCustomers.map((c, i) => (
                        <tr key={c.id} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded bg-slate-100 text-[9px] font-black text-slate-500 flex items-center justify-center">
                                {i + 1}
                              </span>
                              <div>
                                <div className="font-bold text-slate-800 text-[11px]">{c.name}</div>
                                <div className="text-[9px] font-mono text-slate-400">{c.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-600 text-[11px]">
                            {c.totalOrders}{" "}
                            {c.activeOrders > 0 && (
                              <span className="text-[9px] text-blue-600">({c.activeOrders} active)</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-black text-slate-800 text-[11px]">
                            {formatCompactLKR(c.totalSpend)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-[11px]">
                            {c.unpaidAmount > 0 ? (
                              <span className="text-amber-600">{formatCompactLKR(c.unpaidAmount)}</span>
                            ) : (
                              <span className="text-emerald-600">Settled</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-10 text-center text-slate-400 text-xs font-bold">
                    No customer billing data available
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ────────────────────── TAB 3: STOCK & UTILIZATION ────────────────────── */}
      {activeTab === "inventory" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Category Stock Matrix (7 cols) */}
            <Card className="lg:col-span-7 border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
              <div className="p-3 px-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                <div>
                  <span className="text-[8px] font-black text-primary uppercase tracking-widest block">
                    Category Allocation
                  </span>
                  <h3 className="font-bold text-slate-800 text-xs">
                    Stock Breakdown by Category ({metrics.categoryBreakdown.length})
                  </h3>
                </div>
                <Link href="/inventory">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[9px] font-black uppercase tracking-wider border-slate-200"
                  >
                    Open Inventory <ArrowUpRight className="w-3 h-3 ml-0.5" />
                  </Button>
                </Link>
              </div>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 bg-slate-50 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-center">SKUs</th>
                      <th className="py-2 px-3 text-center">Total</th>
                      <th className="py-2 px-3 text-center">Available</th>
                      <th className="py-2 px-3 text-center">Issued</th>
                      <th className="py-2 px-3 text-center">Damaged</th>
                      <th className="py-2 px-3 text-right">Avg Rate/Day</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {metrics.categoryBreakdown.map((cat) => (
                      <tr key={cat.category} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-bold text-slate-800 text-[11px]">{cat.category}</td>
                        <td className="py-2 px-3 text-center font-semibold text-slate-500">{cat.skus}</td>
                        <td className="py-2 px-3 text-center font-black text-slate-800">{cat.total}</td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-600">{cat.available}</td>
                        <td className="py-2 px-3 text-center font-bold text-blue-600">{cat.issued}</td>
                        <td className="py-2 px-3 text-center font-bold text-rose-600">{cat.damaged}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-700 text-[11px]">
                          {formatCompactLKR(cat.avgRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Most Demanded Equipment (5 cols) */}
            <Card className="lg:col-span-5 border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
              <div className="p-3 px-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                <div>
                  <span className="text-[8px] font-black text-primary uppercase tracking-widest block">
                    Equipment Demand
                  </span>
                  <h3 className="font-bold text-slate-800 text-xs">
                    Most Rented Equipment
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-black uppercase">
                  Top Performers
                </span>
              </div>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                {metrics.topEquipment.length > 0 ? (
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 bg-slate-50 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="py-2 px-3">Equipment</th>
                        <th className="py-2 px-3 text-center">Units Issued</th>
                        <th className="py-2 px-3 text-right">Est. Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {metrics.topEquipment.map((eq, idx) => (
                        <tr key={eq.name} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded bg-primary/10 text-primary text-[9px] font-black flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="font-bold text-slate-800 text-[11px] truncate max-w-[150px]">
                                  {eq.name}
                                </div>
                                <div className="text-[9px] text-slate-400 uppercase font-bold">
                                  {eq.category}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center font-black text-blue-600">{eq.totalQty}</td>
                          <td className="py-2 px-3 text-right font-black text-slate-800 text-[11px]">
                            {formatCompactLKR(eq.totalRevenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-10 text-center text-slate-400 text-xs font-bold">
                    No equipment rental history yet
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
