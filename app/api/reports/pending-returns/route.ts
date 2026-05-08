// Generate pending returns report

import { query } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const orgId = url.searchParams.get("org_id")

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const report = await query(
      `SELECT 
        b.booking_number, c.name as customer_name, c.phone,
        ii.name as item_name, bi.quantity,
        b.delivery_date, b.return_date,
        b.total_amount,
        CURRENT_DATE - b.return_date as days_overdue,
        CASE WHEN b.return_date < CURRENT_DATE THEN 'Overdue' ELSE 'On Time' END as status
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN booking_items bi ON b.id = bi.booking_id
      JOIN inventory_items ii ON bi.inventory_item_id = ii.id
      WHERE b.organization_id = $1
      AND b.status = 'Delivered'
      AND NOT EXISTS (SELECT 1 FROM returns r WHERE r.booking_id = b.id AND r.status IN ('Returned', 'Returned Damaged'))
      ORDER BY b.return_date ASC`,
      [Number.parseInt(orgId)],
    )

    // Summary
    const summary = {
      total_pending: new Set(report.map((r: any) => r.booking_number)).size,
      overdue_count: report.filter((r: any) => r.status === "Overdue").length,
      total_value_pending: Number.parseFloat(
        new Map(report.map((r: any) => [r.booking_number, r.total_amount])).values() as any,
      ),
    }

    return NextResponse.json({ data: report, summary })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate report" },
      { status: 500 },
    )
  }
}
