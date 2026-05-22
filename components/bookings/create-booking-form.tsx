"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import type { InventoryItem, Customer } from "@/lib/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { getCustomers, getInventoryItems, checkAvailability as apiCheckAvailability, createBooking } from "@/lib/db"

interface CreateBookingFormProps {
  organizationId: number
  onSuccess?: () => void
  onCancel?: () => void
}

export function CreateBookingForm({ organizationId, onSuccess, onCancel }: CreateBookingFormProps) {
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [selectedItems, setSelectedItems] = useState<Array<{ id: number; quantity: number; pricingType: "daily" | "weekly" | "monthly" }>>([])
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    customer_id: "",
    delivery_date: "",
    return_date: "",
    notes: "",
    advanceDeposit: 0,
    refundableDeposit: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [customersData, inventoryData] = await Promise.all([
        getCustomers(organizationId),
        getInventoryItems(organizationId)
      ])
      setCustomers(customersData)
      setInventory(inventoryData)
    } catch (error) {
      console.error("Failed to load customers/inventory:", error)
      setCustomers([])
      setInventory([])
    } finally {
      setLoading(false)
    }
  }

  function getAvailableItems() {
    // For now, return all inventory items. 
    // In a real app, the backend should filter these or we can filter based on availability check.
    return inventory
  }

  function calculateRentalDays() {
    if (!formData.delivery_date || !formData.return_date) return 0
    const delivery = new Date(formData.delivery_date)
    const returnDate = new Date(formData.return_date)
    const days = Math.ceil((returnDate.getTime() - delivery.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(days, 1)
  }

  function calculateItemPrice(item: InventoryItem, pricingType: "daily" | "weekly" | "monthly") {
    const days = calculateRentalDays()
    let totalPrice = 0

    if (pricingType === "daily") {
      totalPrice = item.rental_rate_per_day * days
    } else if (pricingType === "weekly") {
      const weeks = Math.ceil(days / 7)
      totalPrice = (item.rental_rate_per_week || item.rental_rate_per_day * 7) * weeks
    } else if (pricingType === "monthly") {
      const months = Math.ceil(days / 30)
      totalPrice = (item.rental_rate_per_month || item.rental_rate_per_day * 30) * months
    }

    return totalPrice
  }

  const handleAddItem = (itemId: number) => {
    const existing = selectedItems.find((i) => i.id === itemId)
    if (existing) {
      setSelectedItems(selectedItems.map((i) => (i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i)))
    } else {
      setSelectedItems([...selectedItems, { id: itemId, quantity: 1, pricingType: "daily" }])
    }
  }

  const handleRemoveItem = (itemId: number) => {
    setSelectedItems(selectedItems.filter((i) => i.id !== itemId))
  }

  const handleQuantityChange = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(itemId)
    } else {
      setSelectedItems(selectedItems.map((i) => (i.id === itemId ? { ...i, quantity } : i)))
    }
  }

  const handlePricingTypeChange = (itemId: number, pricingType: "daily" | "weekly" | "monthly") => {
    setSelectedItems(selectedItems.map((i) => (i.id === itemId ? { ...i, pricingType } : i)))
  }

  async function checkAvailability() {
    if (!formData.delivery_date || !formData.return_date) {
      setAvailabilityError("Please select delivery and return dates")
      return false
    }

    try {
      const items = selectedItems.map(si => ({
        inventory_item_id: Number(si.id),
        quantity: si.quantity
      }))

      const result = await apiCheckAvailability(
        organizationId,
        items,
        formData.delivery_date,
        formData.return_date
      )

      if (!result.available) {
        setAvailabilityError(result.message || "Some items are not available for the selected dates")
        return false
      }

      setAvailabilityError(null)
      return true
    } catch (error) {
      setAvailabilityError("Failed to check availability: " + (error as Error).message)
      return false
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.customer_id || selectedItems.length === 0) {
      alert("Please select a customer and at least one item")
      return
    }

    const isAvailable = await checkAvailability()
    if (!isAvailable) return

    try {
      setLoading(true)

      const payload = {
        org_id: organizationId,
        customer_id: Number(formData.customer_id),
        delivery_date: formData.delivery_date,
        return_date: formData.return_date,
        items: selectedItems.map(si => ({
          inventory_item_id: Number(si.id),
          quantity: si.quantity,
          pricing_type: si.pricingType
        })),
        notes: formData.notes,
        advance_deposit: formData.advanceDeposit,
        refundable_deposit: formData.refundableDeposit
      }

      await createBooking(payload)

      alert("Booking created successfully!")
      setFormData({ 
        customer_id: "", 
        delivery_date: "", 
        return_date: "", 
        notes: "",
        advanceDeposit: 0,
        refundableDeposit: 0
      })
      setSelectedItems([])
      onSuccess?.()
    } catch (error) {
      console.error("Failed to create booking:", error)
      alert("Failed to create booking: " + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const selectedItemsDetails = selectedItems
    .map((si) => inventory.find((i) => i.id === si.id))
    .filter(Boolean) as InventoryItem[]

  const totalAmount = selectedItemsDetails.reduce((sum, item) => {
    const selectedItem = selectedItems.find((si) => si.id === item.id)
    if (!selectedItem) return sum
    const unitPrice = calculateItemPrice(item, selectedItem.pricingType)
    return sum + unitPrice * selectedItem.quantity
  }, 0)

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6">Create New Booking</h2>

      {availabilityError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{availabilityError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <div className="space-y-2">
          <Label htmlFor="customer">Customer *</Label>
          <select
            id="customer"
            value={formData.customer_id}
            onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
            className="w-full p-2 border rounded-md"
            required
          >
            <option value="">Select a customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.phone || "No phone"}
              </option>
            ))}
          </select>
        </div>

        {/* Date Selection */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="delivery_date">Delivery Date *</Label>
            <Input
              id="delivery_date"
              type="date"
              value={formData.delivery_date}
              onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="return_date">Return Date *</Label>
            <Input
              id="return_date"
              type="date"
              value={formData.return_date}
              onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
              required
            />
          </div>
        </div>

        {/* Item Selection */}
        <div className="space-y-2">
          <Label>
            Select Items * 
            {formData.delivery_date && formData.return_date && (
              <span className="text-xs text-green-600 ml-2">
                (Showing items available for selected dates)
              </span>
            )}
          </Label>
          <div className="border rounded-md p-4 space-y-2 max-h-60 overflow-y-auto bg-blue-50">
            {!formData.delivery_date || !formData.return_date ? (
              <div className="text-center text-muted-foreground py-4">Select delivery and return dates to see available items.</div>
            ) : getAvailableItems().length === 0 ? (
              <div className="text-center text-muted-foreground py-4">No items available for selected dates.</div>
            ) : (
              getAvailableItems().map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleAddItem(item.id)}
                  className="w-full text-left p-3 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                >
                  <div className="font-medium text-primary">{item.name}</div>
                  <div className="text-sm text-muted-foreground">
                    ${item.rental_rate_per_day}/day - {item.quantity_available} available
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Selected Items Table */}
        {selectedItems.length > 0 && (
          <div className="border rounded-md p-4 bg-blue-50">
            <h3 className="font-semibold text-primary mb-4">Selected Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-primary">
                    <th className="text-left py-2 px-3 font-semibold text-primary">Item Name</th>
                    <th className="text-center py-2 px-3 font-semibold text-primary">Days</th>
                    <th className="text-left py-2 px-3 font-semibold text-primary">Qty</th>
                    <th className="text-left py-2 px-3 font-semibold text-primary">Pricing Type</th>
                    <th className="text-right py-2 px-3 font-semibold text-primary">Unit Price</th>
                    <th className="text-right py-2 px-3 font-semibold text-primary">Total</th>
                    <th className="text-center py-2 px-3 font-semibold text-primary">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItemsDetails.map((item) => {
                    const selectedItem = selectedItems.find((si) => si.id === item.id)
                    if (!selectedItem) return null

                    const unitPrice = calculateItemPrice(item, selectedItem.pricingType)
                    const total = unitPrice * selectedItem.quantity

                    return (
                      <tr key={item.id} className="border-b border-blue-100 hover:bg-blue-100">
                        <td className="py-3 px-3 font-medium">{item.name}</td>
                        <td className="py-3 px-3 text-center font-semibold text-primary">{calculateRentalDays()} days</td>
                        <td className="py-3 px-3">
                          <Input
                            type="number"
                            min="1"
                            value={selectedItem.quantity}
                            onChange={(e) => handleQuantityChange(item.id, Number.parseInt(e.target.value))}
                            className="w-16 h-8"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <select
                            value={selectedItem.pricingType}
                            onChange={(e) => handlePricingTypeChange(item.id, e.target.value as "daily" | "weekly" | "monthly")}
                            className="border border-blue-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="daily">Daily</option>
                            {item.rental_rate_per_week && <option value="weekly">Weekly</option>}
                            {item.rental_rate_per_month && <option value="monthly">Monthly</option>}
                          </select>
                        </td>
                        <td className="py-3 px-3 text-right font-medium">${unitPrice.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-semibold text-primary">${total.toFixed(2)}</td>
                        <td className="py-3 px-3 text-center">
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Deposits Section */}
        <div className="border-t-2 border-blue-200 pt-4 mt-4">
          <h3 className="font-semibold text-primary mb-4">Deposits & Payment</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="advance">Advance Deposit ($)</Label>
              <Input
                id="advance"
                type="number"
                min="0"
                step="0.01"
                value={formData.advanceDeposit}
                onChange={(e) => setFormData({ ...formData, advanceDeposit: Number.parseFloat(e.target.value) || 0 })}
                className="border-blue-200 focus:ring-primary"
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">Non-refundable advance payment</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="refundable">Refundable Deposit ($)</Label>
              <Input
                id="refundable"
                type="number"
                min="0"
                step="0.01"
                value={formData.refundableDeposit}
                onChange={(e) => setFormData({ ...formData, refundableDeposit: Number.parseFloat(e.target.value) || 0 })}
                className="border-blue-200 focus:ring-primary"
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">Returned after inspection</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            rows={3}
            placeholder="Add any additional notes..."
          />
        </div>

        {/* Total Amount with Deposits */}
        {totalAmount > 0 && (
          <div className="bg-blue-100 border border-blue-300 p-4 rounded-md space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-primary">Rental Amount:</span>
              <span className="font-bold text-primary">${totalAmount.toFixed(2)}</span>
            </div>
            {formData.advanceDeposit > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Advance Deposit (Deductible):</span>
                <span className="text-red-600">- ${formData.advanceDeposit.toFixed(2)}</span>
              </div>
            )}
            {formData.refundableDeposit > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Refundable Deposit (Reference):</span>
                <span className="text-blue-600">${formData.refundableDeposit.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-blue-300 pt-2 flex justify-between items-center">
              <span className="font-semibold text-primary">Invoice Total Due:</span>
              <span className="text-lg font-bold text-primary">
                ${(totalAmount - formData.advanceDeposit).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || selectedItems.length === 0}>
            {loading ? "Creating..." : "Create Booking"}
          </Button>
        </div>
      </form>
    </Card>
  )
}
