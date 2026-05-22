"use client"

import { useState } from "react"
import { ReturnList } from "@/components/returns/return-list"
import { DamageManagement } from "@/components/returns/damage-management"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getIssueById } from "@/lib/db"
import { CompleteReturnModal } from "@/components/issue-items/complete-return-modal"

export default function ReturnsPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeIssue, setActiveIssue] = useState<any | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loadingIssue, setLoadingIssue] = useState(false)
  const organizationId = 1

  async function handleProcessReturn(id: string) {
    try {
      setLoadingIssue(true)
      const details = await getIssueById(Number(id))

      const mappedIssue = {
        id: String(details.id),
        issueNumber: details.issue_number,
        customer: {
          id: String(details.customer_id),
          name: details.customer_name,
          phone: details.customer_phone
        },
        items: details.items.map((it: any) => ({
          id: String(it.inventory_item_id),
          name: it.name,
          quantity: it.quantity,
          serialNumbers: it.serial_codes || []
        })),
        issueDate: details.issue_date,
        returnDate: details.return_date,
        numberOfDays: Math.max(Math.ceil((new Date(details.return_date).getTime() - new Date(details.issue_date).getTime()) / (1000 * 60 * 60 * 24)), 1),
        totalAmount: Number(details.total_amount),
        paymentStatus: details.payment_status,
        issuedDate: details.created_at || details.issue_date,
        status: details.status
      }

      setActiveIssue(mappedIssue)
      setModalOpen(true)
    } catch (error) {
      console.error("Failed to load issue details for return:", error)
      alert("Failed to load issue details: " + (error as Error).message)
    } finally {
      setLoadingIssue(false)
    }
  }

  return (
    <div className="p-6">
      <div>
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary animate-in fade-in slide-in-from-left-4 duration-300">Returns & Damage Management</h1>
            <p className="text-muted-foreground mt-2">Process item returns, track damage, and manage repairs</p>
          </div>
          {loadingIssue && (
            <div className="flex items-center gap-2 text-sm text-primary font-bold bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
              Loading Details...
            </div>
          )}
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Pending Returns</TabsTrigger>
            <TabsTrigger value="overdue">Overdue Returns</TabsTrigger>
            <TabsTrigger value="damage">Damage Management</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <ReturnList
              key={`pending-${refreshKey}`}
              organizationId={organizationId}
              overdueOnly={false}
              onViewReturn={handleProcessReturn}
              onRefresh={() => setRefreshKey((prev) => prev + 1)}
            />
          </TabsContent>

          <TabsContent value="overdue" className="mt-4">
            <ReturnList
              key={`overdue-${refreshKey}`}
              organizationId={organizationId}
              overdueOnly={true}
              onViewReturn={handleProcessReturn}
              onRefresh={() => setRefreshKey((prev) => prev + 1)}
            />
          </TabsContent>

          <TabsContent value="damage" className="mt-4">
            <DamageManagement key={`damage-${refreshKey}`} />
          </TabsContent>
        </Tabs>
      </div>

      <CompleteReturnModal
        issue={activeIssue}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setActiveIssue(null)
        }}
        onSuccess={() => {
          setRefreshKey((prev) => prev + 1)
          alert("Return completed successfully! Triggering receipt print...")
        }}
      />
    </div>
  )
}
