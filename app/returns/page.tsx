"use client"

import { useState } from "react"
import { ReturnList } from "@/components/returns/return-list"
import { ReturnForm } from "@/components/returns/return-form"
import { DamageManagement } from "@/components/returns/damage-management"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

export default function ReturnsPage() {
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const organizationId = 1

  if (selectedReturnId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          <Button 
            onClick={() => setSelectedReturnId(null)} 
            variant="outline" 
            className="mb-4"
          >
            Back to Returns
          </Button>
          <ReturnForm 
            returnId={selectedReturnId}
            onSuccess={() => {
              setSelectedReturnId(null)
              setRefreshKey((prev) => prev + 1)
            }}
            onCancel={() => setSelectedReturnId(null)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Returns & Damage Management</h1>
          <p className="text-muted-foreground mt-2">Process item returns, track damage, and manage repairs</p>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Pending Returns</TabsTrigger>
            <TabsTrigger value="overdue">Overdue Returns</TabsTrigger>
            <TabsTrigger value="damage">Damage Management</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <ReturnList
              key={`pending-${refreshKey}`}
              organizationId={organizationId}
              overdueOnly={false}
              onViewReturn={setSelectedReturnId}
              onRefresh={() => setRefreshKey((prev) => prev + 1)}
            />
          </TabsContent>

          <TabsContent value="overdue" className="mt-4">
            <ReturnList
              key={`overdue-${refreshKey}`}
              organizationId={organizationId}
              overdueOnly={true}
              onViewReturn={setSelectedReturnId}
              onRefresh={() => setRefreshKey((prev) => prev + 1)}
            />
          </TabsContent>

          <TabsContent value="damage" className="mt-4">
            <DamageManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
