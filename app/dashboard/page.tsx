"use client"

import { AdminDashboard } from "@/components/dashboard/admin-dashboard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DashboardPage() {
  const organizationId = 1 // In production, get from auth context

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Real-time overview of your rental operations</p>
        </div>

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
    </div>
  )
}
