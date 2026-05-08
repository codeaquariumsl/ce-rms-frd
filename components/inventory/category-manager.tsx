"use client"

import type React from "react"
import type { Category } from "@/lib/types"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Plus, Trash2, Edit } from "lucide-react"
import { getCategories, createCategory, deleteCategory } from "@/lib/db"

interface CategoryManagerProps {
  organizationId: number
  onCategoryAdded?: () => void
}

// const STORAGE_KEY = "rms_categories"

export function CategoryManager({ organizationId, onCategoryAdded }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    icon: "Package",
  })

  useEffect(() => {
    loadCategories()
  }, [organizationId])

  async function loadCategories() {
    try {
      const data = await getCategories(organizationId)
      setCategories(data)
    } catch (error) {
      console.error("Failed to load categories:", error)
    }
  }

  // Removed local saveCategories helper in favor of direct API calls

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      if (editingId) {
        // Update not implemented in db shim yet, but could be added easily
        // For now, focus on removing localStorage
        console.warn("Update category not yet supported via API shim")
      } else {
        const payload = {
          org_id: organizationId,
          ...formData
        }
        await createCategory(payload)
        await loadCategories()
      }

      setFormData({ name: "", description: "", color: "#3B82F6", icon: "Package" })
      setEditingId(null)
      setShowForm(false)
      onCategoryAdded?.()
    } catch (error) {
      console.error("Failed to save category:", error)
      alert("Failed to save category")
    }
  }

  async function handleDelete(id: number) {
    if (confirm("Are you sure? Items using this category will have it removed.")) {
      try {
        await deleteCategory(id)
        setCategories(categories.filter((cat) => cat.id !== id))
      } catch (error) {
        console.error("Failed to delete category:", error)
        alert("Failed to delete category")
      }
    }
  }

  function handleEdit(category: Category) {
    setFormData({
      name: category.name,
      description: category.description || "",
      color: category.color || "#3B82F6",
      icon: category.icon || "Package",
    })
    setEditingId(category.id)
    setShowForm(true)
  }

  function handleCancel() {
    setFormData({ name: "", description: "", color: "#3B82F6", icon: "Package" })
    setEditingId(null)
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Categories</h3>
        <Button onClick={() => setShowForm(true)} size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Category Name *</Label>
              <Input
                id="cat-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Tents"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-description">Description</Label>
              <Input
                id="cat-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cat-color">Color</Label>
                <div className="flex gap-2">
                  <input
                    id="cat-color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                    className="w-10 h-10 rounded border"
                  />
                  <span className="text-sm text-muted-foreground mt-2">{formData.color}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cat-icon">Icon</Label>
                <Input
                  id="cat-icon"
                  value={formData.icon}
                  onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
                  placeholder="e.g., Package"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit">{editingId ? "Update" : "Create"} Category</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-3">
        {categories.map((category) => (
          <Card key={category.id} className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: category.color || "#3B82F6" }} />
              <div>
                <p className="font-medium">{category.name}</p>
                {category.description && <p className="text-sm text-muted-foreground">{category.description}</p>}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(category)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(category.id)} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No categories yet. Create one to get started!</p>
      )}
    </div>
  )
}
