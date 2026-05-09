"use client"

import { CreateIssueForm } from "@/components/issue-items/create-issue-form"
import { IssueHistoryList } from "@/components/issue-items/issue-history-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function IssueItemsPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="w-full mx-auto p-2 md:p-6 space-y-2">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Issue Management</h1>
            <p className="text-sm text-slate-500 mt-1">
              Streamlined direct-to-customer equipment issuance and tracking.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Live System</span>
          </div>
        </header>

        <Tabs defaultValue="create" className="w-full space-y-4">
          <TabsList className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm inline-flex">
            <TabsTrigger
              value="create"
              className="px-6 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
            >
              Direct Issue
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="px-6 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-200"
            >
              Issue Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="focus-visible:outline-none">
            <CreateIssueForm />
          </TabsContent>

          <TabsContent value="history" className="focus-visible:outline-none">
            <IssueHistoryList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
