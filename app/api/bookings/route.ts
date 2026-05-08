// Get all bookings and create new bookings

import { query } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const orgId = url.searchParams.get("org_id")
    const status = url.searchParams.get("status")

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    let queryStr = `
      SELECT b.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      WHERE b.organization_id = $1
    `
    const values: any[] = [Number.parseInt(orgId)]

    if (status) {
      queryStr += " AND b.status = $2"
      values.push(status)
    }

    queryStr += " ORDER BY b.delivery_date ASC"

    const bookings = await query(queryStr, values)

    return NextResponse.json({ data: bookings })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch bookings" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      org_id,
      customer_id,
      items, // Array of { inventory_item_id, quantity }
      delivery_date,
      return_date,
      created_by,
      notes,
    } = body

    if (!org_id || !customer_id || !items || !delivery_date || !return_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate dates
    const deliveryDate = new Date(delivery_date)
    const returnDate = new Date(return_date)

    if (returnDate <= deliveryDate) {
      return NextResponse.json({ error: "Return date must be after delivery date" }, { status: 400 })
    }

    // Check availability for all items
    for (const item of items) {
      const availabilityCheck = await query(
        `SELECT ii.quantity_available
         FROM inventory_items ii
         LEFT JOIN booking_items bi ON ii.id = bi.inventory_item_id
         LEFT JOIN bookings b ON bi.booking_id = b.id
         WHERE ii.id = $1 AND ii.organization_id = $2
         AND (b.return_date IS NULL OR b.return_date < $3)
         GROUP BY ii.quantity_available`,
        [item.inventory_item_id, org_id, delivery_date],
      )

      if (availabilityCheck.length === 0 || availabilityCheck[0].quantity_available < item.quantity) {
        return NextResponse.json(
          { error: `Item ${item.inventory_item_id} not available for requested dates` },
          { status: 409 },
        )
      }
    }

    // Generate booking number
    const bookingNumber = `BK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Create booking
    const bookingResult = await query(
      `INSERT INTO bookings 
       (organization_id, customer_id, booking_number, status, delivery_date, return_date, created_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [org_id, customer_id, bookingNumber, "Reserved", delivery_date, return_date, created_by, notes],
    )

    const booking = bookingResult[0]

    // Add items to booking and calculate total
    let totalAmount = 0
    const rentalDays = Math.ceil((returnDate.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24))

    for (const item of items) {
      const itemDetails = await query("SELECT rental_rate_per_day FROM inventory_items WHERE id = $1", [
        item.inventory_item_id,
      ])

      if (itemDetails.length === 0) {
        throw new Error(`Item ${item.inventory_item_id} not found`)
      }

      const subtotal = itemDetails[0].rental_rate_per_day * item.quantity * rentalDays
      totalAmount += subtotal

      await query(
        `INSERT INTO booking_items 
         (booking_id, inventory_item_id, quantity, rental_rate_per_day, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [booking.id, item.inventory_item_id, item.quantity, itemDetails[0].rental_rate_per_day, subtotal],
      )

      // Update inventory status
      await query(
        `UPDATE inventory_items 
         SET quantity_reserved = quantity_reserved + $1, 
             status = 'Reserved'
         WHERE id = $2`,
        [item.quantity, item.inventory_item_id],
      )
    }

    // Update booking total
    await query("UPDATE bookings SET total_amount = $1 WHERE id = $2", [totalAmount, booking.id])

    // Create delivery record
    await query(
      `INSERT INTO deliveries (booking_id, status)
       VALUES ($1, $2)`,
      [booking.id, "Pending"],
    )

    return NextResponse.json(
      {
        data: {
          ...booking,
          total_amount: totalAmount,
          item_count: items.length,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create booking" },
      { status: 500 },
    )
  }
}
