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
          item.barcode.includes(searchTerm) ||
          item.serial_numbers?.some(sn => sn.serial_code.toLowerCase().includes(searchTerm.toLowerCase())),
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
            placeholder="Search by name, SKU, barcode, or serial..."
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
          <Card key={item.id} className="p-5 hover:shadow-md transition-shadow border border-slate-200 flex flex-col justify-between bg-card text-card-foreground">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1">
                  <h3 className="font-semibold text-base leading-snug">{item.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-slate-100">
                      {item.sku}
                    </span>
                  </div>
                </div>
                <Badge className={`${getStatusColor(item.status)} font-medium`}>{item.status}</Badge>
              </div>

              {/* Stock Info */}
              <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50/50 rounded-lg border border-slate-100 text-xs">
                <div>
                  <span className="text-muted-foreground block">Total Stock</span>
                  <span className="font-bold text-foreground text-sm">{item.quantity_total}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Available</span>
                  <span className="font-bold text-emerald-600 text-sm">{item.quantity_available}</span>
                </div>
              </div>

              {/* Rates */}
              <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 text-xs bg-white">
                <div className="flex justify-between p-2">
                  <span className="text-muted-foreground">Rate / Day</span>
                  <span className="font-semibold text-foreground">LKR {item.rental_rate_per_day}</span>
                </div>
                {item.rental_rate_per_week !== null && item.rental_rate_per_week !== undefined && (
                  <div className="flex justify-between p-2">
                    <span className="text-muted-foreground">Rate / Week</span>
                    <span className="font-semibold text-foreground">LKR {item.rental_rate_per_week}</span>
                  </div>
                )}
                {item.rental_rate_per_month !== null && item.rental_rate_per_month !== undefined && (
                  <div className="flex justify-between p-2">
                    <span className="text-muted-foreground">Rate / Month</span>
                    <span className="font-semibold text-foreground">LKR {item.rental_rate_per_month}</span>
                  </div>
                )}
              </div>

              {/* Serial Numbers Info */}
              {item.serial_numbers && item.serial_numbers.length > 0 && (
                <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-100 text-xs">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-semibold text-blue-800">Serials ({item.serial_numbers.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-[64px] overflow-y-auto">
                    {item.serial_numbers.slice(0, 5).map((sn) => (
                      <Badge
                        key={sn.id}
                        variant="outline"
                        className={`text-[9px] font-mono leading-none py-0.5 px-1.5 ${
                          sn.status === 'Available' ? 'border-emerald-200 text-emerald-700 bg-emerald-50/50' :
                          sn.status === 'Damaged' ? 'border-rose-200 text-rose-700 bg-rose-50/50' :
                          'border-slate-200 text-slate-500 bg-slate-50/50'
                        }`}
                      >
                        {sn.serial_code}
                      </Badge>
                    ))}
                    {item.serial_numbers.length > 5 && (
                      <span className="text-[9px] text-muted-foreground self-center font-medium pl-1">
                        +{item.serial_numbers.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {item.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 italic">
                  {item.description}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 gap-1.5 text-xs"
                onClick={() => onEditItem?.(item)}
              >
                <Edit className="w-3.5 h-3.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 gap-1.5 text-xs border-blue-200 text-blue-600 hover:bg-blue-50/50 hover:text-blue-700"
                onClick={() => {
                  setSelectedItemForSerials(item)
                  setShowSerialModal(true)
                }}
              >
                <Barcode className="w-3.5 h-3.5" />
                Manage Serials
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300"
                onClick={() => handleDelete(item.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
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
