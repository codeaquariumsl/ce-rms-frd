/**
 * rms-frd/lib/api-client.ts
 * ---------------------------------------------------------------------------
 * Typed HTTP client that calls the rms-bkd Express backend.
 * All functions mirror the helper names previously exported from lib/db.ts so
 * existing consumers can switch with a simple import path change.
 * ---------------------------------------------------------------------------
 */

const BASE_URL = "/api/proxy"

function getUrl(path: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`
  return `${BASE_URL}${cleanPath}`
}

function getHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("rms_token")
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
  }
  return headers
}

// ─── Low-level helpers ────────────────────────────────────────────────────────

async function get<T = any>(path: string, params?: Record<string, any>): Promise<T> {
  const base = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
  const url = new URL(getUrl(path), base)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    })
  }
  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: getHeaders()
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

async function post<T = any>(path: string, body: any): Promise<T> {
  const res = await fetch(getUrl(path), {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

async function patch<T = any>(path: string, body: any): Promise<T> {
  const res = await fetch(getUrl(path), {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

async function del<T = any>(path: string): Promise<T> {
  const res = await fetch(getUrl(path), {
    method: "DELETE",
    headers: getHeaders()
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

// ─── Authentication ──────────────────────────────────────────────────────────

export async function login(credentials: any) {
  const json = await post("/auth/login", credentials)
  if (json.token) {
    localStorage.setItem("rms_token", json.token)
    localStorage.setItem("rms_user", JSON.stringify(json.user))
  }
  return json
}

export async function register(data: any) {
  return post("/auth/register", data)
}

export function logout() {
  localStorage.removeItem("rms_token")
  localStorage.removeItem("rms_user")
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export async function getInventoryItems(orgId: number, status?: string) {
  const json = await get("/inventory", { org_id: orgId, status })
  return json.data ?? json
}

export async function getInventoryItemById(itemId: number) {
  const json = await get(`/inventory/${itemId}`)
  return json.data ?? json
}

export async function getInventoryByBarcode(barcode: string, orgId: number) {
  const json = await get("/inventory/search", { barcode, org_id: orgId })
  return json.data ?? null
}

export async function getDamagedInventory(orgId: number) {
  const json = await get("/inventory/damaged", { org_id: orgId })
  return json.data ?? json
}

export async function createInventoryItem(data: any) {
  const json = await post("/inventory", data)
  return json.data ?? json
}

export async function updateInventoryItem(id: number, data: any) {
  const json = await patch(`/inventory/${id}`, data)
  return json.data ?? json
}

export async function deleteInventoryItem(id: number) {
  return del(`/inventory/${id}`)
}

export async function getSerialsByItem(itemId: number) {
  const json = await get(`/serials/item/${itemId}`)
  return json.data ?? json
}

export async function saveItemSerials(itemId: number, serials: any[]) {
  return post(`/serials/item/${itemId}`, { serials })
}

// ─── Issues ───────────────────────────────────────────────────────────────────

export async function getIssues(orgId: number) {
  const json = await get("/issues", { org_id: orgId })
  return json.data ?? json
}

export async function getIssueById(id: number) {
  const json = await get(`/issues/${id}`)
  return json.data ?? json
}

export async function createIssue(data: any) {
  const json = await post("/issues", data)
  return json.data ?? json
}

export async function updateIssue(id: number, data: any) {
  if (data.status) {
    return patch(`/issues/${id}/status`, data)
  }
  if (data.payment_status) {
    return patch(`/issues/${id}/payment`, { payment_status: data.payment_status })
  }
  return patch(`/issues/${id}`, data) // Keep fallback
}


// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function getBookings(orgId: number, status?: string) {
  const json = await get("/bookings", { org_id: orgId, status })
  return json.data ?? json
}

export async function getBookingById(bookingId: number) {
  const json = await get(`/bookings/${bookingId}`)
  return json.data ?? json
}

export async function getBookingsByDeliveryDate(orgId: number, date: string) {
  const json = await get("/bookings", { org_id: orgId })
  const rows = json.data ?? json
  return rows.filter((b: any) => String(b.delivery_date).startsWith(date))
}

export async function getUpcomingDeliveries(orgId: number, days = 7) {
  const json = await get("/deliveries", { org_id: orgId, date: "upcoming" })
  return json.data ?? json
}

export async function checkAvailability(
  orgId: number,
  items: { inventory_item_id: number; quantity: number }[],
  deliveryDate: string,
  returnDate: string,
) {
  return post("/bookings/availability", {
    org_id: orgId,
    items,
    delivery_date: deliveryDate,
    return_date: returnDate,
  })
}

export async function createBooking(data: any) {
  const json = await post("/bookings", data)
  return json.data ?? json
}

export async function updateBooking(id: number, data: any) {
  const json = await patch(`/bookings/${id}`, data)
  return json.data ?? json
}

export async function cancelBooking(id: number) {
  return del(`/bookings/${id}`)
}

// ─── Deliveries ───────────────────────────────────────────────────────────────

export async function getDeliveries(orgId: number, status?: string, date?: string) {
  const json = await get("/deliveries", { org_id: orgId, status, date })
  return json.data ?? json
}

export async function getDeliveryById(deliveryId: number) {
  const json = await get(`/deliveries/${deliveryId}`)
  return json.data ?? json
}

export async function updateDeliveryStatus(id: number, status: string) {
  const json = await patch(`/deliveries/${id}/status`, { status })
  return json.data ?? json
}

// ─── Returns ─────────────────────────────────────────────────────────────────

export async function getPendingReturns(orgId: number) {
  const json = await get("/returns", { org_id: orgId, status: "Pending" })
  return json.data ?? json
}

export async function getReturnById(returnId: number) {
  const json = await get(`/returns/${returnId}`)
  return json.data ?? json
}

export async function processReturn(data: any) {
  const json = await post("/returns", data)
  return json.data ?? json
}

export async function getDamagedItems(orgId: number, repairStatus?: string) {
  const json = await get("/damaged-items", { org_id: orgId, repair_status: repairStatus })
  return json.data ?? json
}

export async function updateRepairStatus(id: number, repairStatus: string) {
  const json = await patch(`/damaged-items/${id}`, { repair_status: repairStatus })
  return json.data ?? json
}

// ─── Customers ────────────────────────────────────────────────────────────────

export async function getCustomers(orgId: number) {
  const json = await get("/customers", { org_id: orgId })
  return json.data ?? json
}

export async function getCustomerById(customerId: number) {
  const json = await get("/customers", { org_id: "1" }) // fetched from list — filter client-side
  const rows = json.data ?? json
  return rows.find((c: any) => c.id === customerId) ?? null
}

export async function createCustomer(data: any) {
  const json = await post("/customers", data)
  return json.data ?? json
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(orgId: number) {
  const json = await get("/categories", { org_id: orgId })
  return json.data ?? json
}

export async function createCategory(data: any) {
  const json = await post("/categories", data)
  return json.data ?? json
}

export async function deleteCategory(id: number) {
  return del(`/categories/${id}`)
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getPendingNotifications(orgId: number) {
  const json = await get("/notifications", { org_id: orgId, status: "Pending" })
  return json.data ?? json
}

export async function markNotificationAsSent(notificationId: number) {
  const json = await patch(`/notifications/${notificationId}/send`, {})
  return json.data ?? json
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function getDashboardStats(orgId: number) {
  const json = await get("/dashboard/stats", { org_id: orgId })
  return json.data ?? json
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function getInventoryReport(orgId: number) {
  const json = await get("/reports/inventory", { org_id: orgId })
  return json
}

export async function getDeliveryScheduleReport(orgId: number, days = 30) {
  const json = await get("/reports/delivery-schedule", { org_id: orgId, days })
  return json
}

export async function getPendingReturnsReport(orgId: number) {
  const json = await get("/reports/pending-returns", { org_id: orgId })
  return json
}

export async function getRentalHistoryReport(
  orgId: number,
  opts?: { customer_id?: number; from_date?: string; to_date?: string },
) {
  const json = await get("/reports/rental-history", { org_id: orgId, ...opts })
  return json
}

export async function getCustomerIssuesReport(orgId: number) {
  const json = await get("/reports/customer-issues", { org_id: orgId })
  return json
}

// ─── Barcode ─────────────────────────────────────────────────────────────────

export async function scanBarcode(barcode: string, action?: string) {
  const json = await post("/barcode/scan", { barcode, action })
  return json.data ?? json
}

// ─── Re-export low-level helpers for callers that need them ──────────────────
export { get as apiGet, post as apiPost, patch as apiPatch, del as apiDelete, BASE_URL }
