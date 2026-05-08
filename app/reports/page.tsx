// Reports page

import { ReportsPage } from "@/components/reports/reports-page"

export default function Page() {
  const organizationId = 1 // In production, get from auth context

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-2">
            Generate and export detailed reports on inventory, rentals, deliveries, and returns
          </p>
        </div>

        <ReportsPage organizationId={organizationId} />
      </div>
    </div>
  )
}
