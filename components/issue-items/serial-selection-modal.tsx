"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"

interface SerialSelectionModalProps {
  isOpen: boolean
  itemName: string
  availableSerials: Array<{ id: string; serial_code: string; status: string }>
  selectedSerials: string[]
  quantity: number
  onConfirm: (serials: string[]) => void
  onCancel: () => void
}

export function SerialSelectionModal({
  isOpen,
  itemName,
  availableSerials,
  selectedSerials: initialSelected,
  quantity,
  onConfirm,
  onCancel,
}: SerialSelectionModalProps) {
  const [selectedSerials, setSelectedSerials] = useState<string[]>(initialSelected)

  useEffect(() => {
    setSelectedSerials(initialSelected)
  }, [initialSelected, isOpen])

  const handleSelectSerial = (serialCode: string, checked: boolean) => {
    if (checked) {
      if (selectedSerials.length < quantity) {
        setSelectedSerials([...selectedSerials, serialCode])
      }
    } else {
      setSelectedSerials(selectedSerials.filter((s) => s !== serialCode))
    }
  }

  const handleConfirm = () => {
    if (selectedSerials.length !== quantity) {
      alert(`Please select exactly ${quantity} serial number(s)`)
      return
    }
    onConfirm(selectedSerials)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Serial Numbers for {itemName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Select <span className="font-semibold text-primary">{quantity}</span> serial number(s) from available items
          </div>

          <div className="border rounded-lg p-4 max-h-96 overflow-y-auto space-y-2 bg-blue-50 border-blue-200">
            {availableSerials.length > 0 ? (
              availableSerials.map((serial) => (
                <div key={serial.id} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer">
                  <Checkbox
                    id={serial.id}
                    checked={selectedSerials.includes(serial.serial_code)}
                    onCheckedChange={(checked) => handleSelectSerial(serial.serial_code, checked as boolean)}
                    disabled={
                      !selectedSerials.includes(serial.serial_code) && selectedSerials.length >= quantity
                    }
                  />
                  <Label
                    htmlFor={serial.id}
                    className="flex-1 cursor-pointer font-mono bg-gray-100 px-3 py-1 rounded text-sm font-semibold"
                  >
                    {serial.serial_code}
                  </Label>
                  <span className="text-xs text-green-600 font-semibold">{serial.status}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">No available serial numbers</div>
            )}
          </div>

          <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
            <span className="font-semibold text-green-800">
              Selected: {selectedSerials.length} / {quantity}
            </span>
            {selectedSerials.length > 0 && (
              <div className="mt-2 space-y-1">
                {selectedSerials.map((sn) => (
                  <div key={sn} className="text-xs text-green-700 font-mono bg-white px-2 py-1 rounded">
                    ✓ {sn}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedSerials.length !== quantity} className="bg-primary">
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
