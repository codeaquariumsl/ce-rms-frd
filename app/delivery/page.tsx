"use client"

import { useState } from "react"
import { DeliveryList } from "@/components/delivery/delivery-list"
import { DeliveryDetails } from "@/components/delivery/delivery-details"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DeliveryPage() {
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const organizationId = 1

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Delivery Management</h1>
          <p className="text-muted-foreground mt-2">Track and confirm deliveries, view pending orders</p>
        </div>

        {selectedDeliveryId ? (
          <DeliveryDetails
            deliveryId={selectedDeliveryId}
            onClose={() => setSelectedDeliveryId(null)}
            onSuccess={() => setRefreshKey((prev) => prev + 1)}
          />
        ) : (
          <Tabs defaultValue="today" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="tomorrow">Tomorrow</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="delivered">Delivered</TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="mt-4">
              <DeliveryList
                key={`today-${refreshKey}`}
                organizationId={organizationId}
                dateFilter="today"
                onViewDelivery={setSelectedDeliveryId}
              />
            </TabsContent>

            <TabsContent value="tomorrow" className="mt-4">
              <DeliveryList
                key={`tomorrow-${refreshKey}`}
                organizationId={organizationId}
                dateFilter="tomorrow"
                onViewDelivery={setSelectedDeliveryId}
              />
            </TabsContent>

            <TabsContent value="upcoming" className="mt-4">
              <DeliveryList
                key={`upcoming-${refreshKey}`}
                organizationId={organizationId}
                dateFilter="upcoming"
                onViewDelivery={setSelectedDeliveryId}
              />
            </TabsContent>

            <TabsContent value="delivered" className="mt-4">
              <DeliveryList
                key={`delivered-${refreshKey}`}
                organizationId={organizationId}
                dateFilter="delivered"
                onViewDelivery={setSelectedDeliveryId}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
