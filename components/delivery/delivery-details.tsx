"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle } from "lucide-react"
import { getBookingById, updateDeliveryStatus } from "@/lib/db"

interface DeliveryDetailsProps {
  deliveryId: string | number
  onClose?: () => void
  onSuccess?: () => void
}

export function DeliveryDetails({ deliveryId, onClose, onSuccess }: DeliveryDetailsProps) {
  const [delivery, setDelivery] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchDeliveryDetails()
  }, [deliveryId])

  async function fetchDeliveryDetails() {
    try {
      setLoading(true)
      const data = await getBookingById(Number(deliveryId))
      setDelivery(data)
    } catch (error) {
      console.error("Failed to fetch delivery:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmDelivery() {
    try {
      await updateDeliveryStatus(Number(deliveryId), "Delivered")
      setSuccess(true)
      onSuccess?.()

      setTimeout(() => {
        onClose?.()
      }, 2000)
    } catch (error) {
      console.error("Failed to confirm delivery:", error)
      alert("Failed to confirm delivery: " + (error as Error).message)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading delivery details...</div>
  }

  if (!delivery) {
    return <div className="text-center py-8">Delivery not found</div>
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">Delivery confirmed successfully!</AlertDescription>
        </Alert>
      )}

      <Card className="p-6 bg-blue-50 border-blue-100">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-primary">{delivery.id}</h2>
          <Badge>{delivery.status}</Badge>
        </div>

        <div className="border-b pb-4 mb-4">
          <h3 className="font-semibold text-primary mb-2">Customer Information</h3>
          <div className="space-y-1 text-sm">
            <p>{delivery.customerName}</p>
            <p className="text-muted-foreground">{delivery.customerPhone || "No phone"}</p>
          </div>
        </div>

        <div className="border-b pb-4 mb-4">
          <h3 className="font-semibold text-primary mb-2">Delivery Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Delivery Date</p>
              <p className="font-semibold">{new Date(delivery.deliveryDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Return Date</p>
              <p className="font-semibold">{new Date(delivery.returnDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Rental Amount</p>
              <p className="font-semibold">${delivery.rentalAmount?.toFixed(2) || "0.00"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Due</p>
              <p className="font-semibold text-primary">${delivery.estimatedTotal?.toFixed(2) || "0.00"}</p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold mb-3">Items for Delivery</h3>
          <div className="space-y-2">
            {delivery.items?.map((item: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-3 bg-muted rounded">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                </div>
                <p className="font-semibold">Qty: {item.quantity}</p>
              </div>
            ))}
          </div>
        </div>

        {delivery.status !== "Delivered" && (
          <Button onClick={handleConfirmDelivery} className="w-full mb-4">
            Confirm Delivery
          </Button>
        )}

        {delivery.status === "Delivered" && (
          <Alert className="mt-4 mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              This delivery was confirmed on {delivery.delivered_at && new Date(delivery.delivered_at).toLocaleString()}
            </AlertDescription>
          </Alert>
        )}
      </Card>

      {onClose && (
        <Button onClick={onClose} variant="outline" className="w-full bg-transparent">
          Close
        </Button>
      )}
    </div>
  )
}
