-- Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7),
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, name)
);

-- Add category_id column to inventory_items
ALTER TABLE inventory_items 
ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_categories_org ON categories(organization_id);
CREATE INDEX idx_inventory_category ON inventory_items(category_id);

-- Migrate existing category strings to category records (optional data migration)
INSERT INTO categories (organization_id, name, created_at, updated_at)
SELECT DISTINCT organization_id, category, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM inventory_items
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (organization_id, name) DO NOTHING;

-- Update inventory_items to use category_id
UPDATE inventory_items
SET category_id = c.id
FROM categories c
WHERE c.organization_id = inventory_items.organization_id
  AND c.name = inventory_items.category;
