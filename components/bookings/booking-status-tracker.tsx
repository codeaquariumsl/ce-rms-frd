'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, CheckCircle } from 'lucide-react'

import { getBookings } from '@/lib/db'

export function BookingStatusTracker() {
  const [bookings, setBookings] = useState<any[]>([])
  const [invoicedBookings, setInvoicedBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadBookings()
  }, [])

  async function loadBookings() {
    try {
      setLoading(true)
      const allBookings = await getBookings(1) // Org ID 1
      
      const pending = allBookings.filter((b: any) => b.status !== 'Returned')
      const invoiced = allBookings.filter((b: any) => b.status === 'Returned')
      
      setBookings(pending.map((b: any) => ({
        id: b.booking_number,
        customerName: b.customer_name,
        status: b.status,
        deliveryDate: b.delivery_date,
        returnDate: b.return_date,
        rentalAmount: Number(b.total_amount),
        advanceDeposit: 0,
        refundableDeposit: 0,
        estimatedTotal: Number(b.total_amount)
      })))
      
      setInvoicedBookings(invoiced.map((b: any) => ({
        id: b.booking_number,
        customerName: b.customer_name,
        status: b.status,
        deliveryDate: b.delivery_date,
        returnDate: b.return_date,
        rentalAmount: Number(b.total_amount),
        advanceDeposit: 0,
        refundableDeposit: 0,
        estimatedTotal: Number(b.total_amount)
      })))
      
      setLoading(false)
    } catch (error) {
      console.error('Failed to load bookings:', error)
      setLoading(false)
    }
  }

  function convertToInvoice(bookingId: string) {
    console.warn('Convert to Invoice not implemented in backend yet for ID:', bookingId)
    alert('This feature will be integrated with the Accounting module soon.')
  }


  const BookingCard = ({ booking, onConvert }: any) => (
    <Card className='p-4 border-blue-100 hover:shadow-md transition-shadow'>
      <div className='flex justify-between items-start mb-3'>
        <div className='flex-1'>
          <h3 className='font-semibold text-primary'>{booking.id}</h3>
          <p className='text-sm text-muted-foreground'>{booking.customerName}</p>
        </div>
        <Badge className='bg-blue-100 text-primary border-blue-200'>{booking.status}</Badge>
      </div>
      
      <div className='grid grid-cols-2 gap-2 text-sm mb-4'>
        <div>
          <p className='text-muted-foreground'>Delivery</p>
          <p className='font-medium'>{new Date(booking.deliveryDate).toLocaleDateString()}</p>
        </div>
        <div>
          <p className='text-muted-foreground'>Return</p>
          <p className='font-medium'>{new Date(booking.returnDate).toLocaleDateString()}</p>
        </div>
      </div>

      <div className='space-y-1 mb-4 p-3 bg-blue-50 rounded text-sm'>
        <div className='flex justify-between'>
          <span className='text-muted-foreground'>Rental Amount:</span>
          <span className='font-medium'>${booking.rentalAmount?.toFixed(2) || '0.00'}</span>
        </div>
        {booking.advanceDeposit > 0 && (
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Advance Deposit:</span>
            <span className='font-medium'>${booking.advanceDeposit.toFixed(2)}</span>
          </div>
        )}
        {booking.refundableDeposit > 0 && (
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Refundable Deposit:</span>
            <span className='font-medium'>${booking.refundableDeposit.toFixed(2)}</span>
          </div>
        )}
        <div className='border-t border-blue-200 pt-2 flex justify-between font-semibold'>
          <span>Total Due:</span>
          <span className='text-primary'>${booking.estimatedTotal?.toFixed(2) || '0.00'}</span>
        </div>
      </div>

      {onConvert && (
        <Button 
          onClick={() => onConvert(booking.id)}
          className='w-full bg-primary hover:bg-primary/90 text-white'
        >
          <FileText className='w-4 h-4 mr-2' />
          Convert to Invoice
        </Button>
      )}
    </Card>
  )

  return (
    <div className='w-full'>
      <Tabs defaultValue='bookings' className='w-full'>
        <TabsList className='grid w-full grid-cols-2 mb-6'>
          <TabsTrigger value='bookings' className='flex items-center gap-2'>
            Pending Bookings
            <Badge variant='outline'>{bookings.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value='invoiced' className='flex items-center gap-2'>
            <CheckCircle className='w-4 h-4' />
            Invoiced Items
            <Badge variant='outline'>{invoicedBookings.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value='bookings' className='space-y-4'>
          {bookings.length === 0 ? (
            <div className='text-center py-12 text-muted-foreground'>
              No pending bookings. Create one to get started!
            </div>
          ) : (
            <div className='grid gap-4'>
              {bookings.map((booking) => (
                <BookingCard 
                  key={booking.id} 
                  booking={booking}
                  onConvert={convertToInvoice}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value='invoiced' className='space-y-4'>
          {invoicedBookings.length === 0 ? (
            <div className='text-center py-12 text-muted-foreground'>
              No invoiced items yet. Convert bookings to invoices to see them here.
            </div>
          ) : (
            <div className='grid gap-4'>
              {invoicedBookings.map((booking) => (
                <BookingCard 
                  key={booking.id} 
                  booking={booking}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
