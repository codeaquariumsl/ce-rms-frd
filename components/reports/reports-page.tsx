"use client"

import { useEffect, useState, Fragment } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, ChevronDown } from "lucide-react"
import { 
  getInventoryReport, 
  getRentalHistoryReport, 
  getDeliveryScheduleReport, 
  getPendingReturnsReport, 
  getCustomerIssuesReport,
  getDailyIssuesReport,
  getDailyReturnsReport,
  getDailyPaymentsReport,
  getMonthlyCollectionsReport,
  getCurrentStockReport
} from "@/lib/db"

interface ReportsPageProps {
  organizationId: number
}

export function ReportsPage({ organizationId }: ReportsPageProps) {
  const [activeReport, setActiveReport] = useState<string>("inventory")
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  // Custom stock reporting expanded row state
  const [expandedStockId, setExpandedStockId] = useState<number | null>(null)

  useEffect(() => {
    setExpandedStockId(null)
    loadReport(activeReport)
  }, [activeReport])

  async function loadReport(reportType: string) {
    try {
      setLoading(true)
      let result: any = { data: [], summary: {} }

      switch (reportType) {
        case "inventory":
          result = await getInventoryReport(organizationId)
          break

        case "customer-issues":
          result = await getCustomerIssuesReport(organizationId)
          break

        case "rental-history":
          result = await getRentalHistoryReport(organizationId)
          break

        case "delivery-schedule":
          result = await getDeliveryScheduleReport(organizationId)
          break

        case "pending-returns":
          result = await getPendingReturnsReport(organizationId)
          break

        case "daily-issues":
          result = await getDailyIssuesReport(organizationId)
          break

        case "daily-returns":
          result = await getDailyReturnsReport(organizationId)
          break

        case "daily-payments":
          result = await getDailyPaymentsReport(organizationId)
          break

        case "monthly-collections":
          result = await getMonthlyCollectionsReport(organizationId)
          break

        case "current-stock":
          result = await getCurrentStockReport(organizationId)
          break
      }

      setReportData(result)
    } catch (error) {
      console.error("Failed to load report:", error)
      setReportData({ data: [], summary: {} })
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!reportData?.data || reportData.data.length === 0) return

    // Strip serials nested objects for clean CSV exporting
    const cleanData = reportData.data.map(({ serials, ...rest }: any) => rest)
    const headers = Object.keys(cleanData[0])
    const csvContent = [
      headers.join(","),
      ...cleanData.map((row: any) => headers.map((h) => JSON.stringify(row[h])).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${activeReport}-report.csv`
    a.click()
  }

  const toggleStockExpand = (id: number) => {
    setExpandedStockId(expandedStockId === id ? null : id)
  }

  return (
    <div className="space-y-4">
      {/* Report Selection Tab Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {[
          { id: "inventory", label: "Inventory Status" },
          { id: "customer-issues", label: "Customer Issues" },
          { id: "rental-history", label: "Rental History" },
          { id: "delivery-schedule", label: "Delivery Schedule" },
          { id: "pending-returns", label: "Pending Returns" },
          { id: "daily-issues", label: "Daily Issues Summary" },
          { id: "daily-returns", label: "Daily Returns Summary" },
          { id: "daily-payments", label: "Daily Payments" },
          { id: "monthly-collections", label: "Monthly Collections" },
          { id: "current-stock", label: "Current Stock" },
        ].map((report) => (
          <Button
            key={report.id}
            onClick={() => setActiveReport(report.id)}
            variant={activeReport === report.id ? "default" : "outline"}
            className="w-full text-[11px] font-semibold px-2 py-1.5 h-8.5 transition-all rounded-lg"
          >
            {report.label}
          </Button>
        ))}
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-500 font-medium">Loading report records...</div>
      ) : reportData ? (
        <>
          {/* Summary Indicator Cards */}
          {reportData.summary && Object.keys(reportData.summary).length > 0 && (
            <Card className="p-3 bg-slate-50 border border-slate-200 shadow-sm rounded-xl">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span className="w-1 h-3 bg-primary rounded-full" />
                Report Summary Indicators
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {Object.entries(reportData.summary).map(([key, value]: any) => (
                  <div key={key} className="space-y-0.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider capitalize">{key.replace(/_/g, " ")}</p>
                    <p className="text-base font-black text-slate-800 tracking-tight">
                      {value === null
                        ? "-"
                        : key.toLowerCase().includes("amount") || key.toLowerCase().includes("revenue") || key.toLowerCase().includes("rate") || key.toLowerCase().includes("collection") || key.toLowerCase().includes("total") && key.toLowerCase().includes("revenue") || key.toLowerCase().includes("total") && key.toLowerCase().includes("value")
                          ? typeof value === "number" || !isNaN(Number(value))
                            ? `LKR ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : String(value)
                          : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Data Representation Table */}
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1 h-3 bg-primary rounded-full" />
                  Detailed Records
                </h3>
                {reportData.data && reportData.data.length > 0 && (
                  <Button onClick={exportToCSV} variant="outline" size="sm" className="h-8 text-xs px-3 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 font-bold uppercase tracking-wider">
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Export CSV
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto">
                {activeReport === "current-stock" ? (
                  /* Custom Serialized Current Stock Report with Drill-down Drawer */
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left select-none border-b border-slate-100">
                        <th className="py-2.5 px-3 w-10 text-center"></th>
                        <th className="py-2.5 px-3">Equipment Item</th>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3 text-center">Total Stock</th>
                        <th className="py-2.5 px-3 text-center">Available</th>
                        <th className="py-2.5 px-3 text-center">Reserved</th>
                        <th className="py-2.5 px-3 text-center">Delivered</th>
                        <th className="py-2.5 px-3 text-center">Damaged</th>
                        <th className="py-2.5 px-3 text-center">Tracking Type</th>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs text-slate-700 divide-y divide-slate-100">
                      {reportData.data.map((row: any) => {
                        const isExpanded = expandedStockId === row.id
                        const hasSerials = row.is_have_serial === 1 || row.is_have_serial === true
                        return (
                          <Fragment key={row.id}>
                            <TableRow 
                              onClick={() => hasSerials && toggleStockExpand(row.id)}
                              className={`transition-colors ${
                                hasSerials ? 'cursor-pointer hover:bg-slate-50/50' : 'bg-white'
                              } ${isExpanded ? 'bg-blue-50/40 hover:bg-blue-50/60' : ''}`}
                            >
                              <TableCell className="text-center py-2.5 px-3 shrink-0">
                                {hasSerials ? (
                                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-transform duration-200 ${
                                    isExpanded ? 'rotate-180 text-primary' : ''
                                  }`} />
                                ) : null}
                              </TableCell>
                              <TableCell className="font-bold text-slate-800 py-2.5 px-3">{row.name}</TableCell>
                              <TableCell className="font-semibold text-slate-400 font-mono text-[10px] py-2.5 px-3">{row.sku || '-'}</TableCell>
                              <TableCell className="font-semibold text-slate-500 uppercase text-[9px] py-2.5 px-3">{row.category}</TableCell>
                              <TableCell className="text-center font-bold text-slate-800 py-2.5 px-3">{row.quantity_total}</TableCell>
                              <TableCell className="text-center font-bold text-emerald-600 py-2.5 px-3">{row.quantity_available}</TableCell>
                              <TableCell className="text-center font-semibold text-slate-500 py-2.5 px-3">{row.quantity_reserved}</TableCell>
                              <TableCell className="text-center font-semibold text-blue-600 py-2.5 px-3">{row.quantity_delivered}</TableCell>
                              <TableCell className="text-center font-bold text-rose-500 py-2.5 px-3">{row.quantity_damaged}</TableCell>
                              <TableCell className="text-center py-2.5 px-3">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                  hasSerials 
                                    ? "bg-blue-50 text-blue-600 border border-blue-100" 
                                    : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}>
                                  {hasSerials ? 'Serial' : 'Bulk'}
                                </span>
                              </TableCell>
                            </TableRow>

                            {/* Serial Numbers Grid Drill-down panel */}
                            {isExpanded && hasSerials && row.serials && (
                              <TableRow className="bg-blue-50/10 hover:bg-blue-50/10">
                                <TableCell colSpan={10} className="px-6 py-4 border-t border-b border-blue-100/30">
                                  <div className="space-y-3 animate-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">
                                        Assigned Individual Serial Items ({row.serials.length})
                                      </h4>
                                    </div>
                                    {row.serials.length > 0 ? (
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                        {row.serials.map((serial: any) => (
                                          <div 
                                            key={serial.id} 
                                            className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 shadow-sm hover:border-primary/20 transition-all"
                                          >
                                            <span className="font-mono text-[10px] font-black text-slate-700 select-all">{serial.serial_code}</span>
                                            <span className={`px-1.5 py-0.2 rounded text-[7px] font-black uppercase tracking-wider ${
                                              serial.status === 'Available'
                                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                : serial.status === 'Reserved'
                                                  ? "bg-amber-50 text-amber-600 border border-amber-100"
                                                  : "bg-rose-50 text-rose-600 border border-rose-100"
                                            }`}>
                                              {serial.status}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-slate-400 italic py-2 pl-0.5">No registered serial numbers found in stock.</div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  /* Standard Dynamic Column Table */
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left select-none border-b border-slate-100">
                        {reportData.data.length > 0 &&
                          Object.keys(reportData.data[0]).map((key) => (
                            <TableHead key={key} className="capitalize py-2 px-3">
                              {key.replace(/_/g, " ")}
                            </TableHead>
                          ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs text-slate-700 divide-y divide-slate-100">
                      {reportData.data.map((row: any, idx: number) => (
                        <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors">
                          {Object.entries(row).map(([key, value]: any, cellIdx: number) => (
                            <TableCell key={cellIdx} className="py-2 px-3">
                              {value === null
                                ? "-"
                                : key.toLowerCase().includes("amount") || key.toLowerCase().includes("revenue") || key.toLowerCase().includes("rate") || key.toLowerCase().includes("collection")
                                  ? typeof value === "number" || !isNaN(Number(value))
                                    ? `LKR ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    : String(value)
                                  : String(value)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {reportData.data.length === 0 && (
                <div className="text-center py-12 text-xs text-slate-400 font-bold select-none">No records available for this period</div>
              )}
            </div>
          </Card>
        </>
      ) : (
        <div className="text-center py-12 text-sm text-slate-400 font-semibold select-none">No report data generated</div>
      )}
    </div>
  )
}
