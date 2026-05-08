// Scan and identify barcodes

import { query } from "@/lib/db"
import { NextResponse } from "next/server"
import { parseBarcode } from "@/lib/barcode-generator"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { barcode, action } = body // action: 'delivery', 'return', 'inventory'

    if (!barcode) {
      return NextResponse.json({ error: "Barcode is required" }, { status: 400 })
    }

    // Try to find item by barcode
    const itemResult = await query("SELECT * FROM inventory_items WHERE barcode = $1", [barcode])

    if (itemResult.length === 0) {
      return NextResponse.json({ error: "Invalid barcode", data: null }, { status: 404 })
    }

    const item = itemResult[0]

    // Parse barcode to get metadata
    const barcodeData = parseBarcode(barcode)

    // Get current bookings for this item
    const bookings = await query(
      `SELECT b.*, bi.quantity, c.name as customer_name
       FROM bookings b
       JOIN booking_items bi ON b.id = bi.booking_id
       JOIN customers c ON b.customer_id = c.id
       WHERE bi.inventory_item_id = $1 AND b.status IN ('Reserved', 'Ready for Pickup', 'Delivered')
       ORDER BY b.delivery_date ASC
       LIMIT 5`,
      [item.id],
    )

    return NextResponse.json({
      data: {
        item,
        barcode_metadata: barcodeData,
        current_bookings: bookings,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to scan barcode" },
      { status: 500 },
    )
  }
}
