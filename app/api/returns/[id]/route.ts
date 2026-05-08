// Get return details and update return status

import { query } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const returnRecord = await query(
      `SELECT r.*, b.booking_number, b.customer_id, b.return_date, b.total_amount,
              c.name as customer_name, c.phone as customer_phone,
              u.name as returned_by_name
       FROM returns r
       JOIN bookings b ON r.booking_id = b.id
       JOIN customers c ON b.customer_id = c.id
       LEFT JOIN users u ON r.returned_by = u.id
       WHERE r.id = $1`,
      [Number.parseInt(id)],
    )

    if (returnRecord.length === 0) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 })
    }

    // Get items for this return
    const items = await query(
      `SELECT bi.*, ii.name, ii.sku, ii.status,
              dil.damage_description, dil.severity, dil.repair_status
       FROM booking_items bi
       JOIN inventory_items ii ON bi.inventory_item_id = ii.id
       LEFT JOIN damaged_inventory_log dil ON ii.id = dil.inventory_item_id AND dil.booking_id = $1
       WHERE bi.booking_id = $2`,
      [returnRecord[0].booking_id, returnRecord[0].booking_id],
    )

    return NextResponse.json({
      data: {
        ...returnRecord[0],
        items,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch return" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, damage_notes } = body

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      values.push(status)
    }

    if (damage_notes !== undefined) {
      updates.push(`damage_notes = $${paramIndex++}`)
      values.push(damage_notes)
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(Number.parseInt(id))

    const result = await query(`UPDATE returns SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`, values)

    if (result.length === 0) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 })
    }

    return NextResponse.json({ data: result[0] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update return" },
      { status: 500 },
    )
  }
}
