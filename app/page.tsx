"use client"

import { AdminDashboard } from "@/components/dashboard/admin-dashboard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { BarChart3, TrendingUp, Clock, AlertCircle } from "lucide-react"

export default function Home() {
  const organizationId = 1

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Welcome to RMS</h1>
        <p className="text-muted-foreground mt-2">Your rental management dashboard</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Inventory</p>
              <p className="text-3xl font-bold mt-2">24</p>
              <p className="text-xs text-green-600 mt-1">+2 this week</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Rentals</p>
              <p className="text-3xl font-bold mt-2">8</p>
              <p className="text-xs text-blue-600 mt-1">Currently rented</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Deliveries</p>
              <p className="text-3xl font-bold mt-2">3</p>
              <p className="text-xs text-yellow-600 mt-1">Due today</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Damaged Items</p>
              <p className="text-3xl font-bold mt-2">1</p>
              <p className="text-xs text-destructive mt-1">In repair</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AdminDashboard organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <div className="bg-muted p-8 rounded-lg text-center">
            <p className="text-muted-foreground">Reports coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="bg-muted p-8 rounded-lg text-center">
            <p className="text-muted-foreground">Analytics coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
