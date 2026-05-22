"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Package, AlertCircle, Clock, Zap } from "lucide-react"
import { getDashboardStats } from "@/lib/db"

interface AdminDashboardProps {
  organizationId: number
}

export function AdminDashboard({ organizationId }: AdminDashboardProps) {
  const [stats, setStats] = useState<any>(null)
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [returns, setReturns] = useState<any[]>([])
  const [weekOverview, setWeekOverview] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true)
        const data = await getDashboardStats(organizationId)

        setStats({
          total_inventory: data.inventorySummary?.total || 0,
          available_items: data.inventorySummary?.available || 0,
          reserved_items: data.inventorySummary?.reserved || 0,
          delivered_items: data.inventorySummary?.delivered || 0,
          damaged_items: data.inventorySummary?.damaged || 0,
          today_deliveries: data.todayDeliveries?.length || 0,
          pending_returns: data.pendingReturns?.length || 0,
        })

        setDeliveries(data.todayDeliveries || [])
        setReturns(data.pendingReturns || [])
        setWeekOverview(data.weekOverview || [])
      } catch (error) {
        console.error("Failed to load dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [organizationId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Dashboard...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-16 bg-white border border-dashed rounded-3xl p-8 max-w-md mx-auto mt-8">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-extrabold text-slate-800 text-lg">No Operational Data</h3>
        <p className="text-slate-400 text-sm mt-1">Please ensure your inventory items and issues databases are populated.</p>
      </div>
    )
  }

  const inventoryData = [
    { name: "Available", value: stats.available_items, fill: "#10b981" },
    { name: "Delivered", value: stats.delivered_items, fill: "#3b82f6" },
    { name: "Damaged", value: stats.damaged_items, fill: "#f43f5e" },
  ].filter(item => item.value > 0) // Only show items with quantity > 0

  const isOverdue = (returnDate: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const rDate = new Date(returnDate)
    rDate.setHours(0, 0, 0, 0)
    return rDate < today
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1: Total Physical Inventory */}
        <Card className="relative p-6 overflow-hidden bg-white hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 border border-slate-100 rounded-3xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Inventory</span>
              <p className="text-4xl font-black text-slate-900 mt-1">{stats.total_inventory}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <span className="text-xs font-semibold text-slate-500">Available: <b className="text-emerald-500 font-extrabold">{stats.available_items}</b></span>
            <span className="text-xs font-semibold text-slate-300">|</span>
            <span className="text-xs font-semibold text-slate-500">Issued: <b className="text-blue-500 font-extrabold">{stats.delivered_items}</b></span>
          </div>
        </Card>

        {/* Metric 2: Active Rentals */}
        <Card className="relative p-6 overflow-hidden bg-white hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 border border-slate-100 rounded-3xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Rentals</span>
              <p className="text-4xl font-black text-slate-900 mt-1">{stats.pending_returns}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-xs font-semibold text-slate-500">Currently outstanding issue logs</span>
          </div>
        </Card>

        {/* Metric 3: New Issues Today */}
        <Card className="relative p-6 overflow-hidden bg-white hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 border border-slate-100 rounded-3xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">New Rentals Today</span>
              <p className="text-4xl font-black text-slate-900 mt-1">{stats.today_deliveries}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-xs font-semibold text-slate-500">Fresh rental notes started today</span>
          </div>
        </Card>

        {/* Metric 4: Damaged Items */}
        <Card className="relative p-6 overflow-hidden bg-white hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 border border-slate-100 rounded-3xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Damaged / In Repair</span>
              <p className={`text-4xl font-black mt-1 ${stats.damaged_items > 0 ? "text-rose-500" : "text-slate-900"}`}>{stats.damaged_items}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-xs font-semibold text-slate-500">Requires technical assessment</span>
          </div>
        </Card>
      </div>

      {/* Analytics & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Status Pie Chart */}
        <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-3xl">
          <div className="mb-4">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Inventory Health</span>
            <h3 className="font-extrabold text-slate-800 text-lg mt-0.5">Physical Stock Distribution</h3>
          </div>
          <div className="h-[280px] flex items-center justify-center">
            {inventoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {inventoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "rgba(255, 255, 255, 0.95)", border: "1px solid #e2e8f0", borderRadius: "16px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-sm font-medium">No items registered in stock</div>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {inventoryData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                <span>{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Dynamic Weekly Overview Bar Chart */}
        <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-3xl">
          <div className="mb-4">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Operational Flow</span>
            <h3 className="font-extrabold text-slate-800 text-lg mt-0.5">7-Day Rental Activity</h3>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekOverview} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs font-bold text-slate-400" />
                <YAxis tickLine={false} axisLine={false} className="text-xs font-bold text-slate-400" />
                <Tooltip
                  contentStyle={{ background: "rgba(255, 255, 255, 0.95)", border: "1px solid #e2e8f0", borderRadius: "16px" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }} />
                <Bar dataKey="Deliveries" name="Issued Rentals" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Returns" name="Returned Items" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Quick Access Operational Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's New Issues */}
        <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-3xl">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Immediate Actions</span>
              <h3 className="font-extrabold text-slate-800 text-lg mt-0.5">New Rentals Today</h3>
            </div>
            <Badge className="bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-50 font-bold uppercase text-[9px] tracking-wider py-1 px-2.5 rounded-xl">
              {deliveries.length} Today
            </Badge>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {deliveries.map((delivery, idx) => (
              <div key={idx} className="flex justify-between items-center p-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-slate-200 transition-all">
                <div>
                  <p className="font-extrabold text-sm text-slate-800">{delivery.booking_number}</p>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">{delivery.customer_name}</p>
                </div>
                <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold py-1 px-2 rounded-xl text-[9px] uppercase tracking-wider">
                  Active
                </Badge>
              </div>
            ))}
            {deliveries.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest">
                No new rentals started today
              </div>
            )}
          </div>
        </Card>

        {/* Pending / Overdue Returns */}
        <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-3xl">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Return Control</span>
              <h3 className="font-extrabold text-slate-800 text-lg mt-0.5">Pending / Overdue Returns</h3>
            </div>
            <Badge className="bg-yellow-50 text-yellow-600 border border-yellow-100 hover:bg-yellow-50 font-bold uppercase text-[9px] tracking-wider py-1 px-2.5 rounded-xl">
              {returns.length} Outstanding
            </Badge>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {returns.map((returnItem, idx) => {
              const overdue = isOverdue(returnItem.return_date)
              return (
                <div key={idx} className={`flex justify-between items-center p-3.5 border rounded-2xl transition-all ${overdue
                    ? "bg-rose-50/[0.15] border-rose-100 hover:border-rose-200"
                    : "bg-slate-50/50 border-slate-100 hover:border-slate-200"
                  }`}>
                  <div>
                    <p className="font-extrabold text-sm text-slate-800">{returnItem.booking_number}</p>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">
                      Customer: {returnItem.customer_name} • Due: {new Date(returnItem.return_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={`font-bold py-1 px-2 rounded-xl text-[9px] uppercase tracking-wider ${overdue
                      ? "bg-rose-50 text-rose-600 border border-rose-100"
                      : "bg-yellow-50 text-yellow-600 border border-yellow-100"
                    }`}>
                    {overdue ? "Overdue" : "Pending Return"}
                  </Badge>
                </div>
              )
            })}
            {returns.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest">
                No active rentals pending return
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

