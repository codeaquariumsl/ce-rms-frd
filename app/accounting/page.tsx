'use client'

import { useState } from 'react'
import { FinanceDashboard } from '@/components/accounting/finance-dashboard'
import { PaymentManager } from '@/components/accounting/payment-manager'
import { Button } from '@/components/ui/button'

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-blue-200">
          <Button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-3 font-semibold border-b-2 ${
              activeTab === 'dashboard'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-primary'
            }`}
            variant="ghost"
          >
            Financial Dashboard
          </Button>
          <Button
            onClick={() => setActiveTab('payments')}
            className={`px-6 py-3 font-semibold border-b-2 ${
              activeTab === 'payments'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-primary'
            }`}
            variant="ghost"
          >
            Payment Management
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && <FinanceDashboard />}
        {activeTab === 'payments' && <PaymentManager />}
      </div>
    </div>
  )
}
