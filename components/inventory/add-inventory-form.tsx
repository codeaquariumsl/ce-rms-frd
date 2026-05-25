"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { generateBarcode } from "@/lib/barcode-generator"
import type { Category, InventoryItem } from "@/lib/types"
import { getCategories, createInventoryItem, updateInventoryItem, saveItemSerials } from "@/lib/db"

interface AddInventoryFormProps {
  organizationId: number
  editItem?: InventoryItem | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function AddInventoryForm({ organizationId, editItem, onSuccess, onCancel }: AddInventoryFormProps) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: "",
    sku: "",
    rental_rate_per_day: "",
    rental_rate_per_week: "",
    rental_rate_per_month: "",
    quantity: 1,
    isHaveSerial: false,
    serialNumbers: [""],
  })

  useEffect(() => {
    loadCategories()
  }, [organizationId])

  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name || "",
        description: editItem.description || "",
        category_id: editItem.category_id ? String(editItem.category_id) : "",
        sku: editItem.sku || "",
        rental_rate_per_day: editItem.rental_rate_per_day ? String(editItem.rental_rate_per_day) : "",
        rental_rate_per_week: editItem.rental_rate_per_week ? String(editItem.rental_rate_per_week) : "",
        rental_rate_per_month: editItem.rental_rate_per_month ? String(editItem.rental_rate_per_month) : "",
        quantity: editItem.quantity_total || 1,
        isHaveSerial: !!editItem.is_have_serial,
        serialNumbers: editItem.serial_numbers && editItem.serial_numbers.length > 0
          ? editItem.serial_numbers.map(sn => sn.serial_code)
          : [""],
      })
    } else {
      setFormData({
        name: "",
        description: "",
        category_id: "",
        sku: "",
        rental_rate_per_day: "",
        rental_rate_per_week: "",
        rental_rate_per_month: "",
        quantity: 1,
        isHaveSerial: false,
        serialNumbers: [""],
      })
    }
  }, [editItem])

  async function loadCategories() {
    try {
      const data = await getCategories(organizationId)
      setCategories(data)
    } catch (error) {
      console.error("Failed to load categories:", error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setLoading(true)

      const isHaveSerialVal = formData.isHaveSerial
      const derivedQuantity = isHaveSerialVal 
        ? (formData.serialNumbers.filter(sn => sn.trim() !== "").length || 1)
        : Number(formData.quantity || 1)

      if (editItem) {
        // Update existing item
        const updatePayload = {
          name: formData.name,
          description: formData.description,
          category_id: formData.category_id ? Number.parseInt(formData.category_id) : null,
          sku: formData.sku,
          rental_rate_per_day: Number.parseFloat(formData.rental_rate_per_day),
          rental_rate_per_week: formData.rental_rate_per_week ? Number.parseFloat(formData.rental_rate_per_week) : null,
          rental_rate_per_month: formData.rental_rate_per_month ? Number.parseFloat(formData.rental_rate_per_month) : null,
          is_have_serial: isHaveSerialVal,
          quantity_total: derivedQuantity,
          quantity_available: Math.max(derivedQuantity - (editItem.quantity_delivered || 0) - (editItem.quantity_reserved || 0), 0)
        }

        await updateInventoryItem(editItem.id, updatePayload)

        // Save serial numbers if serial numbers are enabled, otherwise delete them (empty payload)
        const originalSerials = editItem.serial_numbers || [];
        const serialsPayload = isHaveSerialVal
          ? formData.serialNumbers
              .filter(sn => sn.trim() !== "")
              .map(sn => {
                const original = originalSerials.find(o => o.serial_code.trim() === sn.trim());
                return {
                  serial_code: sn.trim(),
                  status: original ? original.status : "Available"
                };
              })
          : [];

        await saveItemSerials(editItem.id, serialsPayload)

      } else {
        // Create new item
        const tempBarcode = generateBarcode(Date.now(), organizationId)

        const itemPayload = {
          org_id: organizationId,
          name: formData.name,
          description: formData.description,
          category_id: formData.category_id ? Number.parseInt(formData.category_id) : null,
          sku: formData.sku,
          barcode: tempBarcode,
          rental_rate_per_day: Number.parseFloat(formData.rental_rate_per_day),
          rental_rate_per_week: formData.rental_rate_per_week ? Number.parseFloat(formData.rental_rate_per_week) : null,
          rental_rate_per_month: formData.rental_rate_per_month ? Number.parseFloat(formData.rental_rate_per_month) : null,
          is_have_serial: isHaveSerialVal,
          quantity_total: derivedQuantity
        }

        const newItem = await createInventoryItem(itemPayload)
        const newItemId = newItem?.id || newItem?.data?.id

        // Save serial numbers for new item if enabled
        if (isHaveSerialVal && newItemId) {
          const serialsPayload = formData.serialNumbers
            .filter(sn => sn.trim() !== "")
            .map(sn => ({
              serial_code: sn.trim(),
              status: "Available"
            }));

          if (serialsPayload.length > 0) {
            await saveItemSerials(newItemId, serialsPayload)
          }
        }
      }

      setFormData({
        name: "",
        description: "",
        category_id: "",
        sku: "",
        rental_rate_per_day: "",
        rental_rate_per_week: "",
        rental_rate_per_month: "",
        quantity: 1,
        isHaveSerial: false,
        serialNumbers: [""],
      })

      onSuccess?.()
    } catch (error) {
      console.error("Failed to save inventory:", error)
      alert("Failed to save inventory item: " + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">{editItem ? "Edit Inventory Item" : "Add Inventory Item"}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Party Tent 20x20"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU *</Label>
            <Input
              id="sku"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              placeholder="e.g., TENT-20X20"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">Category</Label>
            <select
              id="category_id"
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rental_rate_per_day">Daily Rate (LKR) *</Label>
            <Input
              id="rental_rate_per_day"
              name="rental_rate_per_day"
              type="number"
              step="0.01"
              value={formData.rental_rate_per_day}
              onChange={handleChange}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rental_rate_per_week">Weekly Rate (LKR)</Label>
            <Input
              id="rental_rate_per_week"
              name="rental_rate_per_week"
              type="number"
              step="0.01"
              value={formData.rental_rate_per_week}
              onChange={handleChange}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rental_rate_per_month">Monthly Rate (LKR)</Label>
            <Input
              id="rental_rate_per_month"
              name="rental_rate_per_month"
              type="number"
              step="0.01"
              value={formData.rental_rate_per_month}
              onChange={handleChange}
              placeholder="0.00"
            />
          </div>

          {/* Switch toggle for Has Serial Numbers */}
          <div className="flex items-center space-x-2.5 p-3.5 border border-slate-200 bg-slate-50/50 rounded-xl md:col-span-2 hover:border-slate-300 transition-all cursor-pointer">
            <input
              type="checkbox"
              id="isHaveSerial"
              name="isHaveSerial"
              checked={formData.isHaveSerial}
              onChange={(e) => setFormData(prev => ({ ...prev, isHaveSerial: e.target.checked }))}
              className="w-5 h-5 rounded text-primary focus:ring-primary border-slate-300 cursor-pointer"
            />
            <Label htmlFor="isHaveSerial" className="flex-1 cursor-pointer select-none">
              <span className="font-extrabold text-slate-800 text-sm">Has Serial Numbers?</span>
              <p className="text-xs text-muted-foreground mt-0.5">Toggle on if this equipment has individual unique serial barcodes.</p>
            </Label>
          </div>

          {/* Conditional Quantity Field (Only if isHaveSerial is false) */}
          {!formData.isHaveSerial && (
            <div className="space-y-2 md:col-span-2 animate-in slide-in-from-top-1 duration-200">
              <Label htmlFor="quantity">Total Stock Quantity *</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="e.g., 10"
                required
                className="border-slate-200 focus:ring-primary h-11"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Item details, specifications, etc."
            className="w-full min-h-20 p-2 border rounded-md"
          />
        </div>

        {/* Conditional Serial Numbers Section (Only if isHaveSerial is true) */}
        {formData.isHaveSerial && (
          <div className="border-t pt-4 mt-6 animate-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-primary">Serial Numbers</h3>
              <Button
                type="button"
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    serialNumbers: [...prev.serialNumbers, ""],
                  }))
                }
              >
                + Add Serial
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {formData.serialNumbers.map((serial, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    type="text"
                    value={serial}
                    onChange={(e) => {
                      const updated = [...formData.serialNumbers]
                      updated[idx] = e.target.value
                      setFormData((prev) => ({ ...prev, serialNumbers: updated }))
                    }}
                    placeholder={`Serial #${idx + 1} (e.g., SN-001)`}
                    className="border-blue-200 focus:ring-primary"
                  />
                  {formData.serialNumbers.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const updated = formData.serialNumbers.filter((_, i) => i !== idx)
                        setFormData((prev) => ({ ...prev, serialNumbers: updated }))
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total Serial Numbers: {formData.serialNumbers.filter(s => s.trim()).length}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (editItem ? "Updating..." : "Adding...") : (editItem ? "Update Item" : "Add Item")}
          </Button>
        </div>
      </form>
    </Card>
  )
}
