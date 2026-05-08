"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"

import { getDamagedItems, updateRepairStatus as apiUpdateRepairStatus } from "@/lib/db"

interface DamagedItemsProps {
  organizationId: number
  repairStatus?: string
}

export function DamagedItems({ organizationId, repairStatus = "Pending" }: DamagedItemsProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchDamagedItems()
  }, [repairStatus])

  async function fetchDamagedItems() {
    try {
      setLoading(true)
      const data = await getDamagedItems(organizationId, repairStatus)
      
      const mappedItems = data.map((item: any) => ({
        id: item.id,
        itemName: item.name,
        bookingId: item.booking_id,
        condition: item.severity,
        repairStatus: item.repair_status,
        notes: item.damage_description,
        returnDate: item.created_at,
      }))
      
      setItems(mappedItems)
      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch damaged items:", error)
      setItems([])
      setLoading(false)
    }
  }

  async function updateRepairStatus(id: number, newStatus: string) {
    try {
      await apiUpdateRepairStatus(id, newStatus)
      fetchDamagedItems()
    } catch (error) {
      console.error("Failed to update repair status:", error)
      alert("Failed to update repair status: " + (error instanceof Error ? error.message : String(error)))
    }
  }


  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Minor":
        return "bg-yellow-100 text-yellow-800"
      case "Major":
        return "bg-orange-100 text-orange-800"
      case "Total Loss":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getRepairStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-gray-100 text-gray-800"
      case "In Repair":
        return "bg-blue-100 text-blue-800"
      case "Repaired":
        return "bg-green-100 text-green-800"
      case "Scrapped":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading damaged items...</div>
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="font-semibold text-lg mb-1">{item.itemName}</div>
                <p className="text-sm text-muted-foreground">
                  Booking ID: {item.bookingId}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge className={getSeverityColor(item.condition)}>{item.condition}</Badge>
                <Badge className={getRepairStatusColor(item.repairStatus)}>{item.repairStatus}</Badge>
              </div>
            </div>

            {item.notes && (
              <div className="mb-3 p-3 bg-muted rounded text-sm">
                <p className="font-medium mb-1">Notes:</p>
                <p className="text-muted-foreground">{item.notes}</p>
              </div>
            )}

            <div className="flex justify-between items-center text-sm">
              <p className="text-muted-foreground">Returned: {new Date(item.returnDate).toLocaleDateString()}</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {item.repairStatus === "Pending" && (
                    <DropdownMenuItem onClick={() => updateRepairStatus(item.id, "In Repair")}>
                      Start Repair
                    </DropdownMenuItem>
                  )}
                  {item.repairStatus === "In Repair" && (
                    <>
                      <DropdownMenuItem onClick={() => updateRepairStatus(item.id, "Repaired")}>
                        Mark as Repaired
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => updateRepairStatus(item.id, "Scrapped")}
                        className="text-red-600"
                      >
                        Mark as Scrapped
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No damaged items to display</p>
        </div>
      )}
    </div>
  )
}
