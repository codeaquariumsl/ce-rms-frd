// Create and manage notifications (SMS, Email, Push)

import { query } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const orgId = url.searchParams.get("org_id")
    const status = url.searchParams.get("status") || "Pending"

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const notifications = await query(
      `SELECT * FROM notifications 
       WHERE organization_id = $1 AND status = $2 
       ORDER BY created_at DESC`,
      [Number.parseInt(orgId), status],
    )

    return NextResponse.json({ data: notifications })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch notifications" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      org_id,
      type, // SMS, Email, Push, Dashboard
      recipient_type,
      recipient_id,
      recipient_phone,
      recipient_email,
      subject,
      message,
      booking_id,
    } = body

    if (!org_id || !type || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create notification record
    const result = await query(
      `INSERT INTO notifications 
       (organization_id, type, recipient_type, recipient_id, recipient_phone, recipient_email, subject, message, booking_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        Number.parseInt(org_id),
        type,
        recipient_type,
        recipient_id,
        recipient_phone,
        recipient_email,
        subject,
        message,
        booking_id,
        "Pending",
      ],
    )

    return NextResponse.json({ data: result[0] }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create notification" },
      { status: 500 },
    )
  }
}
