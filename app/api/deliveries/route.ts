// Get pending deliveries and manage delivery status

import { query } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const orgId = url.searchParams.get("org_id")
    const status = url.searchParams.get("status")
    const dateFilter = url.searchParams.get("date") // 'today', 'tomorrow', 'upcoming'

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    let queryStr = `
      SELECT d.*, b.booking_number, b.customer_id, b.delivery_date, b.total_amount,
             c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
             COUNT(bi.id) as item_count
      FROM deliveries d
      JOIN bookings b ON d.booking_id = b.id
      JOIN customers c ON b.customer_id = c.id
      LEFT JOIN booking_items bi ON b.id = bi.booking_id
      WHERE b.organization_id = $1
    `
    const values: any[] = [Number.parseInt(orgId)]
    let paramIndex = 2

    if (status) {
      queryStr += ` AND d.status = $${paramIndex++}`
      values.push(status)
    }

    // Date filtering
    if (dateFilter === "today") {
      queryStr += ` AND b.delivery_date = CURRENT_DATE`
    } else if (dateFilter === "tomorrow") {
      queryStr += ` AND b.delivery_date = CURRENT_DATE + INTERVAL '1 day'`
    } else if (dateFilter === "upcoming") {
      queryStr += ` AND b.delivery_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`
    }

    queryStr += ` GROUP BY d.id, b.id, c.id ORDER BY b.delivery_date ASC`

    const deliveries = await query(queryStr, values)

    return NextResponse.json({ data: deliveries })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch deliveries" },
      { status: 500 },
    )
  }
}
