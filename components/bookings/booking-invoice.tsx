'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Download, Printer } from 'lucide-react'

interface InvoiceProps {
  booking: any
  customers: any[]
}

export function BookingInvoice({ booking, customers }: InvoiceProps) {
  const invoiceRef = useRef<HTMLDivElement>(null)
  const customer = customers.find((c) => c.id === booking.customerId)

  const deliveryDate = new Date(booking.deliveryDate)
  const returnDate = new Date(booking.returnDate)
  const days = Math.ceil((returnDate.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24))

  const handlePrint = () => {
    if (invoiceRef.current) {
      const printWindow = window.open('', '', 'width=900,height=600')
      if (printWindow) {
        printWindow.document.write(invoiceRef.current.innerHTML)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const handleDownloadPDF = () => {
    if (invoiceRef.current) {
      const content = invoiceRef.current.innerText
      const element = document.createElement('a')
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content))
      element.setAttribute('download', `Invoice-${booking.id}.txt`)
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    }
  }

  return (
    <div className='space-y-4'>
      <div className='flex gap-2'>
        <Button onClick={handlePrint} className='gap-2 bg-primary hover:bg-primary/90'>
          <Printer className='w-4 h-4' />
          Print Invoice
        </Button>
        <Button onClick={handleDownloadPDF} variant='outline' className='gap-2'>
          <Download className='w-4 h-4' />
          Download
        </Button>
      </div>

      <Card ref={invoiceRef} className='p-8 bg-white border-2 border-primary'>
        <div className='max-w-4xl mx-auto'>
          {/* Header */}
          <div className='border-b-2 border-primary pb-6 mb-6'>
            <div className='flex justify-between items-start'>
              <div>
                <h1 className='text-3xl font-bold text-primary'>INVOICE</h1>
                <p className='text-muted-foreground'>Rental Management System</p>
              </div>
              <div className='text-right'>
                <p className='font-semibold'>Invoice #{booking.id}</p>
                <p className='text-sm text-muted-foreground'>Date: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className='grid grid-cols-2 gap-8 mb-8'>
            <div>
              <h3 className='text-sm font-semibold text-primary mb-2'>BILL TO:</h3>
              <div className='space-y-1'>
                <p className='font-medium'>{customer?.name}</p>
                <p className='text-sm'>NIC: {customer?.nic}</p>
                <p className='text-sm'>{customer?.address}</p>
                <p className='text-sm'>Phone: {customer?.phone}</p>
                <p className='text-sm'>Email: {customer?.email}</p>
              </div>
            </div>
            <div>
              <h3 className='text-sm font-semibold text-primary mb-2'>RENTAL DETAILS:</h3>
              <div className='space-y-1'>
                <p className='text-sm'>Delivery Date: {deliveryDate.toLocaleDateString()}</p>
                <p className='text-sm'>Return Date: {returnDate.toLocaleDateString()}</p>
                <p className='text-sm'>Rental Period: {days} days</p>
                <p className='text-sm'>Status: {booking.status}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className='mb-8'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b-2 border-primary'>
                  <th className='text-left py-2 text-primary font-semibold'>Item Description</th>
                  <th className='text-center py-2 text-primary font-semibold'>Qty</th>
                  <th className='text-right py-2 text-primary font-semibold'>Rate/Day</th>
                  <th className='text-right py-2 text-primary font-semibold'>Days</th>
                  <th className='text-right py-2 text-primary font-semibold'>Amount</th>
                </tr>
              </thead>
              <tbody>
                {booking.items.map((item: any, idx: number) => {
                  const itemTotal = item.rental_rate_per_day * (item.quantity || 1) * days
                  return (
                    <tr key={idx} className='border-b border-blue-100'>
                      <td className='py-3'>{item.name}</td>
                      <td className='text-center'>{item.quantity || 1}</td>
                      <td className='text-right'>${item.rental_rate_per_day.toFixed(2)}</td>
                      <td className='text-right'>{days}</td>
                      <td className='text-right font-medium'>${itemTotal.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className='flex justify-end mb-8'>
            <div className='w-72'>
              <div className='flex justify-between mb-2 pb-2 border-b border-blue-200 text-sm'>
                <span>Rental Amount:</span>
                <span>${booking.rentalAmount?.toFixed(2) || booking.estimatedTotal.toFixed(2)}</span>
              </div>
              {booking.advanceDeposit > 0 && (
                <div className='flex justify-between mb-2 pb-2 border-b border-blue-200 text-sm text-red-600'>
                  <span>Less: Advance Deposit:</span>
                  <span>- ${booking.advanceDeposit.toFixed(2)}</span>
                </div>
              )}
              {booking.refundableDeposit > 0 && (
                <div className='flex justify-between mb-2 pb-2 border-b border-blue-200 text-sm text-blue-600'>
                  <span>Note - Refundable Deposit:</span>
                  <span>${booking.refundableDeposit.toFixed(2)}</span>
                </div>
              )}
              <div className='flex justify-between text-lg font-bold text-primary py-3 border-t-2 border-primary'>
                <span>TOTAL DUE:</span>
                <span>${booking.estimatedTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className='border-t-2 border-primary pt-6 mt-8'>
            <p className='text-center text-xs text-muted-foreground'>
              Thank you for your rental business. For any inquiries, please contact us.
            </p>
            <p className='text-center text-xs text-muted-foreground mt-2'>
              Please return items by {returnDate.toLocaleDateString()} to avoid late fees.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
