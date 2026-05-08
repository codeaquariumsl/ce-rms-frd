-- Rental Management System - Database Schema

-- Organizations/Branches Table
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table (Admin, Manager, Staff)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, email)
);

-- Categories Table (new)
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(50) DEFAULT 'Package',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, name)
);

-- Inventory Items Table
CREATE TABLE inventory_items (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(100) UNIQUE NOT NULL,
  barcode VARCHAR(255) UNIQUE NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  rental_rate_per_day DECIMAL(10, 2) NOT NULL,
  rental_rate_per_week DECIMAL(10, 2),
  rental_rate_per_month DECIMAL(10, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Reserved', 'Delivered', 'Damaged')),
  quantity_total INTEGER NOT NULL DEFAULT 1,
  quantity_available INTEGER NOT NULL DEFAULT 1,
  quantity_reserved INTEGER NOT NULL DEFAULT 0,
  quantity_delivered INTEGER NOT NULL DEFAULT 0,
  quantity_damaged INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings/Orders Table
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Reserved' CHECK (status IN ('Reserved', 'Ready for Pickup', 'Delivered', 'Returned', 'Returned Damaged', 'Cancelled')),
  delivery_date DATE NOT NULL,
  return_date DATE NOT NULL,
  total_amount DECIMAL(10, 2),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Booking Items (Join table for items in each booking)
CREATE TABLE booking_items (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  rental_rate_per_day DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery Records Table
CREATE TABLE deliveries (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Prepared', 'Delivered', 'Cancelled')),
  prepared_by INTEGER REFERENCES users(id),
  prepared_at TIMESTAMP,
  delivered_by INTEGER REFERENCES users(id),
  delivered_at TIMESTAMP,
  barcode_scanned_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Return Records Table
CREATE TABLE returns (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  delivery_id INTEGER REFERENCES deliveries(id),
  status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Returned', 'Returned Damaged', 'Partial Return')),
  item_condition VARCHAR(50) CHECK (item_condition IN ('Good', 'Minor Damage', 'Major Damage')),
  damage_notes TEXT,
  returned_by INTEGER REFERENCES users(id),
  returned_at TIMESTAMP,
  barcode_scanned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Damaged Inventory Log Table
CREATE TABLE damaged_inventory_log (
  id SERIAL PRIMARY KEY,
  inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  booking_id INTEGER REFERENCES bookings(id),
  return_id INTEGER REFERENCES returns(id),
  damage_description TEXT,
  severity VARCHAR(50) CHECK (severity IN ('Minor', 'Major', 'Total Loss')),
  reported_by INTEGER REFERENCES users(id),
  repair_status VARCHAR(50) DEFAULT 'Pending' CHECK (repair_status IN ('Pending', 'In Repair', 'Repaired', 'Scrapped')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications/Alerts Table
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('SMS', 'Email', 'Push', 'Dashboard')),
  recipient_type VARCHAR(50) CHECK (recipient_type IN ('Customer', 'Staff', 'Admin')),
  recipient_id INTEGER,
  recipient_phone VARCHAR(20),
  recipient_email VARCHAR(255),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Sent', 'Failed', 'Cancelled')),
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity Logs Table
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_categories_org ON categories(organization_id);
CREATE INDEX idx_inventory_org ON inventory_items(organization_id);
CREATE INDEX idx_inventory_category ON inventory_items(category_id);
CREATE INDEX idx_inventory_status ON inventory_items(status);
CREATE INDEX idx_bookings_org ON bookings(organization_id);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_delivery_date ON bookings(delivery_date);
CREATE INDEX idx_bookings_return_date ON bookings(return_date);
CREATE INDEX idx_deliveries_booking ON deliveries(booking_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_returns_booking ON returns(booking_id);
CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_activity_logs_org ON activity_logs(organization_id);
CREATE INDEX idx_customers_org ON customers(organization_id);
CREATE INDEX idx_users_org ON users(organization_id);
