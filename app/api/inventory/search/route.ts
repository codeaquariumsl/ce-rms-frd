// Search inventory by barcode or SKU

import { query } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const barcode = url.searchParams.get("barcode")
    const sku = url.searchParams.get("sku")
    const orgId = url.searchParams.get("org_id")

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    if (barcode) {
      const item = await query("SELECT * FROM inventory_items WHERE barcode = $1 AND organization_id = $2", [
        barcode,
        Number.parseInt(orgId),
      ])
      return NextResponse.json({ data: item[0] || null })
    }

    if (sku) {
      const item = await query("SELECT * FROM inventory_items WHERE sku = $1 AND organization_id = $2", [
        sku,
        Number.parseInt(orgId),
      ])
      return NextResponse.json({ data: item[0] || null })
    }

    return NextResponse.json({ error: "Barcode or SKU parameter required" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Search failed" }, { status: 500 })
  }
}
