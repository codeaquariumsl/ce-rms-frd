// Get and manage damaged inventory

import { query } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const orgId = url.searchParams.get("org_id")

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const items = await query(
      `SELECT ii.*, dil.damage_description, dil.severity, dil.repair_status 
       FROM inventory_items ii
       LEFT JOIN damaged_inventory_log dil ON ii.id = dil.inventory_item_id
       WHERE ii.organization_id = $1 AND ii.status = 'Damaged'
       ORDER BY dil.created_at DESC`,
      [Number.parseInt(orgId)],
    )

    return NextResponse.json({ data: items })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch damaged items" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { inventory_item_id, booking_id, damage_description, severity, reported_by } = body

    // Update inventory item status
    await query("UPDATE inventory_items SET status = $1 WHERE id = $2", ["Damaged", inventory_item_id])

    // Log the damage
    const result = await query(
      `INSERT INTO damaged_inventory_log 
       (inventory_item_id, booking_id, damage_description, severity, reported_by, repair_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [inventory_item_id, booking_id, damage_description, severity, reported_by, "Pending"],
    )

    return NextResponse.json({ data: result[0] }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to log damage" },
      { status: 500 },
    )
  }
}
