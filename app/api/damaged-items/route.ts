// Get all damaged items and manage repair status

import { query } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const orgId = url.searchParams.get("org_id")
    const repairStatus = url.searchParams.get("repair_status")

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    let queryStr = `
      SELECT dil.*, ii.name, ii.sku, ii.barcode, ii.status,
             u.name as reported_by_name
      FROM damaged_inventory_log dil
      JOIN inventory_items ii ON dil.inventory_item_id = ii.id
      LEFT JOIN users u ON dil.reported_by = u.id
      WHERE ii.organization_id = $1
    `
    const values: any[] = [Number.parseInt(orgId)]

    if (repairStatus) {
      queryStr += " AND dil.repair_status = $2"
      values.push(repairStatus)
    }

    queryStr += " ORDER BY dil.created_at DESC"

    const damageLog = await query(queryStr, values)

    return NextResponse.json({ data: damageLog })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch damaged items" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, repair_status } = body

    if (!id || !repair_status) {
      return NextResponse.json({ error: "ID and repair_status required" }, { status: 400 })
    }

    const result = await query(
      `UPDATE damaged_inventory_log 
       SET repair_status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [repair_status, id],
    )

    if (result.length === 0) {
      return NextResponse.json({ error: "Damage record not found" }, { status: 404 })
    }

    // If marked as repaired, update inventory status back to available
    if (repair_status === "Repaired") {
      const damageRecord = result[0]
      await query("UPDATE inventory_items SET status = $1 WHERE id = $2", ["Available", damageRecord.inventory_item_id])
    }

    return NextResponse.json({ data: result[0] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update repair status" },
      { status: 500 },
    )
  }
}
