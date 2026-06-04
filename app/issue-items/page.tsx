"use client"

import { CreateIssueForm } from "@/components/issue-items/create-issue-form"
import { IssueHistoryList } from "@/components/issue-items/issue-history-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function IssueItemsPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="w-full mx-auto p-3 md:p-4 space-y-3">
        <Tabs defaultValue="create" className="w-full space-y-3">
          <div className="flex items-center justify-between gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <TabsList className="bg-slate-100 p-0.5 rounded-lg border-0 inline-flex">
              <TabsTrigger
                value="create"
                className="px-4 py-1.5 text-xs font-bold rounded-md data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
              >
                Direct Issue
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="px-4 py-1.5 text-xs font-bold rounded-md data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
              >
                Issue Logs
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100 shrink-0 select-none">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">System Live</span>
            </div>
          </div>

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
