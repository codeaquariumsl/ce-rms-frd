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
      } catch (error) {
        console.error("Failed to load dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [organizationId])

  if (loading) {
    return <div className="text-center py-12">Loading dashboard...</div>
  }

  if (!stats) {
    return <div className="text-center py-12">No data available</div>
  }

  const inventoryData = [
    { name: "Available", value: stats.available_items, fill: "#10b981" },
    { name: "Reserved", value: stats.reserved_items, fill: "#3b82f6" },
    { name: "Delivered", value: stats.delivered_items, fill: "#8b5cf6" },
    { name: "Damaged", value: stats.damaged_items, fill: "#ef4444" },
  ]

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Total Inventory</p>
              <p className="text-3xl font-bold mt-2">{stats.total_inventory}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Today's Deliveries</p>
              <p className="text-3xl font-bold mt-2">{stats.today_deliveries}</p>
            </div>
            <Zap className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Pending Returns</p>
              <p className="text-3xl font-bold mt-2">{stats.pending_returns}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Damaged Items</p>
              <p className="text-3xl font-bold mt-2 text-red-600">{stats.damaged_items}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Status Pie Chart */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Inventory Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={inventoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {inventoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Week Overview Bar Chart */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Week Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                { name: "Mon", Deliveries: 8, Returns: 4 },
                { name: "Tue", Deliveries: 12, Returns: 6 },
                { name: "Wed", Deliveries: 10, Returns: 3 },
                { name: "Thu", Deliveries: 15, Returns: 8 },
                { name: "Fri", Deliveries: 18, Returns: 5 },
                { name: "Sat", Deliveries: 6, Returns: 2 },
                { name: "Sun", Deliveries: 4, Returns: 1 },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Deliveries" fill="#3b82f6" />
              <Bar dataKey="Returns" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Quick Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Deliveries */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Today's Deliveries
          </h3>
          <div className="space-y-3">
            {deliveries.map((delivery, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-muted rounded">
                <div className="text-sm">
                  <p className="font-medium">{delivery.booking_number}</p>
                  <p className="text-xs text-muted-foreground">{delivery.customer_name}</p>
                </div>
                <Badge variant="outline">{delivery.status}</Badge>
              </div>
            ))}
            {deliveries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No deliveries today</p>
            )}
          </div>
        </Card>

        {/* Pending Returns */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Returns
          </h3>
          <div className="space-y-3">
            {returns.map((returnItem, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-muted rounded">
                <div className="text-sm">
                  <p className="font-medium">{returnItem.booking_number || `Return ${idx + 1}`}</p>
                  <p className="text-xs text-muted-foreground">
                    Due: {new Date(returnItem.return_date).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={new Date(returnItem.return_date) < new Date() ? "destructive" : "default"}>
                  {returnItem.status}
                </Badge>
              </div>
            ))}
            {returns.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No pending returns</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
