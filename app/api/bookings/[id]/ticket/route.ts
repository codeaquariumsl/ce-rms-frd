// Generate booking ticket with barcode and QR code

import { query } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Get booking with items
    const bookingRes = await query(
      `SELECT b.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address, c.city
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       WHERE b.id = $1`,
      [Number.parseInt(id)],
    )

    if (bookingRes.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const booking = bookingRes[0]

    // Get booking items with inventory details
    const items = await query(
      `SELECT bi.*, ii.name, ii.sku, ii.barcode
       FROM booking_items bi
       JOIN inventory_items ii ON bi.inventory_item_id = ii.id
       WHERE bi.booking_id = $1`,
      [Number.parseInt(id)],
    )

    // Generate QR code data (JSON with booking details)
    const qrData = {
      bookingNumber: booking.booking_number,
      bookingId: booking.id,
      customerId: booking.customer_id,
      deliveryDate: booking.delivery_date,
      returnDate: booking.return_date,
      totalAmount: booking.total_amount,
    }

    const ticket = {
      booking: {
        id: booking.id,
        number: booking.booking_number,
        status: booking.status,
        created_at: booking.created_at,
        notes: booking.notes,
      },
      customer: {
        name: booking.customer_name,
        phone: booking.customer_phone,
        email: booking.customer_email,
        address: booking.address,
        city: booking.city,
      },
      items,
      dates: {
        delivery_date: booking.delivery_date,
        return_date: booking.return_date,
      },
      total_amount: booking.total_amount,
      qr_code_data: JSON.stringify(qrData),
    }

    return NextResponse.json({ data: ticket })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate ticket" },
      { status: 500 },
    )
  }
}
