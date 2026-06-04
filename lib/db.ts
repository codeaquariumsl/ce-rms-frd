/**
 * lib/db.ts
 * ---------------------------------------------------------------------------
 * Database utility shim — replaces the former Neon PostgreSQL client.
 * All named exports are now backed by the rms-bkd Express API (api-client.ts).
 *
 * The generic `query` / `queryOne` stubs are kept for any remaining direct
 * callers; they throw a descriptive error so developers know to migrate.
 * ---------------------------------------------------------------------------
 */

export {
  // Inventory
  getInventoryItems,
  getInventoryItemById,
  getInventoryByBarcode,
  getDamagedInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getSerialsByItem,
  saveItemSerials,


  // Issues
  getIssues,
  getIssueById,
  createIssue,
  updateIssue,

  // Bookings
  getBookings,
  getBookingById,
  getBookingsByDeliveryDate,
  getUpcomingDeliveries,
  checkAvailability,
  createBooking,
  updateBooking,
  cancelBooking,

  // Deliveries
  getDeliveries,
  getDeliveryById,
  updateDeliveryStatus,

  // Returns
  getPendingReturns,
  getReturnById,
  processReturn,
  getDamagedItems,
  updateRepairStatus,

  // Customers
  getCustomers,
  getCustomerById,
  createCustomer,

  // Categories
  getCategories,
  createCategory,
  deleteCategory,

  // Notifications
  getPendingNotifications,
  markNotificationAsSent,

  // Dashboard
  getDashboardStats,

  // Reports
  getInventoryReport,
  getDeliveryScheduleReport,
  getPendingReturnsReport,
  getRentalHistoryReport,
  getCustomerIssuesReport,
  getDailyIssuesReport,
  getDailyReturnsReport,
  getDailyPaymentsReport,
  getMonthlyCollectionsReport,
  getCurrentStockReport,

  // Barcode
  scanBarcode,

  // Low-level helpers
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  BASE_URL,
} from "./api-client"

/**
 * Legacy generic `query` — kept so any remaining import doesn't hard-fail.
 * Callers should migrate to the specific named functions above.
 */
export async function query<T = any>(_sql: string, _values?: any[]): Promise<T[]> {
  throw new Error(
    "[db.ts] Direct SQL query() is no longer supported. " +
      "Use the typed functions from lib/api-client.ts (e.g. getBookings, getInventoryItems…) " +
      "or call the rms-bkd backend via apiGet/apiPost helpers."
  )
}

export async function queryOne<T = any>(_sql: string, _values?: any[]): Promise<T | null> {
  throw new Error(
    "[db.ts] Direct SQL queryOne() is no longer supported. " +
      "Use the typed functions from lib/api-client.ts."
  )
}

/** @deprecated — no-op, kept to avoid import errors */
export const sql = null
