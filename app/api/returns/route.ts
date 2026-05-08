// Get pending returns and process returns

import { query } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const orgId = url.searchParams.get("org_id")
    const status = url.searchParams.get("status")
    const overdueOnly = url.searchParams.get("overdue") === "true"

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    let queryStr = `
      SELECT r.*, b.booking_number, b.return_date, b.total_amount,
             c.name as customer_name, c.phone as customer_phone,
             d.id as delivery_id, d.delivered_at,
             COUNT(bi.id) as item_count
      FROM returns r
      JOIN bookings b ON r.booking_id = b.id
      JOIN customers c ON b.customer_id = c.id
      LEFT JOIN deliveries d ON r.delivery_id = d.id
      LEFT JOIN booking_items bi ON b.id = bi.booking_id
      WHERE b.organization_id = $1
    `
    const values: any[] = [Number.parseInt(orgId)]
    let paramIndex = 2

    if (status) {
      queryStr += ` AND r.status = $${paramIndex++}`
      values.push(status)
    }

    if (overdueOnly) {
      queryStr += ` AND b.return_date < CURRENT_DATE AND r.status != 'Returned'`
    }

    queryStr += ` GROUP BY r.id, b.id, c.id, d.id ORDER BY b.return_date ASC`

    const returns = await query(queryStr, values)

    return NextResponse.json({ data: returns })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch returns" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { booking_id, delivery_id, item_condition, damage_notes, returned_by } = body

    if (!booking_id) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 })
    }

    // Create return record
    const result = await query(
      `INSERT INTO returns 
       (booking_id, delivery_id, status, item_condition, damage_notes, returned_by, returned_at, barcode_scanned_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        booking_id,
        delivery_id,
        item_condition === "Good" ? "Returned" : "Returned Damaged",
        item_condition,
        damage_notes,
        returned_by,
      ],
    )

    const returnRecord = result[0]

    // If item is damaged, create damage log
    if (item_condition !== "Good") {
      // Get all items in this booking
      const bookingItems = await query("SELECT inventory_item_id FROM booking_items WHERE booking_id = $1", [
        booking_id,
      ])

      for (const item of bookingItems) {
        await query(
          `INSERT INTO damaged_inventory_log 
           (inventory_item_id, booking_id, return_id, damage_description, severity, reported_by, repair_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            item.inventory_item_id,
            booking_id,
            returnRecord.id,
            damage_notes,
            item_condition === "Major Damage" ? "Major" : "Minor",
            returned_by,
            "Pending",
          ],
        )

        // Update inventory status
        await query("UPDATE inventory_items SET status = $1, quantity_damaged = quantity_damaged + 1 WHERE id = $2", [
          "Damaged",
          item.inventory_item_id,
        ])
      }
    } else {
      // Item is in good condition, return to available
      const bookingItems = await query("SELECT inventory_item_id, quantity FROM booking_items WHERE booking_id = $1", [
        booking_id,
      ])

      for (const item of bookingItems) {
        await query(
          `UPDATE inventory_items 
           SET status = 'Available', 
               quantity_available = quantity_available + $1,
               quantity_delivered = quantity_delivered - 1
           WHERE id = $2`,
          [item.quantity, item.inventory_item_id],
        )
      }
    }

    // Update booking status
    await query("UPDATE bookings SET status = $1 WHERE id = $2", [
      item_condition === "Good" ? "Returned" : "Returned Damaged",
      booking_id,
    ])

    return NextResponse.json({ data: returnRecord }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process return" },
      { status: 500 },
    )
  }
}
