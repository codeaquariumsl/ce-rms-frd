// Inventory API endpoints

import { getInventoryItems, query } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const orgId = url.searchParams.get("org_id")
    const status = url.searchParams.get("status")

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const items = await getInventoryItems(Number.parseInt(orgId), status || undefined)

    return NextResponse.json({ data: items })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch inventory" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { org_id, name, sku, barcode, category, rental_rate_per_day, description } = body

    if (!org_id || !name || !sku || !barcode || !rental_rate_per_day) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO inventory_items 
       (organization_id, name, sku, barcode, category, rental_rate_per_day, description, status, quantity_total, quantity_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [org_id, name, sku, barcode, category, rental_rate_per_day, description, "Available", 1, 1],
    )

    return NextResponse.json({ data: result[0] }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create inventory item" },
      { status: 500 },
    )
  }
}
