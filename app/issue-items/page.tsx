"use client"

import { CreateIssueForm } from "@/components/issue-items/create-issue-form"
import { IssueHistoryList } from "@/components/issue-items/issue-history-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function IssueItemsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Issue Items</h1>
          <p className="text-muted-foreground mt-2">
            Issue items to customers without booking - Generate official receipt with signature
          </p>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Issue</TabsTrigger>
            <TabsTrigger value="history">Issue History</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-4">
            <CreateIssueForm />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <IssueHistoryList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
