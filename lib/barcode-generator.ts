export interface BarcodeOptions {
  format?: "CODE128" | "EAN13" | "UPC" | "QR"
  width?: number
  height?: number
  displayValue?: boolean
}

// Generate barcode code for storage/database
export function generateBarcode(itemId: number, organizationId: number): string {
  // Format: ORG-ITEMID-TIMESTAMP-RANDOM
  // Example: ORG001-ITM123456-1701234567-AB12CD
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `ORG${organizationId}-ITM${itemId}-${timestamp}-${random}`
}

// Generate QR code data URL
export async function generateQRCode(data: string): Promise<string> {
  try {
    // Use QR code generation library
    // For now, return a placeholder - in production, use QR code library
    return `data:image/svg+xml;base64,${Buffer.from(data).toString("base64")}`
  } catch (error) {
    console.error("Failed to generate QR code:", error)
    throw error
  }
}

// Parse barcode
export function parseBarcode(barcode: string): {
  organizationId: number
  itemId: number
  timestamp: string
  random: string
} | null {
  const match = barcode.match(/ORG(\d+)-ITM(\d+)-([A-Z0-9]+)-([A-Z0-9]+)/)
  if (!match) return null

  return {
    organizationId: Number.parseInt(match[1]),
    itemId: Number.parseInt(match[2]),
    timestamp: match[3],
    random: match[4],
  }
}
