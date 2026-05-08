'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Plus } from 'lucide-react'

interface Payment {
  id: string
  bookingId: string
  amount: number
  paymentMethod: string
  paymentDate: string
  status: 'Pending' | 'Completed' | 'Failed'
  notes: string
}

import { getBookings } from '@/lib/db'

export function PaymentManager() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    bookingId: '',
    amount: '',
    paymentMethod: 'Cash',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const bookingsData = await getBookings(1) // Org ID 1
      const paymentsData = JSON.parse(localStorage.getItem('payments') || '[]')
      
      setBookings(bookingsData.map((b: any) => ({
        id: b.booking_number,
        status: b.status,
        estimatedTotal: Number(b.total_amount),
        advanceDeposit: 0,
        refundableDeposit: 0
      })))
      setPayments(paymentsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }


  function handleAddPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.bookingId || !formData.amount) {
      alert('Please fill all required fields')
      return
    }

    const newPayment: Payment = {
      id: `PAY-${Date.now()}`,
      bookingId: formData.bookingId,
      amount: parseFloat(formData.amount),
      paymentMethod: formData.paymentMethod,
      paymentDate: formData.paymentDate,
      status: 'Completed',
      notes: formData.notes,
    }

    const updated = [...payments, newPayment]
    localStorage.setItem('payments', JSON.stringify(updated))
    setPayments(updated)
    setFormData({
      bookingId: '',
      amount: '',
      paymentMethod: 'Cash',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setShowForm(false)
  }

  function handleDeletePayment(id: string) {
    if (confirm('Delete this payment?')) {
      const updated = payments.filter((p) => p.id !== id)
      localStorage.setItem('payments', JSON.stringify(updated))
      setPayments(updated)
    }
  }

  const pendingPayments = bookings.filter((b) => b.status === 'Delivered' || b.status === 'Reserved')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary">Payment Management</h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-primary text-white">
          <Plus className="w-4 h-4 mr-2" />
          Record Payment
        </Button>
      </div>

      {/* Add Payment Form */}
      {showForm && (
        <Card className="p-6 border-blue-100 bg-blue-50">
          <form onSubmit={handleAddPayment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-primary font-semibold">Booking *</Label>
                <select
                  value={formData.bookingId}
                  onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })}
                  className="w-full border border-blue-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Booking</option>
                  {pendingPayments.map((b) => {
                    const advText = b.advanceDeposit > 0 ? ` (Adv: $${b.advanceDeposit.toFixed(2)})` : ""
                    return (
                      <option key={b.id} value={b.id}>
                        {b.id} - Due: ${b.estimatedTotal?.toFixed(2)}{advText}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div>
                <Label className="text-primary font-semibold">Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="border-blue-200"
                />
              </div>
              <div>
                <Label className="text-primary font-semibold">Payment Method</Label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full border border-blue-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Bank Transfer</option>
                  <option>Check</option>
                </select>
              </div>
              <div>
                <Label className="text-primary font-semibold">Date</Label>
                <Input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="border-blue-200"
                />
              </div>
            </div>
            <div>
              <Label className="text-primary font-semibold">Notes</Label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border border-blue-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="bg-primary text-white">
                Record Payment
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Payment Table */}
      <Card className="p-6 border-blue-100">
        <h3 className="text-lg font-semibold text-primary mb-4">Payment History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-primary">
                <th className="text-left py-2 px-3 font-semibold text-primary">Payment ID</th>
                <th className="text-left py-2 px-3 font-semibold text-primary">Booking</th>
                <th className="text-left py-2 px-3 font-semibold text-primary">Method</th>
                <th className="text-center py-2 px-3 font-semibold text-primary">Date</th>
                <th className="text-right py-2 px-3 font-semibold text-primary">Amount</th>
                <th className="text-center py-2 px-3 font-semibold text-primary">Status</th>
                <th className="text-center py-2 px-3 font-semibold text-primary">Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const booking = bookings.find((b) => b.id === payment.bookingId)
                return (
                  <tr key={payment.id} className="border-b border-blue-100 hover:bg-blue-50">
                    <td className="py-3 px-3 font-medium text-primary">{payment.id}</td>
                    <td className="py-3 px-3">
                      <div className="font-medium">{payment.bookingId}</div>
                      {booking && booking.advanceDeposit > 0 && (
                        <div className="text-xs text-red-600">Adv: ${booking.advanceDeposit.toFixed(2)}</div>
                      )}
                      {booking && booking.refundableDeposit > 0 && (
                        <div className="text-xs text-blue-600">Ref: ${booking.refundableDeposit.toFixed(2)}</div>
                      )}
                    </td>
                    <td className="py-3 px-3">{payment.paymentMethod}</td>
                    <td className="py-3 px-3 text-center">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-right font-semibold text-primary">${payment.amount.toFixed(2)}</td>
                    <td className="py-3 px-3 text-center">
                      <Badge className="bg-green-100 text-green-800">{payment.status}</Badge>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePayment(payment.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {payments.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No payments recorded yet</p>
        )}
      </Card>
    </div>
  )
}
