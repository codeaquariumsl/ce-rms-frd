"use client"

import { AdminDashboard } from "@/components/dashboard/admin-dashboard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { BarChart3, TrendingUp, Clock, AlertCircle } from "lucide-react"

export default function Home() {
  const organizationId = 1

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-4xl font-bold">Welcome to RMS</h1>
        <p className="text-muted-foreground mt-2">Your rental management dashboard</p>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-2">
          <AdminDashboard organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="reports" className="mt-2">
          <div className="bg-muted p-8 rounded-lg text-center">
            <p className="text-muted-foreground">Reports coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-2">
          <div className="bg-muted p-8 rounded-lg text-center">
            <p className="text-muted-foreground">Analytics coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
