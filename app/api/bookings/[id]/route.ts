// Get, update, and cancel bookings

import { query } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const booking = await query(
      `SELECT b.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       WHERE b.id = $1`,
      [Number.parseInt(id)],
    )

    if (booking.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Get booking items
    const items = await query(
      `SELECT bi.*, ii.name, ii.sku, ii.barcode
       FROM booking_items bi
       JOIN inventory_items ii ON bi.inventory_item_id = ii.id
       WHERE bi.booking_id = $1`,
      [Number.parseInt(id)],
    )

    return NextResponse.json({
      data: {
        ...booking[0],
        items,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch booking" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, notes } = body

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      values.push(status)
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`)
      values.push(notes)
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(Number.parseInt(id))

    const result = await query(
      `UPDATE bookings SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    )

    if (result.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    return NextResponse.json({ data: result[0] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update booking" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const bookingId = Number.parseInt(id)

    // Get booking items to revert inventory
    const bookingItems = await query("SELECT * FROM booking_items WHERE booking_id = $1", [bookingId])

    // Revert inventory quantities
    for (const item of bookingItems) {
      await query(
        `UPDATE inventory_items 
         SET quantity_reserved = quantity_reserved - $1,
             status = CASE WHEN quantity_reserved - $1 = 0 THEN 'Available' ELSE status END
         WHERE id = $2`,
        [item.quantity, item.inventory_item_id],
      )
    }

    // Delete booking items
    await query("DELETE FROM booking_items WHERE booking_id = $1", [bookingId])

    // Delete delivery record
    await query("DELETE FROM deliveries WHERE booking_id = $1", [bookingId])

    // Cancel booking
    const result = await query(
      "UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
      ["Cancelled", bookingId],
    )

    if (result.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Booking cancelled successfully" })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel booking" },
      { status: 500 },
    )
  }
}
