"use client"

import type { InventoryItem } from "@/lib/types"
import { useState, useEffect } from "react"
import { getInventoryItems, deleteInventoryItem, saveItemSerials } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { MoreVertical, Plus, Search, Trash2, Edit, Barcode } from "lucide-react"
import { SerialManagementModal } from "./serial-management-modal"

interface InventoryListProps {
  organizationId: number
  onAddItem?: () => void
  onEditItem?: (item: InventoryItem) => void
  onDeleteItem?: (id: number) => void
}

// const INVENTORY_STORAGE_KEY = "rms_inventory"

export function InventoryList({ organizationId, onAddItem, onEditItem, onDeleteItem }: InventoryListProps) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [selectedItemForSerials, setSelectedItemForSerials] = useState<InventoryItem | null>(null)
  const [showSerialModal, setShowSerialModal] = useState(false)

  useEffect(() => {
    fetchInventory()
  }, [organizationId])

  useEffect(() => {
    filterItems()
  }, [items, searchTerm, statusFilter])

  async function fetchInventory() {
    try {
      setLoading(true)
      const data = await getInventoryItems(organizationId)
      setItems(data)
    } catch (error) {
      console.error("Failed to fetch inventory:", error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  function filterItems() {
    let filtered = items

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.barcode.includes(searchTerm),
      )
    }

    if (statusFilter) {
      filtered = filtered.filter((item) => item.status === statusFilter)
    }

    setFilteredItems(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available":
        return "bg-green-100 text-green-800"
      case "Reserved":
        return "bg-blue-100 text-blue-800"
      case "Delivered":
        return "bg-purple-100 text-purple-800"
      case "Damaged":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  async function handleDelete(id: number) {
    if (confirm("Are you sure you want to delete this item?")) {
      try {
        await deleteInventoryItem(id)
        setItems(items.filter((item) => item.id !== id))
        onDeleteItem?.(id)
      } catch (error) {
        console.error("Failed to delete item:", error)
        alert("Failed to delete item: " + (error as Error).message)
      }
    }
  }

  async function handleSaveSerials(serials: any[]) {
    if (!selectedItemForSerials) return

    try {
      await saveItemSerials(selectedItemForSerials.id, serials)
      await fetchInventory() // Refresh the list to get updated totals and serials
      setShowSerialModal(false)
      setSelectedItemForSerials(null)
    } catch (error) {
      console.error("Failed to save serials:", error)
      alert("Failed to save serials: " + (error as Error).message)
    }
  }


  if (loading) {
    return <div className="text-center py-8">Loading inventory...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, or barcode..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={onAddItem} variant="default">
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={statusFilter === null ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(null)}>
          All Items
        </Button>
        {["Available", "Reserved", "Delivered", "Damaged"].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-lg">{item.name}</h3>
                <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEditItem?.(item)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedItemForSerials(item)
                      setShowSerialModal(true)
                    }}
                  >
                    <Barcode className="w-4 h-4 mr-2" />
                    Manage Serials
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Badge className={`${getStatusColor(item.status)} mb-3`}>{item.status}</Badge>

            {/* Serial Numbers Info */}
            {item.serial_numbers && item.serial_numbers.length > 0 && (
              <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs font-semibold text-primary mb-1">Serial Numbers: {item.serial_numbers.length}</p>
                <div className="flex flex-wrap gap-1">
                  {item.serial_numbers.slice(0, 3).map((sn) => (
                    <Badge key={sn.id} variant="outline" className="text-xs font-mono">
                      {sn.serial_code}
                    </Badge>
                  ))}
                  {item.serial_numbers.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{item.serial_numbers.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate/Day:</span>
                <span className="font-medium">{item.rental_rate_per_day}</span>
              </div>
              {item.rental_rate_per_week && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate/Week:</span>
                  <span className="font-medium">{item.rental_rate_per_week}</span>
                </div>
              )}
              {item.rental_rate_per_month && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate/Month:</span>
                  <span className="font-medium">{item.rental_rate_per_month}</span>
                </div>
              )}
            </div>

            {item.description && <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{item.description}</p>}
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No inventory items found</p>
        </div>
      )}

      {/* Serial Management Modal */}
      {selectedItemForSerials && (
        <SerialManagementModal
          isOpen={showSerialModal}
          itemName={selectedItemForSerials.name}
          itemId={selectedItemForSerials.id}
          currentSerials={selectedItemForSerials.serial_numbers || []}
          onSave={handleSaveSerials}
          onCancel={() => {
            setShowSerialModal(false)
            setSelectedItemForSerials(null)
          }}
        />
      )}
    </div>
  )
}
