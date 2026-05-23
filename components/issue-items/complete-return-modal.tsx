'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Printer, X } from 'lucide-react'
import { getIssueById, updateIssue, getCustomerById } from '@/lib/db'
import { printIssuePDF } from './issue-receipt'

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
  status?: 'Pending' | 'Returned' | 'Overdue' | 'Returned Damaged'
}

interface CompleteReturnModalProps {
  issue: IssueItem
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CompleteReturnModal({ issue, isOpen, onClose, onSuccess }: CompleteReturnModalProps) {
  const [actualReturnDate, setActualReturnDate] = useState('')
  const [returnStatus, setReturnStatus] = useState<'Returned' | 'Returned Damaged'>('Returned')
  const [returnPaymentStatus, setReturnPaymentStatus] = useState<'paid' | 'unpaid'>('paid')
  const [damageNotes, setDamageNotes] = useState('')
  const [activeReturnDetails, setActiveReturnDetails] = useState<any | null>(null)
  const [submittingReturn, setSubmittingReturn] = useState(false)

  useEffect(() => {
    if (isOpen && issue) {
      setActualReturnDate(new Date().toISOString().split('T')[0])
      setReturnStatus('Returned')
      setReturnPaymentStatus('paid')
      setDamageNotes('')
      setActiveReturnDetails(null)
      loadIssueDetails()
    }
  }, [isOpen, issue])

  async function loadIssueDetails() {
    try {
      const details = await getIssueById(Number(issue.id))
      setActiveReturnDetails(details)
    } catch (error) {
      console.error("Failed to fetch return details:", error)
    }
  }

  const getComputedDays = () => {
    if (!issue || !actualReturnDate) return 1
    const d1 = new Date(issue.issueDate)
    const d2 = new Date(actualReturnDate)
    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate())
    const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate())
    return Math.max(Math.ceil((utc2 - utc1) / (1000 * 60 * 60 * 24)), 1)
  }

  const getComputedTotal = (days: number) => {
    if (!activeReturnDetails || !activeReturnDetails.items) return 0
    return activeReturnDetails.items.reduce((sum: number, item: any) => {
      const price = Number(item.price || 0)
      const qty = Number(item.quantity || 0)
      return sum + (price * qty * days)
    }, 0)
  }

  async function handleSubmitReturn() {
    if (!issue) return
    try {
      setSubmittingReturn(true)
      
      const computedDays = getComputedDays()
      const computedTotal = getComputedTotal(computedDays)

      await updateIssue(Number(issue.id), {
        status: returnStatus,
        return_date: actualReturnDate,
        payment_status: returnPaymentStatus,
        damage_notes: returnStatus === 'Returned Damaged' ? damageNotes : null
      })

      // Fetch updated details from db to print and map
      const updatedDetails = await getIssueById(Number(issue.id))
      
      const itemsWithMappedFields = updatedDetails.items.map((item: any) => ({
        id: item.inventory_item_id,
        name: item.name,
        quantity: item.quantity,
        price: Number(item.price || 0),
        serial_codes: item.serial_codes || []
      }))

      let customerName = updatedDetails.customer_name || "N/A"
      let customerPhone = updatedDetails.customer_phone || "N/A"
      let customerAddress = updatedDetails.customer_address || ""
      let customerNIC = updatedDetails.customer_nic || ""
      let issueAddress = updatedDetails.issue_address || ""

      const customerId = updatedDetails.customer_id || issue.customer.id
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

      const receiptData = {
        id: Number(updatedDetails.id),
        issue_number: updatedDetails.issue_number,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        customer_nic: customerNIC,
        issue_address: issueAddress,
        status: updatedDetails.status || returnStatus,
        issue_date: updatedDetails.issue_date,
        return_date: updatedDetails.return_date,
        total_amount: Number(updatedDetails.total_amount || 0),
        payment_status: updatedDetails.payment_status,
        items: itemsWithMappedFields,
        notes: updatedDetails.notes || ""
      }

      // Auto print updated PDF!
      await printIssuePDF(receiptData)
      
      onSuccess()
      onClose()
    } catch (error) {
      console.error("Failed to submit return:", error)
      alert("Failed to submit return: " + (error as Error).message)
    } finally {
      setSubmittingReturn(false)
    }
  }

  if (!isOpen || !issue) return null

  const computedDays = getComputedDays()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative bg-white/95 rounded-3xl border border-slate-200/50 shadow-2xl shadow-slate-950/20 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Complete Return Process</span>
            <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">Issue: {issue.issueNumber}</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Customer summary */}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</div>
              <div className="text-sm font-black text-slate-800 mt-0.5">{issue.customer.name}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Original Issue Date</div>
              <div className="text-xs font-bold text-slate-700 mt-0.5">{new Date(issue.issueDate).toLocaleDateString()}</div>
            </div>
          </div>

          {/* Form Input fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Return Date Datepicker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">Actual Return Date</Label>
              <Input 
                type="date"
                value={actualReturnDate}
                onChange={(e) => setActualReturnDate(e.target.value)}
                min={issue.issueDate.split('T')[0]}
                className="border-slate-200 rounded-xl h-11 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all bg-slate-50/50"
              />
            </div>

            {/* Return Status Condition Dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">Equipment Return Status</Label>
              <select
                value={returnStatus}
                onChange={(e) => setReturnStatus(e.target.value as any)}
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-semibold text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer hover:border-slate-300"
              >
                <option value="Returned">Good Condition (Returned)</option>
                <option value="Returned Damaged">Damaged Condition (Returned Damaged)</option>
              </select>
            </div>

            {/* Payment status dropdown */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">Payment Settlement Status</Label>
              <select
                value={returnPaymentStatus}
                onChange={(e) => setReturnPaymentStatus(e.target.value as any)}
                className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-semibold text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer hover:border-slate-300"
              >
                <option value="paid">Fully Settled (Paid)</option>
                <option value="unpaid">Outstanding (Unpaid)</option>
              </select>
            </div>

            {/* Conditionally rendered Damage Notes */}
            {returnStatus === 'Returned Damaged' && (
              <div className="space-y-1.5 md:col-span-2 animate-in slide-in-from-top-1 duration-200">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">Damage Description / Notes</Label>
                <textarea
                  value={damageNotes}
                  onChange={(e) => setDamageNotes(e.target.value)}
                  placeholder="Enter details about the damage (e.g., lens scratch, cracked body)..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all resize-none"
                />
              </div>
            )}
          </div>

          {/* Dynamic Live Price Recalculation Section */}
          <div className="p-5 border border-primary/20 bg-primary/[0.01] rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-primary/10 pb-3">
              <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Live Dynamic Recalculation</h4>
              <div className="px-2 py-0.5 bg-primary/10 rounded text-[9px] font-bold text-primary uppercase">
                {computedDays} {computedDays === 1 ? 'Day' : 'Days'} Duration
              </div>
            </div>

            {activeReturnDetails ? (
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {activeReturnDetails.items?.map((item: any, idx: number) => {
                  const itemRate = Number(item.price || 0)
                  const itemQty = Number(item.quantity || 0)
                  const itemSubtotal = itemRate * itemQty * computedDays
                  return (
                    <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100 last:border-0">
                      <div>
                        <span className="font-extrabold text-slate-700">{item.name}</span>
                        <span className="text-[10px] text-slate-400 ml-2">Qty: {itemQty} × LKR {itemRate.toFixed(2)} / day</span>
                      </div>
                      <span className="font-black text-slate-900">LKR {itemSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-400 text-center py-4">Recalculating items...</div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-primary/10">
              <span className="text-xs font-black text-slate-500 uppercase">Recalculated Total Amount</span>
              <span className="text-lg font-black text-primary">
                LKR {getComputedTotal(computedDays).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-[11px] uppercase tracking-wider h-10 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitReturn}
            disabled={submittingReturn}
            className="bg-primary hover:bg-primary/90 text-white font-bold text-[11px] uppercase tracking-wider h-10 rounded-xl shadow-lg shadow-primary/20 flex items-center"
          >
            {submittingReturn ? (
              <>
                <span className="animate-spin mr-2 w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                Completing...
              </>
            ) : (
              <>
                <Printer className="w-3.5 h-3.5 mr-2" />
                Confirm & Print Receipt
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
