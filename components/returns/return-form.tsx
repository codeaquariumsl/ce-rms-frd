"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getReturnById, processReturn } from "@/lib/db"

interface ReturnFormProps {
  returnId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function ReturnForm({ returnId, onSuccess, onCancel }: ReturnFormProps) {
  const [returnData, setReturnData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [condition, setCondition] = useState("Good")
  const [damageNotes, setDamageNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchReturnData()
  }, [returnId])

  async function fetchReturnData() {
    try {
      setLoading(true)
      const data = await getReturnById(Number(returnId))
      setReturnData(data)
    } catch (error) {
      console.error("Failed to fetch return data:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setSubmitting(true)

      const payload = {
        booking_id: returnData.booking_id || returnData.bookingId,
        delivery_id: returnData.delivery_id || returnData.deliveryId,
        item_condition: condition,
        damage_notes: damageNotes,
      }

      await processReturn(payload)

      alert("Return processed successfully!")
      onSuccess?.()
    } catch (error) {
      console.error("Failed to process return:", error)
      alert("Failed to process return: " + (error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading return details...</div>
  }

  if (!returnData) {
    return <div className="text-center py-8">Return not found</div>
  }

  return (
    <Card className="p-6 max-w-2xl bg-blue-50 border-blue-100">
      <h2 className="text-2xl font-bold mb-6 text-primary">Process Return</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Booking Info */}
        <div className="border border-blue-200 rounded-lg p-4 space-y-2 bg-blue-50">
          <div>
            <p className="text-sm text-muted-foreground">Booking ID</p>
            <p className="font-semibold text-primary">{returnData.bookingId}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-semibold">{returnData.customerName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Item</p>
            <p className="font-semibold">{returnData.itemName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Return Date</p>
            <p className="font-semibold">
              {returnData.returnDate ? new Date(returnData.returnDate).toLocaleDateString() : "N/A"}
            </p>
          </div>
        </div>

        {/* Condition Assessment */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold mb-3 block">Item Condition</Label>
            <RadioGroup value={condition} onValueChange={setCondition}>
              <div className="flex items-center space-x-2 p-3 border rounded hover:bg-muted cursor-pointer">
                <RadioGroupItem value="Good" id="good" />
                <Label htmlFor="good" className="flex-1 cursor-pointer">
                  <span className="font-medium">Good Condition</span>
                  <p className="text-sm text-muted-foreground">No damage, fully functional</p>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded hover:bg-muted cursor-pointer">
                <RadioGroupItem value="Minor Damage" id="minor" />
                <Label htmlFor="minor" className="flex-1 cursor-pointer">
                  <span className="font-medium">Minor Damage</span>
                  <p className="text-sm text-muted-foreground">Small scratches or dents, fully functional</p>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded hover:bg-muted cursor-pointer">
                <RadioGroupItem value="Major Damage" id="major" />
                <Label htmlFor="major" className="flex-1 cursor-pointer">
                  <span className="font-medium">Major Damage</span>
                  <p className="text-sm text-muted-foreground">Significant damage, may not be functional</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {(condition === "Minor Damage" || condition === "Major Damage") && (
            <div className="space-y-2">
              <Label htmlFor="damage_notes">Damage Details</Label>
              <textarea
                id="damage_notes"
                value={damageNotes}
                onChange={(e) => setDamageNotes(e.target.value)}
                placeholder="Describe the damage, affected areas, etc."
                className="w-full min-h-24 p-2 border rounded-md"
                required={true}
              />
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90">
            {submitting ? "Processing..." : "Process Return"}
          </Button>
        </div>
      </form>
    </Card>
  )
}
