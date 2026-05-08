"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Eye, MapPin, Phone } from "lucide-react"
import { getDeliveries } from "@/lib/db"

interface DeliveryListProps {
  organizationId: number
  dateFilter?: "today" | "tomorrow" | "upcoming" | "delivered"
  onViewDelivery?: (id: string) => void
  onRefresh?: () => void
}

export function DeliveryList({
  organizationId,
  dateFilter = "upcoming",
  onViewDelivery,
  onRefresh,
}: DeliveryListProps) {
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchDeliveries()
  }, [dateFilter])

  async function fetchDeliveries() {
    try {
      setLoading(true)
      // Map frontend dateFilter to API expected status/date
      let status: string | undefined = undefined
      let date: string | undefined = undefined

      if (dateFilter === "delivered") status = "Delivered"
      if (dateFilter === "today") date = new Date().toISOString().split('T')[0]
      if (dateFilter === "tomorrow") {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        date = tomorrow.toISOString().split('T')[0]
      }
      if (dateFilter === "upcoming") date = "upcoming"

      const data = await getDeliveries(organizationId, status, date)
      setDeliveries(data)
    } catch (error) {
      console.error("Failed to fetch deliveries:", error)
      setDeliveries([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Reserved":
        return "bg-blue-100 text-blue-800"
      case "Ready for Pickup":
        return "bg-yellow-100 text-yellow-800"
      case "Delivered":
        return "bg-green-100 text-green-800"
      case "Returned":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {deliveries.map((delivery) => (
          <Card key={delivery.id} className="p-4 border-blue-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="font-semibold text-lg text-primary mb-1">{delivery.id}</div>
                <p className="text-sm text-muted-foreground">{delivery.customerName}</p>
              </div>
              <div className="flex gap-2">
                <Badge className={getStatusColor(delivery.status)}>{delivery.status}</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDelivery?.(delivery.id)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="border-t pt-3 grid grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Delivery Date</p>
                <p className="font-semibold">
                  {delivery.deliveryDate ? new Date(delivery.deliveryDate).toLocaleDateString() : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Return Date</p>
                <p className="font-semibold">
                  {delivery.returnDate ? new Date(delivery.returnDate).toLocaleDateString() : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Items</p>
                <p className="font-semibold">{delivery.items?.length || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Due</p>
                <p className="font-semibold text-primary">${delivery.estimatedTotal?.toFixed(2) || "0.00"}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {deliveries.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No deliveries found</p>
        </div>
      )}
    </div>
  )
}
