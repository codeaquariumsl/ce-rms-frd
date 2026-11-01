"use client"

import { useState } from "react"
import Link from "next/link"
import { AdminDashboard } from "@/components/dashboard/admin-dashboard"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Send, FileText, Package } from "lucide-react"

export default function Home() {
  const organizationId = 1
  const [activeTab, setActiveTab] = useState<"overview" | "financials" | "inventory">("overview")

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="w-full mx-auto p-3 md:p-4 space-y-3">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "overview" | "financials" | "inventory")}
          className="w-full space-y-3"
        >
          {/* Compact Top Command Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-2 px-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="pr-2 sm:border-r border-slate-200">
                <h1 className="text-xs font-black text-slate-800 uppercase tracking-wider leading-tight">
                  Welcome to RMS
                </h1>
                <p className="text-[10px] font-semibold text-slate-400">
                  Live Rental, Stock &amp; Revenue Telemetry
                </p>
              </div>

              <TabsList className="bg-slate-100 p-0.5 rounded-lg border-0 inline-flex h-auto">
                <TabsTrigger
                  value="overview"
                  className="px-3 py-1 text-[11px] font-bold rounded-md data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="financials"
                  className="px-3 py-1 text-[11px] font-bold rounded-md data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  Revenue &amp; Collections
                </TabsTrigger>
                <TabsTrigger
                  value="inventory"
                  className="px-3 py-1 text-[11px] font-bold rounded-md data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  Stock &amp; Utilization
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Link href="/issue-items">
                <Button
                  size="sm"
                  className="h-7 px-2.5 text-[10px] font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-white rounded-lg shadow-sm"
                >
                  <Send className="w-3 h-3 mr-1" />
                  Direct Issue
                </Button>
              </Link>
              <Link href="/inventory">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  <Package className="w-3 h-3 mr-1" />
                  Stock
                </Button>
              </Link>
              <Link href="/reports">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Reports
                </Button>
              </Link>

              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-100 shrink-0 select-none">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">
                  System Live
                </span>
              </div>
            </div>
          </div>

          <AdminDashboard organizationId={organizationId} activeTab={activeTab} />
        </Tabs>
      </div>
    </div>
  )
}
