"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Printer, X } from "lucide-react"

interface BookingTicketProps {
  bookingId: number
  onClose?: () => void
}

export function BookingTicket({ bookingId, onClose }: BookingTicketProps) {
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTicket()
  }, [bookingId])

  async function fetchTicket() {
    try {
      setLoading(true)
      const response = await fetch(`/api/bookings/${bookingId}/ticket`)
      const { data } = await response.json()
      setTicket(data)
    } catch (error) {
      console.error("Failed to fetch ticket:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    if (printRef.current) {
      window.print()
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading ticket...</div>
  }

  if (!ticket) {
    return <div className="text-center py-8">Ticket not found</div>
  }

  return (
    <Card className="p-6 max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Booking Ticket</h2>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          {onClose && (
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div ref={printRef} className="space-y-6 print:bg-white">
        {/* Header */}
        <div className="border-b pb-4">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold">RENTAL TICKET</h1>
            <p className="text-lg font-mono">{ticket.booking.number}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Booking Date</p>
              <p>{new Date(ticket.booking.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="font-semibold">Status</p>
              <p>{ticket.booking.status}</p>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="border-b pb-4">
          <h3 className="font-bold mb-3">CUSTOMER INFORMATION</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-semibold">{ticket.customer.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-semibold">{ticket.customer.phone}</p>
            </div>
            {ticket.customer.email && (
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-semibold">{ticket.customer.email}</p>
              </div>
            )}
            {ticket.customer.address && (
              <div>
                <p className="text-muted-foreground">Address</p>
                <p className="font-semibold">
                  {ticket.customer.address}
                  {ticket.customer.city && `, ${ticket.customer.city}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Rental Dates */}
        <div className="border-b pb-4">
          <h3 className="font-bold mb-3">RENTAL PERIOD</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Delivery Date</p>
              <p className="font-semibold text-lg">{new Date(ticket.dates.delivery_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Return Date</p>
              <p className="font-semibold text-lg">{new Date(ticket.dates.return_date).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="border-b pb-4">
          <h3 className="font-bold mb-3">RENTED ITEMS</h3>
          <div className="space-y-2">
            {ticket.items.map((item: any, index: number) => (
              <div key={index} className="flex justify-between text-sm border-b pb-2">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    SKU: {item.sku} | Barcode: {item.barcode}
                  </p>
                </div>
                <div className="text-right">
                  <p>Qty: {item.quantity}</p>
                  <p className="font-semibold">${(item.subtotal || 0).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-muted p-4 rounded">
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg">TOTAL AMOUNT:</span>
            <span className="text-2xl font-bold">${ticket.total_amount?.toFixed(2)}</span>
          </div>
        </div>

        {/* QR Code Info */}
        <div className="border pt-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">Scan QR Code for Details</p>
          <div className="bg-gray-100 p-4 text-xs font-mono text-center">{ticket.qr_code_data}</div>
        </div>

        {/* Notes */}
        {ticket.booking.notes && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">Notes:</p>
            <p className="text-sm">{ticket.booking.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground border-t pt-4">
          <p>Generated on {new Date().toLocaleString()}</p>
          <p>Please keep this ticket for reference</p>
        </div>
      </div>
    </Card>
  )
}
