"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Eye, Trash2, FileText } from "lucide-react"
import { getBookings, cancelBooking } from "@/lib/db"
import { BookingInvoice } from "./booking-invoice"

interface BookingListProps {
  organizationId: number
  onViewBooking?: (id: number) => void
  onRefresh?: () => void
}

export function BookingsList({ organizationId, onViewBooking, onRefresh }: BookingListProps) {
  const [bookings, setBookings] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const bookingsData = await getBookings(organizationId)
      setBookings(bookingsData)
    } catch (error) {
      console.error("Failed to fetch data:", error)
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel(id: number) {
    if (confirm("Cancel this booking?")) {
      try {
        await cancelBooking(id)
        fetchData()
        onRefresh?.()
      } catch (error) {
        console.error("Failed to cancel booking:", error)
        alert("Failed to cancel booking: " + (error as Error).message)
      }
    }
  }

  if (selectedInvoice) {
    const booking = bookings.find((b) => b.id === selectedInvoice)
    if (booking) {
      return (
        <div className="space-y-4">
          <Button onClick={() => setSelectedInvoice(null)} variant="outline">
            Back to Bookings
          </Button>
          <BookingInvoice booking={booking} customers={customers} />
        </div>
      )
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Reserved":
        return "bg-blue-100 text-blue-800"
      case "Ready for Pickup":
        return "bg-yellow-100 text-yellow-800"
      case "Delivered":
        return "bg-purple-100 text-purple-800"
      case "Returned":
        return "bg-green-100 text-green-800"
      case "Cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-primary">Bookings</h2>

      <div className="grid gap-4">
        {bookings.map((booking) => (
          <Card key={booking.id} className="p-4 border-blue-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-lg text-primary">{booking.id}</h3>
                <p className="text-sm text-muted-foreground">
                  {booking.customerName}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => setSelectedInvoice(booking.id)}
                      className="cursor-pointer"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Invoice
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCancel(booking.id)} className="text-red-600 cursor-pointer">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Cancel Booking
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery:</span>
                <span className="font-medium">{new Date(booking.deliveryDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Return:</span>
                <span className="font-medium">{new Date(booking.returnDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items:</span>
                <span className="font-medium">{booking.items?.length || 0} item(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold text-primary">${booking.estimatedTotal?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {bookings.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No bookings found</p>
        </div>
      )}
    </div>
  )
}
