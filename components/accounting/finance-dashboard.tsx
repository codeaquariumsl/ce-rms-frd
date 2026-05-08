'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react'

export function FinanceDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    pendingPayments: 0,
    completedPayments: 0,
    netProfit: 0,
    totalAdvanceDeposits: 0,
    totalRefundableDeposits: 0,
  })
  const [bookings, setBookings] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('month')

  useEffect(() => {
    calculateStats()
  }, [selectedPeriod])

  function calculateStats() {
    try {
      const bookingsData = JSON.parse(localStorage.getItem('bookings') || '[]')
      const invoices = JSON.parse(localStorage.getItem('invoices') || '[]')
      
      setBookings(bookingsData)

      // Calculate revenue from completed bookings
      const totalRevenue = bookingsData.reduce((sum: number, b: any) => {
        if (b.status === 'Returned' || b.status === 'Completed') {
          return sum + (b.estimatedTotal || 0)
        }
        return sum
      }, 0)

      // Calculate pending payments
      const pendingPayments = bookingsData.reduce((sum: number, b: any) => {
        if (b.status === 'Reserved' || b.status === 'Delivered') {
          return sum + (b.estimatedTotal || 0)
        }
        return sum
      }, 0)

      // Calculate deposits
      const totalAdvanceDeposits = bookingsData.reduce((sum: number, b: any) => sum + (b.advanceDeposit || 0), 0)
      const totalRefundableDeposits = bookingsData.reduce((sum: number, b: any) => sum + (b.refundableDeposit || 0), 0)

      // For now, expenses are 0 (can be expanded later)
      const totalExpenses = 0
      const netProfit = totalRevenue - totalExpenses

      setStats({
        totalRevenue,
        totalExpenses,
        pendingPayments,
        completedPayments: totalRevenue,
        netProfit,
        totalAdvanceDeposits,
        totalRefundableDeposits,
      })
    } catch (error) {
      console.error('[v0] Failed to calculate stats:', error)
    }
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Advance Deposits',
      value: `$${stats.totalAdvanceDeposits.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Refundable Deposits',
      value: `$${stats.totalRefundableDeposits.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Pending Payments',
      value: `$${stats.pendingPayments.toFixed(2)}`,
      icon: Calendar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Net Profit',
      value: `$${stats.netProfit.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-green-700',
      bgColor: 'bg-green-100',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">Accounting & Finance</h1>
        <div className="flex gap-2">
          <Button
            variant={selectedPeriod === 'month' ? 'default' : 'outline'}
            onClick={() => setSelectedPeriod('month')}
            className={selectedPeriod === 'month' ? 'bg-primary text-white' : ''}
          >
            This Month
          </Button>
          <Button
            variant={selectedPeriod === 'year' ? 'default' : 'outline'}
            onClick={() => setSelectedPeriod('year')}
            className={selectedPeriod === 'year' ? 'bg-primary text-white' : ''}
          >
            This Year
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <Card key={idx} className={`p-4 border-blue-100 ${stat.bgColor} hover:shadow-md transition-shadow`}>
              <div className="flex justify-between items-start">
                <div className='flex-1'>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">{stat.title}</p>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <Icon className={`w-6 h-6 ${stat.color} flex-shrink-0`} />
              </div>
            </Card>
          )
        })}
      </div>

      {/* Payment Overview */}
      <Card className="p-6 border-blue-100">
        <h2 className="text-xl font-semibold text-primary mb-4">Payment Status Overview</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Completed Payments</span>
              <span className="text-sm font-semibold text-green-600">${stats.completedPayments.toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full"
                style={{
                  width: `${
                    stats.totalRevenue + stats.pendingPayments > 0
                      ? (stats.completedPayments / (stats.totalRevenue + stats.pendingPayments)) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Pending Payments</span>
              <span className="text-sm font-semibold text-yellow-600">${stats.pendingPayments.toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-yellow-500 h-3 rounded-full"
                style={{
                  width: `${
                    stats.totalRevenue + stats.pendingPayments > 0
                      ? (stats.pendingPayments / (stats.totalRevenue + stats.pendingPayments)) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card className="p-6 border-blue-100">
        <h2 className="text-xl font-semibold text-primary mb-4">Recent Bookings & Revenue</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-primary">
                <th className="text-left py-2 px-3 font-semibold text-primary">Booking ID</th>
                <th className="text-left py-2 px-3 font-semibold text-primary">Customer</th>
                <th className="text-center py-2 px-3 font-semibold text-primary">Status</th>
                <th className="text-right py-2 px-3 font-semibold text-primary">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bookings.slice(0, 10).map((booking) => (
                <tr key={booking.id} className="border-b border-blue-100 hover:bg-blue-50">
                  <td className="py-3 px-3 font-medium text-primary">{booking.id}</td>
                  <td className="py-3 px-3">{booking.customerName}</td>
                  <td className="py-3 px-3 text-center">
                    <Badge
                      className={
                        booking.status === 'Returned' || booking.status === 'Completed'
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'Delivered'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                      }
                    >
                      {booking.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-primary">
                    ${booking.estimatedTotal?.toFixed(2) || '0.00'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {bookings.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No bookings found</p>
        )}
      </Card>
    </div>
  )
}
