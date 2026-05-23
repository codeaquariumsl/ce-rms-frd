'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown, Search, CheckCircle, Clock, AlertCircle, FileText, Printer, Download, X } from 'lucide-react'

import { getIssues, getIssueById, updateIssue, getCustomerById } from '@/lib/db'
import { IssueReceipt, printIssuePDF, generateIssuePDF } from './issue-receipt'
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

  async function handlePrint(issue: IssueItem) {
    try {
      const data = await fetchReceiptData(issue)
      await printIssuePDF(data)
    } catch (error) {
      console.error("Failed to print receipt:", error)
      alert("Failed to load issue details for printing.")
    }
  }

  async function handleDownload(issue: IssueItem) {
    try {
      const data = await fetchReceiptData(issue)
      await generateIssuePDF(data)
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
    <div className="space-y-4">
      {/* Streamlined Search & Filters */}
      <Card className="p-4 border-slate-200 shadow-sm rounded-2xl bg-white">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Filter by customer, issue ID, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 border-slate-200 bg-slate-50/50 focus:bg-white transition-all rounded-xl text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-10 border border-slate-200 rounded-xl px-4 text-sm font-semibold text-slate-600 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer hover:border-slate-300"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
              <option value="Returned">Returned</option>
            </select>
            <div className="h-10 px-4 flex items-center bg-slate-900 rounded-xl border border-slate-800 shadow-inner">
              <span className="text-[10px] font-bold text-slate-100 uppercase tracking-widest mr-3">Active Logs</span>
              <span className="text-sm font-black text-white">{filteredIssues.length}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Modern Issue List */}
      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="p-12 bg-white rounded-3xl border border-dashed border-slate-200 text-center">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium text-sm">No records match your criteria</p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className={`group bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${expandedId === issue.id
                ? "border-primary/30 shadow-xl shadow-primary/5 ring-1 ring-primary/5"
                : "border-slate-100 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-200/40"
                }`}
            >
              {/* Card Header Row */}
              <div
                className={`p-4 cursor-pointer transition-colors ${expandedId === issue.id ? 'bg-primary/[0.02]' : ''}`}
                onClick={() => toggleExpand(issue.id)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${expandedId === issue.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'
                      }`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-primary uppercase tracking-widest">{issue.issueNumber}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(issue.issueDate).toLocaleDateString()}</span>
                      </div>
                      <p className="font-bold text-slate-900 mt-0.5">{issue.customer.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="hidden md:block text-right">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Total Value</div>
                      <div className="text-sm font-black text-slate-900">LKR {issue.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${issue.status === 'Returned'
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                        : issue.status === 'Overdue'
                          ? "bg-rose-50 text-rose-600 border-rose-100"
                          : "bg-amber-50 text-amber-600 border-amber-100"
                        }`}>
                        {getStatusIcon(issue.status || 'Pending')}
                        {issue.status}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform duration-300 ${expandedId === issue.id ? 'rotate-180 text-primary' : ''}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Detail Panel */}
              {expandedId === issue.id && (
                <div className="px-6 pb-6 pt-2 space-y-6 border-t border-slate-50 animate-in slide-in-from-top-2 duration-300">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Contact</div>
                      <div className="text-xs font-bold text-slate-700">{issue.customer.phone || 'N/A'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Return Date</div>
                      <div className="text-xs font-bold text-slate-700">{new Date(issue.returnDate).toLocaleDateString()}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Log Duration</div>
                      <div className="text-xs font-bold text-slate-700">{issue.numberOfDays} {issue.numberOfDays === 1 ? 'Day' : 'Days'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Created At</div>
                      <div className="text-xs font-bold text-slate-700">{new Date(issue.issuedDate).toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Equipment Details</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {issue.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-primary/20 transition-all group/item">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400 group-hover/item:bg-primary/10 group-hover/item:text-primary transition-colors">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-800">{item.name}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Quantity: {item.quantity}</span>
                                {item.serialNumbers && item.serialNumbers.length > 0 && (
                                  <div className="flex gap-1">
                                    {item.serialNumbers.map((sn) => (
                                      <span key={sn} className="text-[9px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">{sn}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Financial Status</div>
                        <div className={`text-xs font-black uppercase tracking-tighter ${issue.paymentStatus === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {issue.paymentStatus === 'paid' ? '✓ Fully Settled' : '⚠ Outstanding Payment'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePrint(issue)
                        }}
                        variant="outline"
                        className="flex-1 md:flex-none border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-[11px] uppercase tracking-wider h-10 rounded-xl"
                      >
                        <Printer className="w-3.5 h-3.5 mr-2" />
                        Print
                      </Button>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(issue)
                        }}
                        variant="outline"
                        className="flex-1 md:flex-none border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-[11px] uppercase tracking-wider h-10 rounded-xl"
                      >
                        <Download className="w-3.5 h-3.5 mr-2" />
                        Download PDF
                      </Button>

                      {issue.paymentStatus === 'unpaid' && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsPaid(issue.id)
                          }}
                          className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] uppercase tracking-wider h-10 rounded-xl shadow-lg shadow-emerald-500/10"
                        >
                          Mark Paid
                        </Button>
                      )}

                      {(issue.status === 'Pending' || issue.status === 'Overdue') && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenReturnModal(issue)
                          }}
                          className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white font-bold text-[11px] uppercase tracking-wider h-10 rounded-xl shadow-lg shadow-primary/20"
                        >
                          Complete Return
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

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
