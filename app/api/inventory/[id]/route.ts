// Get, update, and delete individual inventory items

import { query, getInventoryItemById } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const item = await getInventoryItemById(Number.parseInt(id))

    if (!item) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 })
    }

    return NextResponse.json({ data: item })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch item" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      name,
      description,
      category,
      rental_rate_per_day,
      rental_rate_per_week,
      rental_rate_per_month,
      status,
      quantity_total,
    } = body

    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(name)
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      values.push(description)
    }
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`)
      values.push(category)
    }
    if (rental_rate_per_day !== undefined) {
      updates.push(`rental_rate_per_day = $${paramIndex++}`)
      values.push(rental_rate_per_day)
    }
    if (rental_rate_per_week !== undefined) {
      updates.push(`rental_rate_per_week = $${paramIndex++}`)
      values.push(rental_rate_per_week)
    }
    if (rental_rate_per_month !== undefined) {
      updates.push(`rental_rate_per_month = $${paramIndex++}`)
      values.push(rental_rate_per_month)
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      values.push(status)
    }
    if (quantity_total !== undefined) {
      updates.push(`quantity_total = $${paramIndex++}`)
      values.push(quantity_total)
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(Number.parseInt(id))

    const result = await query(
      `UPDATE inventory_items SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    )

    if (result.length === 0) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 })
    }

    return NextResponse.json({ data: result[0] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update item" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const result = await query("DELETE FROM inventory_items WHERE id = $1 RETURNING id", [Number.parseInt(id)])

    if (result.length === 0) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Item deleted successfully" })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete item" },
      { status: 500 },
    )
  }
}
