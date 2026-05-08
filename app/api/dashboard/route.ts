// Get dashboard statistics

import { getDashboardStats } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const orgId = url.searchParams.get("org_id")

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const stats = await getDashboardStats(Number.parseInt(orgId))

    return NextResponse.json({ data: stats })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch dashboard stats" },
      { status: 500 },
    )
  }
}
