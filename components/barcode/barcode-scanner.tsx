"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Zap, AlertTriangle, CheckCircle } from "lucide-react"

interface BarcodeScannerProps {
  action: "delivery" | "return" | "inventory"
  organizationId: number
  onScan?: (barcode: string, data: any) => void
}

export function BarcodeScanner({ action, organizationId, onScan }: BarcodeScannerProps) {
  const [manualInput, setManualInput] = useState("")
  const [scannedData, setScannedData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleScan(barcode: string) {
    if (!barcode.trim()) return

    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const response = await fetch("/api/barcode/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: barcode.trim(),
          action,
        }),
      })

      if (!response.ok) {
        const { error: errorMsg } = await response.json()
        setError(errorMsg || "Invalid barcode")
        return
      }

      const { data } = await response.json()
      setScannedData(data)
      setSuccess(true)
      onScan?.(barcode, data)

      // Auto-clear after 2 seconds
      setTimeout(() => {
        setManualInput("")
        setScannedData(null)
        setSuccess(false)
        inputRef.current?.focus()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleScan(manualInput)
    }
  }

  const getActionLabel = () => {
    switch (action) {
      case "delivery":
        return "Scan item for delivery confirmation"
      case "return":
        return "Scan item for return processing"
      case "inventory":
        return "Scan item for inventory check"
      default:
        return "Scan barcode"
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5" />
        Barcode Scanner
      </h2>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{getActionLabel()}</p>

        <div className="space-y-2">
          <label className="text-sm font-medium">Barcode Input</label>
          <Input
            ref={inputRef}
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Scan barcode or enter manually..."
            disabled={loading}
            className="text-lg"
            autoComplete="off"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && scannedData && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Successfully scanned: {scannedData.item.name}
            </AlertDescription>
          </Alert>
        )}

        {scannedData && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted">
            <div>
              <h3 className="font-semibold">{scannedData.item.name}</h3>
              <p className="text-sm text-muted-foreground">SKU: {scannedData.item.sku}</p>
            </div>

            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge>{scannedData.item.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available:</span>
                <span>{scannedData.item.quantity_available}</span>
              </div>
            </div>

            {scannedData.current_bookings.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Active Bookings:</p>
                <div className="space-y-1">
                  {scannedData.current_bookings.slice(0, 3).map((booking: any) => (
                    <div key={booking.id} className="text-sm p-2 bg-background rounded">
                      <div>{booking.customer_name}</div>
                      <div className="text-xs text-muted-foreground">
                        Qty: {booking.quantity} | Delivery: {booking.delivery_date}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Button onClick={() => handleScan(manualInput)} disabled={loading || !manualInput.trim()} className="w-full">
          {loading ? "Scanning..." : "Scan"}
        </Button>
      </div>
    </Card>
  )
}
