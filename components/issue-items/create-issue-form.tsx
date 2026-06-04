"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IssueReceipt } from "./issue-receipt"
import { SerialSelectionModal } from "./serial-selection-modal"
import { ChevronDown, Search, Trash2 } from "lucide-react"
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
  is_have_serial?: number | boolean
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
  is_have_serial?: number | boolean
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
  const [selectedItemForSerials, setSelectedItemForSerials] = useState<SelectedItem | null>(null)
  const [showSerialModal, setShowSerialModal] = useState(false)
  const [pendingItemToAdd, setPendingItemToAdd] = useState<string | null>(null)
  const [issueAddress, setIssueAddress] = useState("")
  const [catalogSearch, setCatalogSearch] = useState("")

  // Prefill issue address when customer is selected
  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find((c) => String(c.id) === String(selectedCustomerId))
      if (customer && customer.address) {
        setIssueAddress(customer.address)
      } else {
        setIssueAddress("")
      }
    } else {
      setIssueAddress("")
    }
  }, [selectedCustomerId, customers])

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
        payment_status: paymentStatus,
        issue_address: issueAddress
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
        issue_address: issueAddress,
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
      setIssueAddress("")
    } catch (error) {
      console.error("Failed to process issue:", error)
      alert("Failed to process issue: " + (error as Error).message)
    }
  }


  // Filter inventory based on search input
  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    item.category.toLowerCase().includes(catalogSearch.toLowerCase())
  )

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-in fade-in duration-200">
        <div className="lg:col-span-4 space-y-2">
          {/* Metadata: Date & Customer */}
          <Card className="p-3 border-slate-200 shadow-sm rounded-xl bg-white space-y-2">
            <div>
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span className="w-1 h-3 bg-primary rounded-full" />
                Issue Parameters
              </h3>

              <div className="space-y-2">
                {/* 3-Column Dates Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="issue-date" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issue Date</Label>
                    <Input
                      id="issue-date"
                      type="date"
                      value={issueDate}
                      onChange={(e) => handleIssueeDateChange(e.target.value)}
                      className="h-8 px-1.5 text-xs border-slate-200 focus-visible:ring-1 focus-visible:ring-primary rounded-lg transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="days" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Days</Label>
                    <Input
                      id="days"
                      type="number"
                      min="1"
                      value={numberOfDays}
                      onChange={(e) => handleNumberOfDaysChange(parseInt(e.target.value) || 1)}
                      className="h-8 px-1.5 text-xs border-slate-200 focus-visible:ring-1 focus-visible:ring-primary rounded-lg transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="return-date" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Return Date</Label>
                    <Input
                      id="return-date"
                      type="date"
                      value={returnDate}
                      onChange={(e) => handleReturnDateChange(e.target.value)}
                      className="h-8 px-1.5 text-xs border-slate-200 focus-visible:ring-1 focus-visible:ring-primary rounded-lg transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <Label htmlFor="customer" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select Customer</Label>
                  <select
                    id="customer"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full h-8.5 border border-slate-200 rounded-lg px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all bg-slate-50/50"
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <Label htmlFor="issue-address" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issue Address</Label>
                  <textarea
                    id="issue-address"
                    value={issueAddress}
                    onChange={(e) => setIssueAddress(e.target.value)}
                    rows={1.5}
                    placeholder="Enter issue address..."
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all bg-slate-50/50 resize-none font-medium text-slate-800 h-11"
                  />
                </div>
              </div>
            </div>

            {/* Segmented Payment Toggle */}
            <div className="border-t border-slate-100 space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Status</h3>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPaymentStatus("unpaid")}
                  className={`py-1 rounded-md text-[10px] font-black uppercase transition-all duration-200 ${paymentStatus === "unpaid"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-200/50"
                    }`}
                >
                  Unpaid
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus("paid")}
                  className={`py-1 rounded-md text-[10px] font-black uppercase transition-all duration-200 ${paymentStatus === "paid"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-200/50"
                    }`}
                >
                  Paid
                </button>
              </div>
            </div>
          </Card>

          {/* Catalog Selection with Search */}
          <Card className="p-3 border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden flex flex-col h-[350px] space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1 h-3 bg-primary rounded-full" />
                Item Catalog
              </h3>
              <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                {filteredInventory.length} Available
              </span>
            </div>

            {/* Catalog Live Search Bar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Quick search equipment..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="h-8 pl-8 text-xs border-slate-200 rounded-lg focus-visible:ring-1 focus-visible:ring-primary bg-slate-50/50"
              />
            </div>

            <div className="space-y-1.5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {filteredInventory.length > 0 ? (
                filteredInventory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAddItem(item.id as string)}
                    className="w-full text-left p-2 rounded-lg border border-slate-100 bg-slate-50/30 hover:bg-primary/[0.03] hover:border-primary/20 transition-all group flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 group-hover:text-primary transition-colors text-xs truncate">{item.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight">{item.category}</span>
                        <span className="text-[10px] text-slate-300 select-none">•</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${item.quantity_available > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="text-[9px] font-semibold text-slate-500">Qty: {item.quantity_available}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-black text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 group-hover:bg-primary group-hover:text-white group-hover:border-transparent transition-all">
                        LKR {item.rental_rate_per_day}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 font-medium">No inventory matches search</div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8 flex flex-col">
          {/* Selected Items List */}
          <Card className="p-0 border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden flex flex-col h-full min-h-[450px]">
            <div className="p-3 px-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1 h-3.5 bg-primary rounded-full" />
                Selected Items
              </h3>
              {selectedItems.length > 0 && (
                <div className="text-[10px] font-black text-slate-500 uppercase bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-sm">
                  {selectedItems.length} {selectedItems.length === 1 ? 'Item' : 'Items'}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {selectedItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-10 text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100">
                    <span className="text-lg text-slate-400">🛒</span>
                  </div>
                  <p className="text-slate-500 text-xs font-bold">Your selection is empty</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto">Add equipment from the catalog on the left to build the issuance record.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left border-b border-slate-100">
                      <th className="py-2.5 px-4">Equipment</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Daily Rate</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                      <th className="py-2.5 px-3 text-center">Configuration</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {selectedItems.map((si) => {
                      const item = inventory.find((i) => i.id === si.id) as ItemWithSerials
                      const itemTotal = si.price * si.quantity * numberOfDays
                      return (
                        <tr key={si.id} className="group hover:bg-slate-50/40 transition-colors">
                          <td className="py-2 px-4">
                            <div className="font-bold text-slate-800 text-xs truncate max-w-[180px]">{item?.name}</div>
                            <div className="text-[8px] text-slate-400 uppercase font-black tracking-tight">{item?.category}</div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(si.id, si.quantity - 1)}
                                className="w-5 h-5 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-100 transition-colors text-slate-400 font-bold text-xs"
                              >
                                -
                              </button>
                              <span className="w-5 text-center text-xs font-black text-slate-700">{si.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(si.id, si.quantity + 1)}
                                className="w-5 h-5 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-100 transition-colors text-slate-400 font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="relative inline-block w-20">
                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400">LKR</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={si.price}
                                onChange={(e) => handlePriceChange(si.id, Number.parseFloat(e.target.value) || 0)}
                                className="h-7 text-[11px] text-right pl-6 pr-1 border-slate-200 focus-visible:ring-1 focus-visible:ring-primary rounded font-bold"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="text-xs font-black text-slate-800">
                              {itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{numberOfDays} {numberOfDays === 1 ? 'Day' : 'Days'}</div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5 justify-center">
                              {item?.is_have_serial ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedItemForSerials(si)
                                    setShowSerialModal(true)
                                  }}
                                  className={`h-6 px-1.5 text-[9px] font-black uppercase tracking-wider transition-all rounded ${si.serialNumbers.length > 0
                                    ? "bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                                    : "border-slate-200 text-slate-400 hover:text-slate-600"
                                    }`}
                                >
                                  {si.serialNumbers.length > 0
                                    ? `${si.serialNumbers.length} SN`
                                    : "Add SN"}
                                </Button>
                              ) : (
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded select-none">
                                  Bulk
                                </span>
                              )}
                              <select
                                value={si.condition}
                                onChange={(e) => handleConditionChange(si.id, e.target.value)}
                                className="text-[9px] font-bold border-none bg-slate-100 rounded px-1 py-0.5 text-slate-500 uppercase tracking-tighter focus:ring-0 cursor-pointer hover:bg-slate-200 transition-colors h-6"
                              >
                                <option value="Good">Good</option>
                                <option value="Fair">Fair</option>
                                <option value="Poor">Poor</option>
                              </select>
                            </div>
                          </td>
                          <td className="py-2 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(si.id)}
                              className="w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all ml-auto"
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

            {/* Sticky Compact Checkout Footer */}
            <div className="p-3 px-4 bg-slate-900 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-4">
                  <div className="space-y-0.5">
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Grand Total</div>
                    <div className="text-lg font-black text-white tracking-tight flex items-baseline gap-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mr-0.5 select-none">LKR</span>
                      {getTotalAmount().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider select-none ${paymentStatus === "paid"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    }`}>
                    {paymentStatus === "paid" ? "✓ Paid" : "⏳ Unpaid"}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!selectedCustomerId || selectedItems.length === 0}
                  className="w-full sm:w-auto px-5 bg-primary hover:bg-primary/95 text-white rounded-lg shadow-md shadow-primary/10 transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:grayscale disabled:shadow-none h-8.5"
                >
                  Confirm & Print Receipt
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
