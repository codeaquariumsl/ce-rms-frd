"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Eye, AlertTriangle } from "lucide-react"
import { getPendingReturns } from "@/lib/db"

interface ReturnListProps {
  organizationId: number
  overdueOnly?: boolean
  onViewReturn?: (id: string) => void
  onRefresh?: () => void
}

export function ReturnList({ organizationId, overdueOnly = false, onViewReturn, onRefresh }: ReturnListProps) {
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchReturns()
  }, [organizationId, overdueOnly])

  async function fetchReturns() {
    try {
      setLoading(true)
      const data = await getPendingReturns(organizationId)
      
      let filtered = data
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (overdueOnly) {
        filtered = filtered.filter((item: any) => {
          const returnDate = new Date(item.returnDate)
          returnDate.setHours(0, 0, 0, 0)
          return returnDate < today
        })
      } else {
        filtered = filtered.filter((item: any) => {
          const returnDate = new Date(item.returnDate)
          returnDate.setHours(0, 0, 0, 0)
          return returnDate >= today
        })
      }

      setReturns(filtered.sort((a: any, b: any) => new Date(a.returnDate).getTime() - new Date(b.returnDate).getTime()))
    } catch (error) {
      console.error("Failed to fetch returns:", error)
      setReturns([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Returned":
        return "bg-green-100 text-green-800"
      case "Returned Damaged":
        return "bg-red-100 text-red-800"
      case "Pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const isOverdue = (returnDate: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const rDate = new Date(returnDate)
    rDate.setHours(0, 0, 0, 0)
    return rDate < today
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {returns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No pending returns</div>
        ) : (
          returns.map((returnItem) => (
            <Card key={returnItem.id} className="p-4 border-blue-100 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="font-semibold text-lg flex items-center gap-2 mb-1 text-primary">
                    {returnItem.itemName}
                    {isOverdue(returnItem.returnDate) && returnItem.status === "Pending" && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{returnItem.customerName}</p>
              </div>
              <div className="flex gap-2">
                <Badge className={getStatusColor(returnItem.status)}>{returnItem.status}</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewReturn?.(returnItem.id)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

              <div className="grid grid-cols-3 gap-3 text-sm border-t pt-3">
                <div>
                  <p className="text-muted-foreground">Return Date</p>
                  <p className="font-semibold">
                    {returnItem.returnDate ? new Date(returnItem.returnDate).toLocaleDateString() : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Condition</p>
                  <p className="font-semibold">{returnItem.condition}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-semibold">{returnItem.repairStatus}</p>
                </div>
              </div>

              {returnItem.notes && (
                <div className="mt-3 p-2 bg-yellow-50 rounded text-xs border border-yellow-200">
                  <p className="text-yellow-800 font-medium">Notes:</p>
                  <p className="text-yellow-700">{returnItem.notes}</p>
                </div>
              )}

              {returnItem.status === "Pending" && (
                <div className="mt-3 flex gap-2">
                  <Button 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => onViewReturn?.(returnItem.id)}
                  >
                    Process Return
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
