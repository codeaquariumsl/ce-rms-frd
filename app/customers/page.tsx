'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CustomerList } from '@/components/customers/customer-list'
import { CustomerForm } from '@/components/customers/customer-form'
import { CustomerReports } from '@/components/customers/customer-reports'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, BarChart3 } from 'lucide-react'

interface Customer {
  id: string
  nic: string
  name: string
  email: string
  phone: string
  address: string
  createdAt: string
}

export default function CustomersPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSuccess = () => {
    setShowForm(false)
    setEditingCustomer(undefined)
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h1 className='text-3xl font-bold text-primary'>Customer Management</h1>
      </div>

      <Tabs defaultValue='manage' className='w-full'>
        <TabsList className='grid w-full grid-cols-2 bg-blue-100'>
          <TabsTrigger value='manage' className='data-[state=active]:bg-primary data-[state=active]:text-white'>
            <Users className='w-4 h-4 mr-2' />
            Manage Customers
          </TabsTrigger>
          <TabsTrigger value='reports' className='data-[state=active]:bg-primary data-[state=active]:text-white'>
            <BarChart3 className='w-4 h-4 mr-2' />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value='manage' className='space-y-6 mt-6'>
          {!showForm && !editingCustomer ? (
            <>
              <Button
                onClick={() => setShowForm(true)}
                className='bg-primary hover:bg-blue-700 text-white'
                size='lg'
              >
                + Register New Customer
              </Button>

              <CustomerList
                key={refreshKey}
                onEdit={(customer) => setEditingCustomer(customer)}
                onDelete={() => setRefreshKey(prev => prev + 1)}
              />
            </>
          ) : (
            <CustomerForm
              initialData={editingCustomer}
              onSuccess={handleSuccess}
              onCancel={() => {
                setShowForm(false)
                setEditingCustomer(undefined)
              }}
            />
          )}
        </TabsContent>

        <TabsContent value='reports' className='mt-6'>
          <CustomerReports />
        </TabsContent>
      </Tabs>
    </div>
  )
}
