// Generate rental history report

import { query } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const orgId = url.searchParams.get("org_id")
    const startDate = url.searchParams.get("start_date")
    const endDate = url.searchParams.get("end_date")

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    let queryStr = `
      SELECT 
        b.booking_number, c.name as customer_name, c.phone,
        ii.name as item_name, bi.quantity,
        b.delivery_date, b.return_date,
        b.total_amount, b.status,
        d.delivered_at, r.returned_at
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN booking_items bi ON b.id = bi.booking_id
      JOIN inventory_items ii ON bi.inventory_item_id = ii.id
      LEFT JOIN deliveries d ON b.id = d.booking_id
      LEFT JOIN returns r ON b.id = r.booking_id
      WHERE b.organization_id = $1
    `
    const values: any[] = [Number.parseInt(orgId)]

    if (startDate) {
      queryStr += ` AND b.delivery_date >= $${values.length + 1}`
      values.push(startDate)
    }

    if (endDate) {
      queryStr += ` AND b.delivery_date <= $${values.length + 1}`
      values.push(endDate)
    }

    queryStr += ` ORDER BY b.delivery_date DESC`

    const report = await query(queryStr, values)

    // Calculate summary
    const summary = {
      total_bookings: new Set(report.map((r: any) => r.booking_number)).size,
      total_revenue: Number.parseFloat(report.reduce((sum: any, r: any) => sum + (r.total_amount || 0), 0).toFixed(2)),
      items_rented: report.reduce((sum: any, r: any) => sum + r.quantity, 0),
      on_time_returns: report.filter((r: any) => {
        if (!r.return_date || !r.returned_at) return false
        return new Date(r.returned_at) <= new Date(r.return_date)
      }).length,
    }

    return NextResponse.json({ data: report, summary })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate report" },
      { status: 500 },
    )
  }
}
