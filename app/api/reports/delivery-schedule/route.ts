// Generate delivery schedule report

import { query } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const orgId = url.searchParams.get("org_id")
    const days = url.searchParams.get("days") || "30"

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const report = await query(
      `SELECT 
        b.booking_number, c.name as customer_name, c.phone, c.address,
        GROUP_CONCAT(ii.name, ', ') as items,
        b.delivery_date, b.return_date, b.total_amount,
        d.status as delivery_status, d.delivered_at
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN booking_items bi ON b.id = bi.booking_id
      JOIN inventory_items ii ON bi.inventory_item_id = ii.id
      LEFT JOIN deliveries d ON b.id = d.booking_id
      WHERE b.organization_id = $1
      AND b.delivery_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '$${days} days'
      GROUP BY b.id, c.id, d.id
      ORDER BY b.delivery_date ASC`,
      [Number.parseInt(orgId)],
    )

    // Summary by date
    const summaryByDate: { [key: string]: number } = {}
    report.forEach((r: any) => {
      const date = r.delivery_date
      summaryByDate[date] = (summaryByDate[date] || 0) + 1
    })

    return NextResponse.json({
      data: report,
      summary: {
        total_scheduled_deliveries: report.length,
        summary_by_date: summaryByDate,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate report" },
      { status: 500 },
    )
  }
}
