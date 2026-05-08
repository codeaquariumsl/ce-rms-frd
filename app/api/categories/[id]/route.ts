import { query, queryOne } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

// PUT - Update a category
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { name, description, color, icon } = body

    const updated = await query(
      `UPDATE categories 
       SET name = COALESCE($1, name), 
           description = COALESCE($2, description),
           color = COALESCE($3, color),
           icon = COALESCE($4, icon),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [name, description, color, icon, Number.parseInt(params.id)],
    )

    if (updated.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json(updated[0])
  } catch (error) {
    console.error("Error updating category:", error)
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}

// DELETE - Remove a category
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const categoryId = Number.parseInt(params.id)

    // Check if category is in use
    const itemsCount = await queryOne("SELECT COUNT(*) as count FROM inventory_items WHERE category_id = $1", [
      categoryId,
    ])

    if (itemsCount?.count > 0) {
      return NextResponse.json({ error: `Cannot delete category in use by ${itemsCount.count} items` }, { status: 400 })
    }

    const result = await query("DELETE FROM categories WHERE id = $1 RETURNING id", [categoryId])

    if (result.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
}
