// Generate inventory status report

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
        name, sku, category, status,
        quantity_total, quantity_available, quantity_reserved, quantity_delivered, quantity_damaged,
        rental_rate_per_day,
        ROUND(100.0 * quantity_available / NULLIF(quantity_total, 0), 2) as availability_percentage
       FROM inventory_items 
       WHERE organization_id = $1
       ORDER BY name ASC`,
      [Number.parseInt(orgId)],
    )

    // Calculate summary
    const summary = {
      total_items: report.length,
      total_available: report.reduce((sum: any, item: any) => sum + item.quantity_available, 0),
      total_reserved: report.reduce((sum: any, item: any) => sum + item.quantity_reserved, 0),
      total_delivered: report.reduce((sum: any, item: any) => sum + item.quantity_delivered, 0),
      total_damaged: report.reduce((sum: any, item: any) => sum + item.quantity_damaged, 0),
      average_availability: Number.parseFloat(
        (report.reduce((sum: any, item: any) => sum + (item.availability_percentage || 0), 0) / report.length).toFixed(
          2,
        ),
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
