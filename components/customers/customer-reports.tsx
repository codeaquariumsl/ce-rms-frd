'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { getCustomerIssuesReport } from '@/lib/db'

interface CustomerReport {
  customerName: string
  nic: string
  phone: string
  totalIssues: number
  totalAmount: number
  issuedCount: number
  returnedCount: number
  returnedDamagedCount: number
  cancelledCount: number
}

export function CustomerReports() {
  const [reports, setReports] = useState<CustomerReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    generateReports()
  }, [])

  async function generateReports() {
    try {
      setLoading(true)
      const res = await getCustomerIssuesReport(1) // Org ID 1
      const data = res.data || []

      const reportsData = data.map((row: any) => ({
        customerName: row.customer_name,
        nic: row.customer_nic || 'N/A',
        phone: row.customer_phone || 'N/A',
        totalIssues: Number(row.total_issues) || 0,
        totalAmount: Number(row.total_amount) || 0,
        issuedCount: Number(row.issued_count) || 0,
        returnedCount: Number(row.returned_count) || 0,
        returnedDamagedCount: Number(row.returned_damaged_count) || 0,
        cancelledCount: Number(row.cancelled_count) || 0,
      }))

      setReports(reportsData)
      setLoading(false)
    } catch (error) {
      console.error('Failed to generate reports:', error)
      setReports([])
      setLoading(false)
    }
  }

  function exportToCSV() {
    const headers = ['Customer Name', 'NIC', 'Phone', 'Total Issues', 'Issued', 'Returned', 'Returned Damaged', 'Cancelled', 'Total Spent (LKR)']
    const csvContent = [
      headers.join(','),
      ...reports.map(r => [
        JSON.stringify(r.customerName),
        JSON.stringify(r.nic),
        JSON.stringify(r.phone),
        r.totalIssues,
        r.issuedCount,
        r.returnedCount,
        r.returnedDamagedCount,
        r.cancelledCount,
        r.totalAmount.toFixed(2),
      ].join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'customer-wise-issues-report.csv'
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
                <TableHead className='text-primary font-semibold text-right'>Total Issues</TableHead>
                <TableHead className='text-primary font-semibold text-right'>Issued</TableHead>
                <TableHead className='text-primary font-semibold text-right'>Returned</TableHead>
                <TableHead className='text-primary font-semibold text-right'>Returned Damaged</TableHead>
                <TableHead className='text-primary font-semibold text-right'>Cancelled</TableHead>
                <TableHead className='text-primary font-semibold text-right'>Total Spent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report, idx) => (
                <TableRow key={idx} className='hover:bg-blue-50'>
                  <TableCell className='font-medium text-primary'>{report.customerName}</TableCell>
                  <TableCell className='font-mono text-sm'>{report.nic}</TableCell>
                  <TableCell>{report.phone}</TableCell>
                  <TableCell className='text-right font-semibold text-primary'>{report.totalIssues}</TableCell>
                  <TableCell className='text-right'>
                    <Badge className='bg-blue-100 text-blue-800 font-semibold'>{report.issuedCount}</Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    <Badge className='bg-green-100 text-green-800 font-semibold'>{report.returnedCount}</Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    <Badge className='bg-red-100 text-red-800 font-semibold'>{report.returnedDamagedCount}</Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    <Badge className='bg-gray-100 text-gray-800 font-semibold'>{report.cancelledCount}</Badge>
                  </TableCell>
                  <TableCell className='text-right font-semibold text-primary'>
                    LKR {report.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          <p className='text-sm text-muted-foreground mb-1'>Active Customers (Has Issued)</p>
          <p className='text-3xl font-bold text-green-700'>{reports.filter(r => r.issuedCount > 0).length}</p>
        </Card>
        <Card className='p-4 bg-gradient-to-br from-purple-100 to-purple-50 border border-purple-200'>
          <p className='text-sm text-muted-foreground mb-1'>Total Issues</p>
          <p className='text-3xl font-bold text-purple-700'>{reports.reduce((sum, r) => sum + r.totalIssues, 0)}</p>
        </Card>
        <Card className='p-4 bg-gradient-to-br from-orange-100 to-orange-50 border border-orange-200'>
          <p className='text-sm text-muted-foreground mb-1'>Total Revenue</p>
          <p className='text-3xl font-bold text-orange-700 font-mono'>
            LKR {reports.reduce((sum, r) => sum + r.totalAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </Card>
      </div>
    </div>
  )
}
