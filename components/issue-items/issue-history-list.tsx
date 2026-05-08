'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown, Search, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react'

import { getIssues, getIssueById, updateIssue } from '@/lib/db'
import { IssueReceipt } from './issue-receipt'

interface IssueItem {
  id: string
  issueNumber: string
  customer: { id: string; name: string; phone?: string }
  items: Array<{ id: string; name: string; quantity: number; serialNumbers?: string[] }>
  issueDate: string
  returnDate: string
  numberOfDays: number
  totalAmount: number
  paymentStatus: 'unpaid' | 'paid'
  issuedDate: string
  status?: 'Pending' | 'Returned' | 'Overdue'
}

export function IssueHistoryList() {
  const [issues, setIssues] = useState<IssueItem[]>([])
  const [filteredIssues, setFilteredIssues] = useState<IssueItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Returned' | 'Overdue'>('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedReceiptData, setSelectedReceiptData] = useState<any | null>(null)


  useEffect(() => {
    loadIssues()
  }, [])

  async function loadIssues() {
    try {
      setLoading(true)
      const data = await getIssues(1) // Organization ID 1
      
      const mappedIssues = data.map((issue: any) => {
        const issueDate = new Date(issue.issue_date)
        const returnDate = new Date(issue.return_date)
        const days = Math.max(Math.ceil((returnDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24)), 1)

        const mappedItem: IssueItem = {
          id: String(issue.id),
          issueNumber: issue.issue_number,
          customer: {
            id: String(issue.customer_id),
            name: issue.customer_name,
            phone: issue.customer_phone
          },
          items: [],
          issueDate: issue.issue_date,
          returnDate: issue.return_date,
          numberOfDays: days,
          totalAmount: Number(issue.total_amount),
          paymentStatus: issue.payment_status,
          issuedDate: issue.created_at,
        }

        return {
          ...mappedItem,
          status: issue.status === 'Returned' ? 'Returned' : calculateStatus(mappedItem)
        }
      })

      setIssues(mappedIssues)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load issues:', error)
      setLoading(false)
    }
  }

  async function toggleExpand(issueId: string) {
    if (expandedId === issueId) {
      setExpandedId(null)
      return
    }

    setExpandedId(issueId)
    
    // Find the issue in state
    const issue = issues.find(i => i.id === issueId)
    if (issue && issue.items.length === 0) {
      try {
        const details = await getIssueById(Number(issueId))
        const itemsWithMappedFields = details.items.map((item: any) => ({
          id: String(item.inventory_item_id),
          name: item.name,
          quantity: item.quantity,
          serialNumbers: item.serial_codes || []
        }))
        
        setIssues(prev => prev.map(i => 
          i.id === issueId ? { ...i, items: itemsWithMappedFields } : i
        ))
      } catch (error) {
        console.error("Failed to fetch issue details:", error)
      }
    }
  }


  function calculateStatus(issue: IssueItem): 'Pending' | 'Returned' | 'Overdue' {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const returnDate = new Date(issue.returnDate)
    returnDate.setHours(0, 0, 0, 0)

    if (issue.paymentStatus === 'paid' && issue.numberOfDays > 0) {
      return 'Returned'
    }

    if (returnDate < today) {
      return 'Overdue'
    }

    return 'Pending'
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'Returned':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'Overdue':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'Returned':
        return <CheckCircle className='w-4 h-4' />
      case 'Overdue':
        return <AlertCircle className='w-4 h-4' />
      case 'Pending':
        return <Clock className='w-4 h-4' />
      default:
        return null
    }
  }

  async function handleMarkAsPaid(issueId: string) {
    try {
      await updateIssue(Number(issueId), { payment_status: 'paid' })
      setIssues(prev => prev.map(issue => 
        issue.id === issueId ? { ...issue, paymentStatus: 'paid' } : issue
      ))
      alert("Issue marked as Paid")
    } catch (error) {
      console.error("Failed to update payment status:", error)
      alert("Failed to update payment status")
    }
  }

  async function handleMarkAsReturned(issueId: string) {
    try {
      // In this system, returning an issue also involves making serials available
      // The backend should handle this when status is set to 'Returned'
      await updateIssue(Number(issueId), { 
        status: 'Returned',
        payment_status: 'paid' // Usually returning also completes payment if not already done
      })
      
      setIssues(prev => prev.map(issue => 
        issue.id === issueId ? { ...issue, status: 'Returned', paymentStatus: 'paid' } : issue
      ))
      alert("Issue marked as Returned. Serials are now available.")
    } catch (error) {
      console.error("Failed to mark as returned:", error)
      alert("Failed to mark as returned")
    }
  }

  async function handlePrintReceipt(issue: IssueItem) {
    let issueWithItems = issue
    if (issue.items.length === 0) {
      try {
        const details = await getIssueById(Number(issue.id))
        const itemsWithMappedFields = details.items.map((item: any) => ({
          id: String(item.inventory_item_id),
          name: item.name,
          quantity: item.quantity,
          condition: 'Good',
          price: Number(item.price || 0),
          serialNumbers: item.serial_codes || []
        }))
        issueWithItems = { ...issue, items: itemsWithMappedFields }
      } catch (error) {
        console.error("Failed to fetch details for receipt:", error)
        alert("Failed to load issue details for printing.")
        return
      }
    }

    setSelectedReceiptData({
      id: issueWithItems.issueNumber,
      customer: issueWithItems.customer,
      items: issueWithItems.items,
      issueDate: issueWithItems.issueDate,
      numberOfDays: issueWithItems.numberOfDays,
      returnDate: issueWithItems.returnDate,
      totalAmount: issueWithItems.totalAmount,
      paymentStatus: issueWithItems.paymentStatus,
      issuedDate: issueWithItems.issuedDate,
      issueNumber: issueWithItems.issueNumber
    })
  }

  useEffect(() => {
    let filtered = issues

    if (statusFilter !== 'All') {
      filtered = filtered.filter((issue) => issue.status === statusFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter((issue) =>
        issue.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.issueNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.customer.phone?.includes(searchTerm)
      )
    }

    setFilteredIssues(filtered)
  }, [issues, searchTerm, statusFilter])

  if (loading) {
    return <div className='text-center py-8 text-muted-foreground'>Loading issue history...</div>
  }

  if (selectedReceiptData) {
    return (
      <IssueReceipt 
        data={selectedReceiptData} 
        onBack={() => setSelectedReceiptData(null)} 
      />
    )
  }

  return (
    <div className='space-y-4'>
      {/* Filters */}
      <Card className='p-4 bg-blue-50 border-blue-200'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div className='space-y-2'>
            <Label className='text-primary text-sm'>Search by Name, Number or Phone</Label>
            <div className='relative'>
              <Search className='absolute left-3 top-2.5 w-4 h-4 text-muted-foreground' />
              <Input
                placeholder='Search...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10 border-blue-200 focus:ring-primary'
              />
            </div>
          </div>
          <div className='space-y-2'>
            <Label className='text-primary text-sm'>Status Filter</Label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className='w-full border border-blue-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary'
            >
              <option value='All'>All Issues</option>
              <option value='Pending'>Pending</option>
              <option value='Overdue'>Overdue</option>
              <option value='Returned'>Returned</option>
            </select>
          </div>
          <div className='space-y-2'>
            <Label className='text-primary text-sm'>Summary</Label>
            <div className='text-sm font-semibold text-primary pt-2'>
              Total: {filteredIssues.length} | Pending: {filteredIssues.filter((i) => i.status === 'Pending').length}
            </div>
          </div>
        </div>
      </Card>

      {/* Issues List */}
      <div className='space-y-3'>
        {filteredIssues.length === 0 ? (
          <Card className='p-8 text-center'>
            <p className='text-muted-foreground'>No issues found</p>
          </Card>
        ) : (
          filteredIssues.map((issue) => (
            <Card
              key={issue.id}
              className='overflow-hidden hover:shadow-md transition-shadow'
            >
              {/* Main Row */}
              <div className='p-4 bg-gradient-to-r from-white to-blue-50 border-b border-blue-100'>
                <div className='flex items-center justify-between gap-4'>
                  <div className='flex items-center gap-4 flex-1'>
                    <button
                      onClick={() => handlePrintReceipt(issue)}
                      className='text-primary hover:bg-blue-100 p-1 rounded'
                      title='Print Receipt'
                    >
                      <FileText className='w-5 h-5' />
                    </button>
                    <button
                      onClick={() => toggleExpand(issue.id)}
                      className='text-primary hover:bg-blue-100 p-1 rounded'
                    >
                      <ChevronDown
                        className={`w-5 h-5 transition-transform ${
                          expandedId === issue.id ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <div className='flex-1'>
                      <p className='font-semibold text-primary'>
                        Issue #{issue.issueNumber} - {issue.customer.name}
                      </p>
                      <p className='text-sm text-muted-foreground'>
                        {issue.customer.phone && `Contact: ${issue.customer.phone}`}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center gap-3'>
                    <div className='text-right'>
                      <p className='text-sm font-semibold text-primary'>
                        ${issue.totalAmount.toFixed(2)}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {new Date(issue.issueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={`${getStatusColor(issue.status || 'Pending')} flex items-center gap-1`}>
                      {getStatusIcon(issue.status || 'Pending')}
                      {issue.status || 'Pending'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === issue.id && (
                <div className='p-4 space-y-4 bg-white'>
                  {/* Dates Section */}
                  <div className='grid grid-cols-3 gap-4 pb-4 border-b border-blue-100'>
                    <div>
                      <p className='text-xs text-muted-foreground font-semibold'>Issue Date</p>
                      <p className='font-semibold text-primary'>
                        {new Date(issue.issueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className='text-xs text-muted-foreground font-semibold'>Return Date</p>
                      <p className='font-semibold text-primary'>
                        {new Date(issue.returnDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className='text-xs text-muted-foreground font-semibold'>Days</p>
                      <p className='font-semibold text-primary'>{issue.numberOfDays} day(s)</p>
                    </div>
                  </div>

                  {/* Items Section */}
                  <div>
                    <p className='text-sm font-semibold text-primary mb-2'>Issued Items:</p>
                    <div className='space-y-2'>
                      {issue.items.map((item, idx) => (
                        <div key={idx} className='p-2 bg-blue-50 rounded border border-blue-200'>
                          <div className='flex justify-between items-start'>
                            <div>
                              <p className='font-semibold text-sm'>{item.name}</p>
                              <p className='text-xs text-muted-foreground'>Qty: {item.quantity}</p>
                              {item.serialNumbers && item.serialNumbers.length > 0 && (
                                <div className='flex flex-wrap gap-1 mt-1'>
                                  {item.serialNumbers.map((sn) => (
                                    <Badge key={sn} variant='outline' className='text-xs font-mono'>
                                      {sn}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className='flex items-center justify-between pt-2 border-t border-blue-100 gap-4'>
                    <div className='flex gap-4'>
                      <div>
                        <p className='text-sm font-semibold text-primary'>Payment Status:</p>
                        <Badge className={issue.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                          {issue.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </div>
                      <div>
                        <p className='text-sm font-semibold text-primary'>Issue Status:</p>
                        <Badge className={getStatusColor(issue.status || 'Pending')}>
                          {issue.status || 'Pending'}
                        </Badge>
                      </div>
                    </div>

                    <div className='flex gap-2'>
                      {issue.paymentStatus === 'unpaid' && (
                        <Button
                          onClick={() => handleMarkAsPaid(issue.id)}
                          variant="outline"
                          className='border-green-600 text-green-600 hover:bg-green-50'
                        >
                          Mark as Paid
                        </Button>
                      )}
                      
                      {(issue.status === 'Pending' || issue.status === 'Overdue') && (
                        <Button
                          onClick={() => handleMarkAsReturned(issue.id)}
                          className='bg-green-600 hover:bg-green-700'
                        >
                          Mark as Returned
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
