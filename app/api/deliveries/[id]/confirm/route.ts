// Confirm delivery with barcode scan

import { query } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { barcode, delivered_by, notes } = body

    const deliveryId = Number.parseInt(id)

    // Verify barcode matches a booking item
    const bookingData = await query(
      `SELECT b.id as booking_id FROM bookings b
       JOIN booking_items bi ON b.id = bi.booking_id
       JOIN inventory_items ii ON bi.inventory_item_id = ii.id
       JOIN deliveries d ON b.id = d.booking_id
       WHERE d.id = $1 AND ii.barcode = $2`,
      [deliveryId, barcode],
    )

    if (bookingData.length === 0) {
      return NextResponse.json({ error: "Barcode does not match this delivery" }, { status: 400 })
    }

    // Update delivery status to delivered
    const result = await query(
      `UPDATE deliveries 
       SET status = $1, delivered_by = $2, delivered_at = CURRENT_TIMESTAMP, 
           barcode_scanned_at = CURRENT_TIMESTAMP, notes = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      ["Delivered", delivered_by, notes, deliveryId],
    )

    // Update booking status
    const delivery = await query("SELECT booking_id FROM deliveries WHERE id = $1", [deliveryId])

    if (delivery.length > 0) {
      await query("UPDATE bookings SET status = $1 WHERE id = $2", ["Delivered", delivery[0].booking_id])

      // Update inventory status to Delivered
      await query(
        `UPDATE inventory_items SET status = 'Delivered' 
         WHERE id IN (
           SELECT inventory_item_id FROM booking_items WHERE booking_id = $1
         )`,
        [delivery[0].booking_id],
      )
    }

    return NextResponse.json({ data: result[0] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to confirm delivery" },
      { status: 500 },
    )
  }
}
