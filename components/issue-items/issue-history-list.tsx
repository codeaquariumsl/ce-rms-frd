'use client'

import { useState, useEffect, Fragment } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown, Search, CheckCircle, Clock, AlertCircle, FileText, Printer, Download, X } from 'lucide-react'

import { getIssues, getIssueById, updateIssue, getCustomerById } from '@/lib/db'
import { IssueReceipt, printIssuePDF, generateIssuePDF, type PaperSize } from './issue-receipt'
import { CompleteReturnModal } from './complete-return-modal'

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

  // Complete Return Modal States
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [activeReturnIssue, setActiveReturnIssue] = useState<IssueItem | null>(null)


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

  function handleOpenReturnModal(issue: IssueItem) {
    setActiveReturnIssue(issue)
    setReturnModalOpen(true)
  }

  async function fetchReceiptData(issue: IssueItem) {
    const details = await getIssueById(Number(issue.id))
    const itemsWithMappedFields = details.items.map((item: any) => ({
      id: item.inventory_item_id,
      name: item.name,
      quantity: item.quantity,
      price: Number(item.price || 0),
      serial_codes: item.serial_codes || []
    }))

    let customerName = details.customer_name || "N/A"
    let customerPhone = details.customer_phone || "N/A"
    let customerAddress = details.customer_address || ""
    let customerNIC = details.customer_nic || ""
    let issueAddress = details.issue_address || ""

    // Dynamically fetch and merge customer details if missing or N/A
    const customerId = details.customer_id || issue.customer.id
    if (customerId) {
      try {
        const customer = await getCustomerById(Number(customerId))
        if (customer) {
          if (customerName === "N/A" || !customerName) customerName = customer.name || "N/A"
          if (customerPhone === "N/A" || !customerPhone) customerPhone = customer.phone || "N/A"
          if (!customerAddress) customerAddress = customer.address || ""
          if (!customerNIC) customerNIC = customer.nic || ""
        }
      } catch (cErr) {
        console.error("Failed to fetch customer profile fallback:", cErr)
      }
    }

    return {
      id: Number(details.id),
      issue_number: details.issue_number,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      customer_nic: customerNIC,
      issue_address: issueAddress,
      status: details.status || "Issued",
      issue_date: details.issue_date,
      return_date: details.return_date,
      total_amount: Number(details.total_amount || 0),
      payment_status: details.payment_status,
      items: itemsWithMappedFields,
      notes: details.notes || ""
    }
  }

  async function handlePrint(issue: IssueItem, paperSize: PaperSize = 'A4') {
    try {
      const data = await fetchReceiptData(issue)
      await printIssuePDF(data, paperSize)
    } catch (error) {
      console.error("Failed to print receipt:", error)
      alert("Failed to load issue details for printing.")
    }
  }

  async function handleDownload(issue: IssueItem, paperSize: PaperSize = 'A4') {
    try {
      const data = await fetchReceiptData(issue)
      await generateIssuePDF(data, paperSize)
    } catch (error) {
      console.error("Failed to download receipt:", error)
      alert("Failed to load issue details for downloading.")
    }
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

    // Sort: Overdue (0) first, Pending (1) second, Returned/Completed (2) last.
    // Within same status priority, sort by issue date descending (newest first).
    const sorted = [...filtered].sort((a, b) => {
      const getPriority = (status?: string) => {
        if (status === 'Overdue') return 0
        if (status === 'Pending') return 1
        return 2
      }
      const pA = getPriority(a.status)
      const pB = getPriority(b.status)
      if (pA !== pB) {
        return pA - pB
      }
      return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
    })

    setFilteredIssues(sorted)
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
    <div className="space-y-3">
      {/* Streamlined Search & Filters */}
      <Card className="p-3 border-slate-200 shadow-sm rounded-xl bg-white">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Filter by customer, issue ID, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8.5 border-slate-200 bg-slate-50/50 focus:bg-white transition-all rounded-lg text-xs"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-between md:justify-end">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-8.5 border border-slate-200 rounded-lg px-3 text-xs font-semibold text-slate-600 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-primary transition-all cursor-pointer hover:border-slate-300"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
              <option value="Returned">Returned</option>
            </select>
            <div className="h-8.5 px-3 flex items-center bg-slate-900 rounded-lg border border-slate-800 shadow-inner">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-2 select-none">Active Logs</span>
              <span className="text-xs font-black text-white">{filteredIssues.length}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Modern Compact Issue List Table */}
      <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
        <div className="overflow-x-auto w-full">
          {filteredIssues.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2 border border-slate-100">
                <Search className="w-5 h-5 text-slate-300" />
              </div>
              <p className="text-slate-500 font-bold text-xs">No records match your criteria</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left border-b border-slate-100 select-none">
                  <th className="py-2.5 px-3 w-10 text-center"></th>
                  <th className="py-2.5 px-3">Issue ID</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3 text-center">Duration</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                  <th className="py-2.5 px-3 text-center">Payment</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredIssues.map((issue) => {
                  const isExpanded = expandedId === issue.id
                  return (
                    <Fragment key={issue.id}>
                      {/* Parent Row */}
                      <tr 
                        onClick={() => toggleExpand(issue.id)}
                        className={`group cursor-pointer transition-all duration-150 ${
                          isExpanded 
                            ? 'bg-blue-50/75 hover:bg-blue-100/50' 
                            : 'hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Toggle Arrow */}
                        <td className="py-2.5 px-3 text-center shrink-0">
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-transform duration-200 ${isExpanded ? 'rotate-180 text-primary' : ''}`} />
                        </td>
                        
                        {/* Issue ID */}
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-md">
                            {issue.issueNumber}
                          </span>
                        </td>
                        
                        {/* Date */}
                        <td className="py-2.5 px-3 font-bold text-slate-400 text-[10px] uppercase">
                          {new Date(issue.issueDate).toLocaleDateString()}
                        </td>
                        
                        {/* Customer */}
                        <td className="py-2.5 px-3 font-bold text-slate-800 truncate max-w-[140px]">
                          {issue.customer.name}
                        </td>
                        
                        {/* Contact */}
                        <td className="py-2.5 px-3 font-semibold text-slate-500 font-mono text-[10px]">
                          {issue.customer.phone || 'N/A'}
                        </td>
                        
                        {/* Duration */}
                        <td className="py-2.5 px-3 text-center font-bold text-slate-600">
                          {issue.numberOfDays} {issue.numberOfDays === 1 ? 'Day' : 'Days'}
                        </td>
                        
                        {/* Total Amount */}
                        <td className="py-2.5 px-3 text-right font-black text-slate-800">
                          LKR {issue.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* Payment */}
                        <td className="py-2.5 px-3">
                          <div className="flex justify-center">
                            <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider ${
                              issue.paymentStatus === 'paid'
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : "bg-amber-50 text-amber-600 border-amber-100"
                            }`}>
                              {issue.paymentStatus === 'paid' ? '✓ Paid' : '⏳ Unpaid'}
                            </span>
                          </div>
                        </td>
                        
                        {/* Status */}
                        <td className="py-2.5 px-3">
                          <div className="flex justify-center">
                            <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                              issue.status === 'Returned'
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : issue.status === 'Overdue'
                                  ? "bg-rose-50 text-rose-600 border-rose-100"
                                  : "bg-amber-50 text-amber-600 border-amber-100"
                            }`}>
                              {getStatusIcon(issue.status || 'Pending')}
                              <span>{issue.status}</span>
                            </div>
                          </div>
                        </td>

                        {/* Actions Quick Access */}
                        <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1 justify-end">
                            {/* A4 / A5 quick-print toggle */}
                            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded">
                              <button
                                onClick={() => handlePrint(issue, 'A4')}
                                title="Print A4"
                                className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-blue-600 hover:bg-blue-100 transition-all"
                              >
                                A4
                              </button>
                              <button
                                onClick={() => handlePrint(issue, 'A5')}
                                title="Print A5"
                                className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-violet-600 hover:bg-violet-100 transition-all"
                              >
                                A5
                              </button>
                            </div>
                            <Printer className="w-3 h-3 text-slate-300 select-none" />
                            {(issue.status === 'Pending' || issue.status === 'Overdue') && (
                              <button
                                onClick={() => handleOpenReturnModal(issue)}
                                title="Complete Return"
                                className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Collapsible Detail Panel Row */}
                      {isExpanded && (
                        <tr className="bg-blue-50/20">
                          <td colSpan={10} className="px-6 py-4 border-t border-b border-blue-100/30">
                            <div className="space-y-4 animate-in slide-in-from-top-1 duration-200">
                              
                              {/* Metadata Grid */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-100/30 rounded-xl border border-slate-200/50">
                                <div className="space-y-0.5">
                                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Customer ID</div>
                                  <div className="text-xs font-bold text-slate-700">#{issue.customer.id}</div>
                                </div>
                                <div className="space-y-0.5">
                                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Return Estimate</div>
                                  <div className="text-xs font-bold text-slate-700">{new Date(issue.returnDate).toLocaleDateString()}</div>
                                </div>
                                <div className="space-y-0.5">
                                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Issued Timestamp</div>
                                  <div className="text-xs font-bold text-slate-700">{new Date(issue.issuedDate).toLocaleString()}</div>
                                </div>
                                <div className="space-y-0.5">
                                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Detailed Status</div>
                                  <div className={`text-[10px] font-black uppercase tracking-tight ${issue.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {issue.paymentStatus === 'paid' ? '✓ Fully Paid & Settled' : '⏳ Outstanding Balance'}
                                  </div>
                                </div>
                              </div>

                              {/* Equipment Details View */}
                              <div className="space-y-2">
                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">Equipment Details</h4>
                                <div className="grid grid-cols-1 gap-1.5">
                                  {issue.items && issue.items.length > 0 ? (
                                    issue.items.map((item, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-lg hover:border-primary/20 transition-all group/item">
                                        <div className="flex items-center gap-3">
                                          <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover/item:bg-primary/10 group-hover/item:text-primary transition-colors">
                                            {idx + 1}
                                          </div>
                                          <div>
                                            <div className="text-xs font-bold text-slate-800">{item.name}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                              <span className="text-[8px] font-bold text-slate-400 uppercase">Quantity: {item.quantity}</span>
                                              {item.serialNumbers && item.serialNumbers.length > 0 && (
                                                <div className="flex gap-1 flex-wrap">
                                                  {item.serialNumbers.map((sn) => (
                                                    <span key={sn} className="text-[8px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded uppercase select-all">{sn}</span>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-xs text-slate-400 italic py-1 px-0.5">Loading itemized equipment specifications...</div>
                                  )}
                                </div>
                              </div>

                              {/* Footer Action Controls */}
                              <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200/50">
                                <div>
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Financial Status</span>
                                  <span className={`text-[10px] font-black uppercase tracking-tight ${issue.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {issue.paymentStatus === 'paid' ? '✓ Fully Settled' : '⚠ Outstanding Payment'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 w-full md:w-auto justify-end">
                                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                                  <Button
                                    onClick={() => handlePrint(issue, 'A4')}
                                    variant="outline"
                                    className="flex-1 md:flex-none border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 font-bold text-[10px] uppercase tracking-wider h-8 rounded-lg"
                                  >
                                    <Printer className="w-3.5 h-3.5 mr-1" />
                                    Print A4
                                  </Button>
                                  <Button
                                    onClick={() => handlePrint(issue, 'A5')}
                                    variant="outline"
                                    className="flex-1 md:flex-none border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 hover:text-violet-800 font-bold text-[10px] uppercase tracking-wider h-8 rounded-lg"
                                  >
                                    <Printer className="w-3.5 h-3.5 mr-1" />
                                    Print A5
                                  </Button>
                                </div>

                                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                                  <Button
                                    onClick={() => handleDownload(issue, 'A4')}
                                    variant="outline"
                                    className="flex-1 md:flex-none border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 font-bold text-[10px] uppercase tracking-wider h-8 rounded-lg"
                                  >
                                    <Download className="w-3.5 h-3.5 mr-1" />
                                    A4 PDF
                                  </Button>
                                  <Button
                                    onClick={() => handleDownload(issue, 'A5')}
                                    variant="outline"
                                    className="flex-1 md:flex-none border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 hover:text-violet-800 font-bold text-[10px] uppercase tracking-wider h-8 rounded-lg"
                                  >
                                    <Download className="w-3.5 h-3.5 mr-1" />
                                    A5 PDF
                                  </Button>
                                </div>

                                  {issue.paymentStatus === 'unpaid' && (
                                    <Button
                                      onClick={() => handleMarkAsPaid(issue.id)}
                                      className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider h-8 rounded-lg shadow-sm"
                                    >
                                      Mark Paid
                                    </Button>
                                  )}

                                  {(issue.status === 'Pending' || issue.status === 'Overdue') && (
                                    <Button
                                      onClick={() => handleOpenReturnModal(issue)}
                                      className="flex-1 md:flex-none bg-primary hover:bg-primary/95 text-white font-bold text-[10px] uppercase tracking-wider h-8 rounded-lg shadow-sm"
                                    >
                                      Complete Return
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Complete Return Custom Modal */}
      <CompleteReturnModal
        issue={activeReturnIssue!}
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        onSuccess={() => {
          loadIssues()
          alert("Return completed successfully! Triggering receipt print...")
        }}
      />
    </div>
  )
}
