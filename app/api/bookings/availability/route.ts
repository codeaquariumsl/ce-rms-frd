// Check item availability for date range

import { query } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { org_id, items, delivery_date, return_date } = body

    if (!org_id || !items || !delivery_date || !return_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const availability = await Promise.all(
      items.map(async (item: { inventory_item_id: number; quantity: number }) => {
        const result = await query(
          `SELECT ii.id, ii.name, ii.quantity_available, ii.quantity_total,
                  COUNT(b.id) as conflicting_bookings
           FROM inventory_items ii
           LEFT JOIN booking_items bi ON ii.id = bi.inventory_item_id
           LEFT JOIN bookings b ON bi.booking_id = b.id
           WHERE ii.id = $1 AND ii.organization_id = $2
           AND (b.return_date IS NULL OR b.return_date <= $3 OR b.delivery_date >= $4)
           GROUP BY ii.id, ii.name, ii.quantity_available, ii.quantity_total`,
          [item.inventory_item_id, org_id, delivery_date, return_date],
        )

        return {
          inventory_item_id: item.inventory_item_id,
          requested_quantity: item.quantity,
          available: result.length > 0 && result[0].quantity_available >= item.quantity,
          details: result[0] || null,
        }
      }),
    )

    const allAvailable = availability.every((a) => a.available)

    return NextResponse.json({
      available: allAvailable,
      items: availability,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check availability" },
      { status: 500 },
    )
  }
}
