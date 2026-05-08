"use client"

import { useState } from "react"
import { BarcodeScanner } from "@/components/barcode/barcode-scanner"
import { BookingTicket } from "@/components/barcode/booking-ticket"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function BarcodePage() {
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null)
  const organizationId = 1

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Barcode Management</h1>
          <p className="text-muted-foreground mt-2">
            Scan and manage item barcodes for deliveries, returns, and inventory tracking
          </p>
        </div>

        <Tabs defaultValue="scanner" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scanner">Scanner</TabsTrigger>
            <TabsTrigger value="delivery">Delivery Scan</TabsTrigger>
            <TabsTrigger value="return">Return Scan</TabsTrigger>
          </TabsList>

          <TabsContent value="scanner" className="space-y-4 mt-4">
            <BarcodeScanner
              action="inventory"
              organizationId={organizationId}
              onScan={(barcode, data) => {
                console.log("Item scanned:", data)
              }}
            />
          </TabsContent>

          <TabsContent value="delivery" className="space-y-4 mt-4">
            <BarcodeScanner
              action="delivery"
              organizationId={organizationId}
              onScan={(barcode, data) => {
                console.log("Delivery scan:", data)
              }}
            />
          </TabsContent>

          <TabsContent value="return" className="space-y-4 mt-4">
            <BarcodeScanner
              action="return"
              organizationId={organizationId}
              onScan={(barcode, data) => {
                console.log("Return scan:", data)
              }}
            />
          </TabsContent>
        </Tabs>

        {selectedBookingId && (
          <div className="mt-8">
            <BookingTicket bookingId={selectedBookingId} onClose={() => setSelectedBookingId(null)} />
          </div>
        )}
      </div>
    </div>
  )
}
