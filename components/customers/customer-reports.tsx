'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface CustomerReport {
  customerId: string
  customerName: string
  nic: string
  phone: string
  totalBookings: number
  completedRentals: number
  pendingRentals: number
  totalSpent: number
  lastRentalDate: string
  status: 'Active' | 'Inactive'
}

import { getCustomers, getBookings } from '@/lib/db'

export function CustomerReports() {
  const [reports, setReports] = useState<CustomerReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    generateReports()
  }, [])

  async function generateReports() {
    try {
      setLoading(true)
      const customers = await getCustomers(1) // Org ID 1
      const bookings = await getBookings(1) // Org ID 1

      const reportsData = customers.map((customer: any) => {
        const customerBookings = bookings.filter((b: any) => b.customer_id === customer.id)
        const completedRentals = customerBookings.filter((b: any) => b.status === 'Returned').length
        const pendingRentals = customerBookings.filter((b: any) => b.status !== 'Returned').length
        const totalSpent = customerBookings.reduce((sum: number, b: any) => sum + Number(b.total_amount || 0), 0)
        
        const lastRentalDate = customerBookings.length > 0
          ? new Date(Math.max(...customerBookings.map((b: any) => new Date(b.delivery_date).getTime()))).toLocaleDateString()
          : 'N/A'

        return {
          customerId: String(customer.id),
          customerName: customer.name,
          nic: customer.nic,
          phone: customer.phone,
          totalBookings: customerBookings.length,
          completedRentals,
          pendingRentals,
          totalSpent,
          lastRentalDate,
          status: customerBookings.length > 0 ? 'Active' : 'Inactive',
        }
      })

      setReports(reportsData.sort((a, b) => b.totalBookings - a.totalBookings))
      setLoading(false)
    } catch (error) {
      console.error('Failed to generate reports:', error)
      setReports([])
      setLoading(false)
    }
  }


  function exportToCSV() {
    const headers = ['Customer Name', 'NIC', 'Phone', 'Total Bookings', 'Completed', 'Pending', 'Total Spent', 'Last Rental', 'Status']
    const csvContent = [
      headers.join(','),
      ...reports.map(r => [
        r.customerName,
        r.nic,
        r.phone,
        r.totalBookings,
        r.completedRentals,
        r.pendingRentals,
        r.totalSpent.toFixed(2),
        r.lastRentalDate,
        r.status,
      ].join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'customer-reports.csv'
    a.click()
  }

  if (loading) {
    return <div className='text-center py-12'>Loading customer reports...</div>
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h2 className='text-2xl font-bold text-primary'>Customer-wise Reports</h2>
        <Button onClick={exportToCSV} variant='outline' size='sm' className='border-primary text-primary'>
          <Download className='w-4 h-4 mr-2' />
          Export CSV
        </Button>
      </div>

      <Card className='border border-blue-200 overflow-hidden'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader className='bg-gradient-to-r from-blue-100 to-blue-50'>
              <TableRow className='border-b border-blue-200'>
                <TableHead className='text-primary font-semibold'>Customer Name</TableHead>
                <TableHead className='text-primary font-semibold'>NIC</TableHead>
                <TableHead className='text-primary font-semibold'>Phone</TableHead>
                <TableHead className='text-primary font-semibold text-right'>Total Bookings</TableHead>
                <TableHead className='text-primary font-semibold text-right'>Completed</TableHead>
                <TableHead className='text-primary font-semibold text-right'>Pending</TableHead>
                <TableHead className='text-primary font-semibold text-right'>Total Spent</TableHead>
                <TableHead className='text-primary font-semibold'>Last Rental</TableHead>
                <TableHead className='text-primary font-semibold'>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.customerId} className='hover:bg-blue-50'>
                  <TableCell className='font-medium text-primary'>{report.customerName}</TableCell>
                  <TableCell className='font-mono text-sm'>{report.nic}</TableCell>
                  <TableCell>{report.phone}</TableCell>
                  <TableCell className='text-right font-semibold text-primary'>{report.totalBookings}</TableCell>
                  <TableCell className='text-right'>
                    <Badge className='bg-green-100 text-green-800'>{report.completedRentals}</Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    <Badge className='bg-yellow-100 text-yellow-800'>{report.pendingRentals}</Badge>
                  </TableCell>
                  <TableCell className='text-right font-semibold'>${report.totalSpent.toFixed(2)}</TableCell>
                  <TableCell className='text-sm'>{report.lastRentalDate}</TableCell>
                  <TableCell>
                    <Badge className={report.status === 'Active' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                      {report.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {reports.length === 0 && (
          <div className='text-center py-12 text-muted-foreground'>
            No customer data available
          </div>
        )}
      </Card>

      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <Card className='p-4 bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200'>
          <p className='text-sm text-muted-foreground mb-1'>Total Customers</p>
          <p className='text-3xl font-bold text-primary'>{reports.length}</p>
        </Card>
        <Card className='p-4 bg-gradient-to-br from-green-100 to-green-50 border border-green-200'>
          <p className='text-sm text-muted-foreground mb-1'>Active Customers</p>
          <p className='text-3xl font-bold text-green-700'>{reports.filter(r => r.status === 'Active').length}</p>
        </Card>
        <Card className='p-4 bg-gradient-to-br from-purple-100 to-purple-50 border border-purple-200'>
          <p className='text-sm text-muted-foreground mb-1'>Total Rentals</p>
          <p className='text-3xl font-bold text-purple-700'>{reports.reduce((sum, r) => sum + r.totalBookings, 0)}</p>
        </Card>
        <Card className='p-4 bg-gradient-to-br from-orange-100 to-orange-50 border border-orange-200'>
          <p className='text-sm text-muted-foreground mb-1'>Total Revenue</p>
          <p className='text-3xl font-bold text-orange-700'>${reports.reduce((sum, r) => sum + r.totalSpent, 0).toFixed(2)}</p>
        </Card>
      </div>
    </div>
  )
}
