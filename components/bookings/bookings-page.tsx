"use client"

import { useState } from "react"
import { CreateBookingForm } from "./create-booking-form"
import { BookingsList } from "./bookings-list"
import { BookingStatusTracker } from "./booking-status-tracker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

export function BookingsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState("list")
  const organizationId = 1

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Booking Management</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage rental bookings with automatic availability checking
          </p>
        </div>

        {showCreateForm ? (
          <div>
            <Button 
              onClick={() => setShowCreateForm(false)} 
              variant="outline" 
              className="mb-4"
            >
              Back to Bookings
            </Button>
            <CreateBookingForm
              organizationId={organizationId}
              onSuccess={() => {
                setShowCreateForm(false)
                setRefreshKey((prev) => prev + 1)
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              Create New Booking
            </Button>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list">List View</TabsTrigger>
                <TabsTrigger value="status">Booking Status</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-4">
                <BookingsList
                  key={refreshKey}
                  organizationId={organizationId}
                  onRefresh={() => setRefreshKey((prev) => prev + 1)}
                />
              </TabsContent>

              <TabsContent value="status" className="space-y-4">
                <BookingStatusTracker />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}
