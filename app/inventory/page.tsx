"use client"

import { useState } from "react"
import { InventoryList } from "@/components/inventory/inventory-list"
import { AddInventoryForm } from "@/components/inventory/add-inventory-form"
import { CategoryManager } from "@/components/inventory/category-manager"
import type { InventoryItem } from "@/lib/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function InventoryPage() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  // Demo organization ID - in production, this would come from auth context
  const organizationId = 1

  function handleAddItemClick() {
    setShowAddForm(true)
    setSelectedItem(null)
  }

  function handleFormSuccess() {
    setShowAddForm(false)
    setRefreshKey((prev) => prev + 1)
    setSelectedItem(null)
  }

  function handleFormCancel() {
    setShowAddForm(false)
    setSelectedItem(null)
  }

  function handleEditItem(item: InventoryItem) {
    setSelectedItem(item)
    setShowAddForm(true)
  }

  function handleDeleteItem(id: number) {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground mt-2">Manage your rental items, categories, and track availability</p>
        </div>

        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inventory">Inventory Items</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4">
            {showAddForm ? (
              <AddInventoryForm
                organizationId={organizationId}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            ) : (
              <InventoryList
                key={refreshKey}
                organizationId={organizationId}
                onAddItem={handleAddItemClick}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
              />
            )}
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <CategoryManager
              organizationId={organizationId}
              onCategoryAdded={() => setRefreshKey((prev) => prev + 1)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
