"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IssueReceipt } from "./issue-receipt"
import { SerialSelectionModal } from "./serial-selection-modal"
import { ChevronDown } from "lucide-react"
import { getCustomers, getInventoryItems, createBooking, checkAvailability, createIssue, getCustomerById } from "@/lib/db"
import { generateIssuePDF, printIssuePDF, type IssueReceiptData } from "./issue-receipt"

interface Customer {
  id: string
  name: string
  phone?: string
  address?: string
  nic?: string
}

interface InventoryItem {
  id: string
  name: string
  category: string
  quantity_available: number
  rental_rate_per_day?: number
}

interface SelectedItem {
  id: string
  quantity: number
  condition: string
  price: number
  serialNumbers: string[]
}

interface ItemWithSerials {
  id: string
  name: string
  category: string
  quantity_available: number
  rental_rate_per_day?: number
  serial_numbers?: Array<{ id: string; serial_code: string; status: string }>
}

export function CreateIssueForm() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [numberOfDays, setNumberOfDays] = useState(1)
  const [returnDate, setReturnDate] = useState(new Date(new Date().getTime() + 86400000).toISOString().split('T')[0])
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "paid">("unpaid")
  const [selectedItemForSerials, setSelectedItemForSerials] = useState<{ id: string; name: string; availableSerials: any[] } | null>(null)
  const [showSerialModal, setShowSerialModal] = useState(false)
  const [pendingItemToAdd, setPendingItemToAdd] = useState<string | null>(null)

  function calculateReturnDate(issDate: string, days: number) {
    const date = new Date(issDate)
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
  }

  function calculateDaysBetween(issDate: string, retDate: string) {
    const start = new Date(issDate)
    const end = new Date(retDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(1, diffDays)
  }

  function handleIssueeDateChange(newDate: string) {
    setIssueDate(newDate)
    // Update return date based on current number of days
    const newReturnDate = calculateReturnDate(newDate, numberOfDays)
    setReturnDate(newReturnDate)
  }

  function handleNumberOfDaysChange(days: number) {
    const validDays = Math.max(1, days)
    setNumberOfDays(validDays)
    // Update return date based on new number of days
    const newReturnDate = calculateReturnDate(issueDate, validDays)
    setReturnDate(newReturnDate)
  }

  function handleReturnDateChange(newReturnDate: string) {
    setReturnDate(newReturnDate)
    // Calculate and update number of days based on new return date
    const calculatedDays = calculateDaysBetween(issueDate, newReturnDate)
    setNumberOfDays(calculatedDays)
  }

  function getTotalAmount() {
    return selectedItems.reduce((sum, item) => sum + (item.price * item.quantity * numberOfDays), 0)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Re-validate availability when dates change
  useEffect(() => {
    if (selectedItems.length > 0) {
      const validateSelectedItems = async () => {
        try {
          const res = await checkAvailability(
            1,
            selectedItems.map((si) => ({
              inventory_item_id: Number.parseInt(si.id),
              quantity: si.quantity,
            })),
            issueDate,
            returnDate,
          )

          if (!res.available) {
            const unavailableItems = res.items
              .filter((item: any) => !item.available)
              .map((item: any) => item.name)
              .join(", ")
            alert(`Availability warning: The following items are not available for the selected dates: ${unavailableItems}`)
          }
        } catch (error) {
          console.error("Failed to re-validate availability:", error)
        }
      }
      validateSelectedItems()
    }
  }, [issueDate, returnDate])


  async function loadData() {
    try {
      const [customersData, inventoryData] = await Promise.all([
        getCustomers(1),
        getInventoryItems(1)
      ])
      setCustomers(customersData)
      setInventory(inventoryData)
    } catch (error) {
      console.error("Failed to load data:", error)
    }
  }

  async function handleAddItem(itemId: string) {
    const item = inventory.find((i) => i.id === itemId) as ItemWithSerials
    if (!item) return

    const existing = selectedItems.find((si) => si.id === itemId)
    const currentQty = existing ? existing.quantity : 0
    const newQty = currentQty + 1

    try {
      // Check date-aware availability
      const res = await checkAvailability(
        1,
        [{ inventory_item_id: Number(itemId), quantity: newQty }],
        issueDate,
        returnDate
      )

      if (!res.available) {
        alert(`Sorry, ${item.name} is not available for the selected dates. ${res.items[0].peak_reserved}/${res.items[0].total_quantity} already reserved.`)
        return
      }

      if (existing) {
        setSelectedItems(
          selectedItems.map((si) => (si.id === itemId ? { ...si, quantity: newQty } : si))
        )
      } else {
        const availableSerials = item.serial_numbers?.filter(s => s.status === "Available").map(s => s.serial_code) || []
        setSelectedItems([...selectedItems, {
          id: itemId,
          quantity: 1,
          condition: "Good",
          price: Number(item.rental_rate_per_day) || 0,
          serialNumbers: availableSerials.slice(0, 1)
        }])
      }
    } catch (error) {
      console.error("Availability check failed:", error)
      alert("Could not verify availability. Please try again.")
    }
  }


  function handleRemoveItem(itemId: string) {
    setSelectedItems(selectedItems.filter((si) => si.id !== itemId))
  }

  async function handleQuantityChange(itemId: string, quantity: number) {
    if (quantity <= 0) {
      handleRemoveItem(itemId)
      return
    }

    try {
      // Check date-aware availability
      const res = await checkAvailability(
        1,
        [{ inventory_item_id: Number(itemId), quantity }],
        issueDate,
        returnDate
      )

      if (!res.available) {
        alert(`Cannot increase quantity. Only ${res.items[0].available_quantity} units available for this period.`)
        return
      }

      setSelectedItems(selectedItems.map((si) => (si.id === itemId ? { ...si, quantity } : si)))
    } catch (error) {
      console.error("Availability check failed:", error)
    }
  }


  function handleConditionChange(itemId: string, condition: string) {
    setSelectedItems(selectedItems.map((si) => (si.id === itemId ? { ...si, condition } : si)))
  }

  function handlePriceChange(itemId: string, price: number) {
    setSelectedItems(selectedItems.map((si) => (si.id === itemId ? { ...si, price } : si)))
  }

  function handleSerialChange(itemId: string, serialNumbers: string[]) {
    setSelectedItems(selectedItems.map((si) => (si.id === itemId ? { ...si, serialNumbers } : si)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedCustomerId || selectedItems.length === 0) {
      alert("Please select a customer and items")
      return
    }

    try {
      const payload = {
        org_id: 1,
        customer_id: Number(selectedCustomerId),
        issue_date: issueDate,
        return_date: returnDate,
        items: selectedItems.map(si => ({
          inventory_item_id: Number(si.id),
          quantity: si.quantity,
          price: si.price,
          condition: si.condition,
          serial_codes: si.serialNumbers
        })),
        notes: "Issued via Issue Form",
        payment_status: paymentStatus
      }

      const result = await createIssue(payload)

      // Automatically generate and print the PDF receipt
      let customerName = "N/A"
      let customerPhone = "N/A"
      let customerAddress = ""
      let customerNIC = ""

      const customer = customers.find((c) => String(c.id) === String(selectedCustomerId))
      if (customer) {
        customerName = customer.name || "N/A"
        customerPhone = customer.phone || "N/A"
        customerAddress = customer.address || ""
        customerNIC = customer.nic || ""
      } else if (selectedCustomerId) {
        try {
          const fetchedCustomer = await getCustomerById(Number(selectedCustomerId))
          if (fetchedCustomer) {
            customerName = fetchedCustomer.name || "N/A"
            customerPhone = fetchedCustomer.phone || "N/A"
            customerAddress = fetchedCustomer.address || ""
            customerNIC = fetchedCustomer.nic || ""
          }
        } catch (cErr) {
          console.error("Failed to fetch customer dynamically:", cErr)
        }
      }

      const receiptData: IssueReceiptData = {
        id: result.id,
        issue_number: result.issue_number,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        customer_nic: customerNIC,
        status: "Issued",
        issue_date: issueDate,
        return_date: returnDate,
        total_amount: getTotalAmount(),
        payment_status: paymentStatus,
        items: selectedItems.map((si) => {
          const item = inventory.find((i) => String(i.id) === String(si.id))
          return {
            id: Number(item?.id),
            name: item?.name || "N/A",
            quantity: si.quantity,
            price: si.price,
            serial_codes: si.serialNumbers,
          }
        }),
      }

      await printIssuePDF(receiptData)

      alert("Issue processed successfully! Receipt print dialog has been triggered.")

      // Reset form
      setSelectedItems([])
      setSelectedCustomerId("")
    } catch (error) {
      console.error("Failed to process issue:", error)
      alert("Failed to process issue: " + (error as Error).message)
    }
  }


  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-2">
          {/* Metadata: Date & Customer */}
          <Card className="p-5 border-slate-200 shadow-sm rounded-2xl bg-white space-y-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-primary rounded-full" />
                Issue Parameters
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="issue-date" className="text-xs font-medium text-slate-500 uppercase">Issue Date</Label>
                    <Input
                      id="issue-date"
                      type="date"
                      value={issueDate}
                      onChange={(e) => handleIssueeDateChange(e.target.value)}
                      className="h-9 text-sm border-slate-200 focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="days" className="text-xs font-medium text-slate-500 uppercase">Duration (Days)</Label>
                    <Input
                      id="days"
                      type="number"
                      min="1"
                      value={numberOfDays}
                      onChange={(e) => handleNumberOfDaysChange(parseInt(e.target.value) || 1)}
                      className="h-9 text-sm border-slate-200 focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="return-date" className="text-xs font-medium text-slate-500 uppercase">Estimated Return</Label>
                  <Input
                    id="return-date"
                    type="date"
                    value={returnDate}
                    onChange={(e) => handleReturnDateChange(e.target.value)}
                    className="h-9 text-sm border-slate-200 focus:border-primary transition-colors"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <Label htmlFor="customer" className="text-xs font-medium text-slate-500 uppercase mb-2 block">Select Customer</Label>
                  <select
                    id="customer"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all bg-slate-50/50"
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Payment</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentStatus("unpaid")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${paymentStatus === "unpaid"
                    ? "border-amber-200 bg-amber-50 text-amber-700 ring-2 ring-amber-200/20"
                    : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                    }`}
                >
                  <span className="text-xs font-bold uppercase">Unpaid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus("paid")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${paymentStatus === "paid"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200/20"
                    : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                    }`}
                >
                  <span className="text-xs font-bold uppercase">Paid</span>
                </button>
              </div>
            </div>
          </Card>

          {/* Catalog Selection */}
          <Card className="p-5 border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col h-[400px]">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-primary rounded-full" />
              Item Catalog
            </h3>
            <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {inventory.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleAddItem(item.id as string)}
                  className="w-full text-left p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50 hover:border-blue-200 transition-all group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-slate-900 group-hover:text-primary transition-colors text-sm">{item.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.category}</div>
                    </div>
                    <div className="bg-white px-2 py-0.5 rounded-full border border-slate-200 text-[10px] font-bold text-slate-600">
                      LKR {item.rental_rate_per_day}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.quantity_available > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span className="text-[11px] font-medium text-slate-500">Stock: {item.quantity_available}</span>
                    </div>
                    <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">ADD +</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {/* Selected Items List */}
          <Card className="p-0 border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col h-full min-h-[500px]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-4 bg-primary rounded-full" />
                Selected Items
              </h3>
              {selectedItems.length > 0 && (
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                  {selectedItems.length} {selectedItems.length === 1 ? 'Item' : 'Items'}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-x-auto">
              {selectedItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl text-slate-300">🛒</span>
                  </div>
                  <p className="text-slate-400 font-medium">Your selection is empty</p>
                  <p className="text-xs text-slate-400 mt-1">Add items from the catalog on the left to get started.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">
                      <th className="py-4 px-6 border-b border-slate-100">Equipment</th>
                      <th className="py-4 px-4 border-b border-slate-100 text-center">Qty</th>
                      <th className="py-4 px-4 border-b border-slate-100 text-right">Rate</th>
                      <th className="py-4 px-4 border-b border-slate-100 text-right">Subtotal</th>
                      <th className="py-4 px-4 border-b border-slate-100 text-center">Configuration</th>
                      <th className="py-4 px-6 border-b border-slate-100 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {selectedItems.map((si) => {
                      const item = inventory.find((i) => i.id === si.id) as ItemWithSerials
                      const itemTotal = si.price * si.quantity * numberOfDays
                      return (
                        <tr key={si.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-semibold text-slate-900 text-sm">{item?.name}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{item?.category}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(si.id, si.quantity - 1)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 transition-colors text-slate-400 font-bold"
                              >
                                -
                              </button>
                              <Input
                                type="number"
                                min="1"
                                value={si.quantity}
                                onChange={(e) => handleQuantityChange(si.id, Number.parseInt(e.target.value))}
                                className="w-10 h-7 text-xs p-0 text-center border-none shadow-none focus-visible:ring-0 font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(si.id, si.quantity + 1)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 transition-colors text-slate-400 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="relative inline-block w-24">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">LKR</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={si.price}
                                onChange={(e) => handlePriceChange(si.id, Number.parseFloat(e.target.value) || 0)}
                                className="h-8 text-xs text-right pl-7 border-slate-200 focus:border-primary font-medium"
                              />
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="text-sm font-bold text-slate-900">
                              {itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] font-medium text-slate-400">{numberOfDays} {numberOfDays === 1 ? 'Day' : 'Days'}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1.5 items-center">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedItemForSerials(si)
                                  setShowSerialModal(true)
                                }}
                                className={`h-7 px-3 text-[10px] font-bold uppercase tracking-wider transition-all ${si.serialNumbers.length > 0
                                  ? "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                                  : "border-slate-200 text-slate-400 hover:text-slate-600"
                                  }`}
                              >
                                {si.serialNumbers.length > 0
                                  ? `${si.serialNumbers.length} Serial(s)`
                                  : "Assign Serials"}
                              </Button>
                              <select
                                value={si.condition}
                                onChange={(e) => handleConditionChange(si.id, e.target.value)}
                                className="text-[10px] font-bold border-none bg-slate-100 rounded-lg px-2 py-1 text-slate-500 uppercase tracking-tighter focus:ring-0 cursor-pointer hover:bg-slate-200 transition-colors"
                              >
                                <option value="Good">Good Condition</option>
                                <option value="Fair">Fair Condition</option>
                                <option value="Poor">Poor Condition</option>
                              </select>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(si.id)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Sticky Summary & Footer */}
            <div className="p-6 bg-slate-900 border-t border-slate-800">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-8">
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Grand Total</div>
                    <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">LKR</span>
                      {getTotalAmount().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-widest transition-all ${paymentStatus === "paid"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    }`}>
                    {paymentStatus === "paid" ? "✅ Fully Paid" : "⏳ Unpaid / Pending"}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!selectedCustomerId || selectedItems.length === 0}
                  className="w-full md:w-auto px-10 py-6 bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 text-sm font-bold uppercase tracking-widest disabled:opacity-50 disabled:grayscale disabled:shadow-none"
                >
                  Confirm & Generate Receipt
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </form>

      {/* Serial Selection Modal */}
      {selectedItemForSerials && (
        <SerialSelectionModal
          isOpen={showSerialModal}
          itemName={inventory.find((i) => i.id === selectedItemForSerials.id)?.name || "Item"}
          availableSerials={
            (inventory.find((i) => i.id === selectedItemForSerials.id) as ItemWithSerials)?.serial_numbers?.filter(
              (s) => s.status === "Available"
            ) || []
          }
          selectedSerials={selectedItemForSerials.serialNumbers}
          quantity={selectedItemForSerials.quantity}
          onConfirm={(serials) => {
            handleSerialChange(selectedItemForSerials.id, serials)
            setShowSerialModal(false)
            setSelectedItemForSerials(null)
          }}
          onCancel={() => {
            setShowSerialModal(false)
            setSelectedItemForSerials(null)
          }}
        />
      )}
    </div>
  )
}
