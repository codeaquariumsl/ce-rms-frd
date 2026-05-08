// Get all customers and create new customers

import { query } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const orgId = url.searchParams.get("org_id")

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const customers = await query("SELECT * FROM customers WHERE organization_id = $1 ORDER BY name", [
      Number.parseInt(orgId),
    ])

    return NextResponse.json({ data: customers })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch customers" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { org_id, name, phone, email, address, city, country } = body

    if (!org_id || !name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO customers 
       (organization_id, name, phone, email, address, city, country)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [org_id, name, phone, email, address, city, country],
    )

    return NextResponse.json({ data: result[0] }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create customer" },
      { status: 500 },
    )
  }
}
