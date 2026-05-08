"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { Trash2, Plus } from "lucide-react"

interface SerialManagementModalProps {
  isOpen: boolean
  itemName: string
  itemId: number
  currentSerials: Array<{ id: string; serial_code: string; status: string }>
  onSave: (serials: Array<{ id: string; serial_code: string; status: string }>) => void
  onCancel: () => void
}

export function SerialManagementModal({
  isOpen,
  itemName,
  itemId,
  currentSerials,
  onSave,
  onCancel,
}: SerialManagementModalProps) {
  const [serials, setSerials] = useState<Array<{ id: string; serial_code: string; status: string }>>(currentSerials)
  const [newSerial, setNewSerial] = useState("")

  useEffect(() => {
    setSerials(currentSerials)
    setNewSerial("")
  }, [currentSerials, isOpen])

  const handleAddSerial = () => {
    if (!newSerial.trim()) {
      alert("Please enter a serial number")
      return
    }

    // Check for duplicates
    if (serials.some((s) => s.serial_code.toLowerCase() === newSerial.toLowerCase())) {
      alert("This serial number already exists")
      return
    }

    const serial = {
      id: `${itemId}-${Date.now()}`,
      serial_code: newSerial.trim(),
      status: "Available",
    }

    setSerials([...serials, serial])
    setNewSerial("")
  }

  const handleRemoveSerial = (id: string) => {
    setSerials(serials.filter((s) => s.id !== id))
  }

  const handleSave = () => {
    if (serials.length === 0) {
      alert("Please add at least one serial number")
      return
    }
    onSave(serials)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available":
        return "bg-green-100 text-green-800"
      case "Reserved":
        return "bg-blue-100 text-blue-800"
      case "Delivered":
        return "bg-purple-100 text-purple-800"
      case "Damaged":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Serial Numbers - {itemName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Serial */}
          <div className="border-b pb-4">
            <Label className="text-sm font-semibold mb-2 block text-primary">Add New Serial Number</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter serial number (e.g., SN-001)"
                value={newSerial}
                onChange={(e) => setNewSerial(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddSerial()
                  }
                }}
                className="border-blue-200 focus:ring-primary"
              />
              <Button onClick={handleAddSerial} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Existing Serials */}
          <div>
            <Label className="text-sm font-semibold mb-2 block text-primary">
              Current Serial Numbers ({serials.length})
            </Label>
            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2 bg-blue-50 border-blue-200">
              {serials.length > 0 ? (
                serials.map((serial) => (
                  <div
                    key={serial.id}
                    className="flex items-center justify-between p-3 bg-white rounded border border-blue-100 hover:border-blue-300"
                  >
                    <div className="flex-1">
                      <div className="font-mono font-semibold text-sm">{serial.serial_code}</div>
                      <Badge className={`${getStatusColor(serial.status)} mt-1 text-xs`}>{serial.status}</Badge>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveSerial(serial.id)}
                      disabled={serials.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No serial numbers yet</div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-primary">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
