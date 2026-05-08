// Get delivery details and update delivery status

import { query } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const delivery = await query(
      `SELECT d.*, b.booking_number, b.customer_id, b.delivery_date, b.total_amount,
              c.name as customer_name, c.phone as customer_phone, c.address,
              u.name as prepared_by_name, u2.name as delivered_by_name
       FROM deliveries d
       JOIN bookings b ON d.booking_id = b.id
       JOIN customers c ON b.customer_id = c.id
       LEFT JOIN users u ON d.prepared_by = u.id
       LEFT JOIN users u2 ON d.delivered_by = u.id
       WHERE d.id = $1`,
      [Number.parseInt(id)],
    )

    if (delivery.length === 0) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 })
    }

    // Get items for this delivery
    const items = await query(
      `SELECT bi.*, ii.name, ii.barcode, ii.sku
       FROM booking_items bi
       JOIN inventory_items ii ON bi.inventory_item_id = ii.id
       WHERE bi.booking_id = $1`,
      [delivery[0].booking_id],
    )

    return NextResponse.json({
      data: {
        ...delivery[0],
        items,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch delivery" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      status, // 'Prepared', 'Delivered'
      prepared_by,
      delivered_by,
      notes,
    } = body

    const deliveryId = Number.parseInt(id)
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (status) {
      updates.push(`status = $${paramIndex++}`)
      values.push(status)

      // Auto-set timestamps
      if (status === "Prepared" && prepared_by) {
        updates.push(`prepared_by = $${paramIndex++}`)
        values.push(prepared_by)
        updates.push(`prepared_at = CURRENT_TIMESTAMP`)
      }

      if (status === "Delivered" && delivered_by) {
        updates.push(`delivered_by = $${paramIndex++}`)
        values.push(delivered_by)
        updates.push(`delivered_at = CURRENT_TIMESTAMP`)
        updates.push(`barcode_scanned_at = CURRENT_TIMESTAMP`)

        // Also update booking status
        const delivery = await query("SELECT booking_id FROM deliveries WHERE id = $1", [deliveryId])
        if (delivery.length > 0) {
          await query("UPDATE bookings SET status = $1 WHERE id = $2", ["Delivered", delivery[0].booking_id])
        }
      }
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`)
      values.push(notes)
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(deliveryId)

    const result = await query(
      `UPDATE deliveries SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    )

    if (result.length === 0) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 })
    }

    return NextResponse.json({ data: result[0] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update delivery" },
      { status: 500 },
    )
  }
}
