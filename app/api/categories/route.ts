import { query, queryOne } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

// GET - Fetch all categories for an organization
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orgId = searchParams.get("org_id")

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const categories = await query("SELECT * FROM categories WHERE organization_id = $1 ORDER BY name ASC", [
      Number.parseInt(orgId),
    ])

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}

// POST - Create a new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { org_id, name, description, color, icon } = body

    const organizationId = Number.parseInt(String(org_id))
    if (isNaN(organizationId) || !name || !name.toString().trim()) {
      console.log("[v0] Invalid input - org_id:", org_id, "name:", name)
      return NextResponse.json({ error: "Organization ID and category name are required" }, { status: 400 })
    }

    // Check if category already exists
    const existing = await queryOne("SELECT id FROM categories WHERE organization_id = $1 AND name = $2", [
      organizationId,
      name.toString().trim(),
    ])

    if (existing) {
      return NextResponse.json({ error: "Category already exists" }, { status: 409 })
    }

    const result = await query(
      `INSERT INTO categories (organization_id, name, description, color, icon, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [organizationId, name.toString().trim(), description || null, color || "#3B82F6", icon || "Package"],
    )

    console.log("[v0] Category created:", result[0])
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating category:", error)
    console.log("[v0] Full error details:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: "Failed to create category", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
