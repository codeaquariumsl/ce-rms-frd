// Types and Interfaces for Rental Management System

export type UserRole = "admin" | "manager" | "staff"
export type ItemStatus = "Available" | "Reserved" | "Delivered" | "Damaged"
export type BookingStatus =
  | "Reserved"
  | "Ready for Pickup"
  | "Delivered"
  | "Returned"
  | "Returned Damaged"
  | "Cancelled"
export type DeliveryStatus = "Pending" | "Prepared" | "Delivered" | "Cancelled"
export type ReturnStatus = "Pending" | "Returned" | "Returned Damaged" | "Partial Return"
export type ItemCondition = "Good" | "Minor Damage" | "Major Damage"
export type NotificationType = "SMS" | "Email" | "Push" | "Dashboard"
export type DamageSeverity = "Minor" | "Major" | "Total Loss"

// Organization
export interface Organization {
  id: number
  name: string
  slug: string
  address?: string
  phone?: string
  email?: string
  created_at: string
  updated_at: string
}

// User
export interface User {
  id: number
  organization_id: number
  name: string
  email: string
  password_hash?: string
  role: UserRole
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Customer
export interface Customer {
  id: number
  organization_id: number
  name: string
  email?: string
  phone: string
  address?: string
  city?: string
  country?: string
  registration_date: string
  created_at: string
  updated_at: string
}

// Category
export interface Category {
  id: number
  organization_id: number
  name: string
  description?: string
  color?: string
  icon?: string
  created_at: string
  updated_at: string
}

// Serial Number
export interface SerialNumber {
  id: number
  item_id: number
  serial_code: string
  status: "Available" | "Reserved" | "Delivered" | "Damaged"
  created_at: string
  updated_at: string
}

// Inventory Item
export interface InventoryItem {
  id: number
  organization_id: number
  name: string
  description?: string
  sku: string
  barcode: string
  category?: string
  category_id?: number
  rental_rate_per_day: number
  rental_rate_per_week?: number
  rental_rate_per_month?: number
  status: ItemStatus
  quantity_total: number
  quantity_available: number
  quantity_reserved: number
  quantity_delivered: number
  quantity_damaged: number
  serial_numbers?: SerialNumber[]
  created_at: string
  updated_at: string
}

// Booking
export interface Booking {
  id: number
  organization_id: number
  customer_id: number
  booking_number: string
  status: BookingStatus
  delivery_date: string
  return_date: string
  total_amount?: number
  notes?: string
  created_by?: number
  created_at: string
  updated_at: string
}

// Booking Item (Join)
export interface BookingItem {
  id: number
  booking_id: number
  inventory_item_id: number
  quantity: number
  rental_rate_per_day: number
  subtotal?: number
  created_at: string
}

// Booking Details (Combined)
export interface BookingDetails extends Booking {
  customer?: Customer
  items?: BookingItem[]
  created_by_user?: User
}

// Delivery
export interface Delivery {
  id: number
  booking_id: number
  status: DeliveryStatus
  prepared_by?: number
  prepared_at?: string
  delivered_by?: number
  delivered_at?: string
  barcode_scanned_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Return
export interface Return {
  id: number
  booking_id: number
  delivery_id?: number
  status: ReturnStatus
  item_condition?: ItemCondition
  damage_notes?: string
  returned_by?: number
  returned_at?: string
  barcode_scanned_at?: string
  created_at: string
  updated_at: string
}

// Damaged Inventory Log
export interface DamagedInventoryLog {
  id: number
  inventory_item_id: number
  booking_id?: number
  return_id?: number
  damage_description?: string
  severity?: DamageSeverity
  reported_by?: number
  repair_status: string
  created_at: string
  updated_at: string
}

// Notification
export interface Notification {
  id: number
  organization_id: number
  type: NotificationType
  recipient_type?: "Customer" | "Staff" | "Admin"
  recipient_id?: number
  recipient_phone?: string
  recipient_email?: string
  subject?: string
  message: string
  booking_id?: number
  status: "Pending" | "Sent" | "Failed" | "Cancelled"
  sent_at?: string
  error_message?: string
  created_at: string
}

// Activity Log
export interface ActivityLog {
  id: number
  organization_id: number
  user_id?: number
  action: string
  entity_type?: string
  entity_id?: number
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  created_at: string
}

// Dashboard Statistics
export interface DashboardStats {
  total_inventory: number
  available_items: number
  reserved_items: number
  delivered_items: number
  damaged_items: number
  today_deliveries: number
  tomorrow_deliveries: number
  pending_returns: number
  overdue_returns: number
}
