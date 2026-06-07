'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreVertical, Trash2, Edit } from 'lucide-react'
import { getCustomers } from '@/lib/db'

interface Customer {
  id: string
  nic: string
  name: string
  email?: string
  phone: string
  address: string
  photo?: string
  registration_date: string
}

interface CustomerListProps {
  onEdit?: (customer: Customer) => void
  onDelete?: (id: string) => void
}

export function CustomerList({ onEdit, onDelete }: CustomerListProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; name: string } | null>(null)

  useEffect(() => {
    loadCustomers()
  }, [])

  async function loadCustomers() {
    try {
      const data = await getCustomers(1) // Demo org ID
      setCustomers(data)
    } catch (error) {
      console.error('Failed to load customers:', error)
      setCustomers([])
    }
  }

  function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this customer?')) {
      // Delete not implemented in shim yet
      console.warn('Delete customer not yet supported via API shim')
    }
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.nic.includes(searchTerm) ||
    c.phone.includes(searchTerm)
  )

  return (
    <div className='space-y-4'>
      <div className='mb-4'>
        <input
          type='text'
          placeholder='Search by name, NIC, or phone...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
        />
      </div>

      <div className='grid gap-4'>
        {filtered.map((customer) => (
          <Card key={customer.id} className='p-4 border border-blue-100 hover:shadow-md transition-shadow'>
            <div className='flex justify-between items-start gap-4'>
              <div className='flex items-center gap-4 flex-1'>
                {/* Customer Photo Avatar */}
                {customer.photo ? (
                  <img
                    src={customer.photo}
                    alt={customer.name}
                    className='w-16 h-16 rounded-full object-cover border-2 border-primary/20 bg-slate-50 shadow-sm cursor-pointer hover:opacity-80 transition-opacity'
                    onClick={() => setPreviewPhoto({ url: customer.photo!, name: customer.name })}
                    title="Click to view photo"
                  />
                ) : (
                  <div className='w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-dashed border-primary/20 text-primary font-bold text-lg uppercase select-none shadow-inner'>
                    {customer.name.slice(0, 2)}
                  </div>
                )}

                <div className='flex-1'>
                  <div className='font-semibold text-lg text-primary'>{customer.name}</div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-1.5 text-xs sm:text-sm text-muted-foreground'>
                    <p>NIC: <span className='font-medium text-foreground'>{customer.nic}</span></p>
                    <p>Phone: <span className='font-medium text-foreground'>{customer.phone}</span></p>
                    <p>Email: <span className='font-medium text-foreground'>{customer.email || 'N/A'}</span></p>
                    <p>Address: <span className='font-medium text-foreground'>{customer.address}</span></p>
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' size='sm'>
                    <MoreVertical className='w-4 h-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem
                    onClick={() => onEdit?.(customer)}
                    className='cursor-pointer'
                  >
                    <Edit className='w-4 h-4 mr-2' />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(customer.id)}
                    className='cursor-pointer text-destructive'
                  >
                    <Trash2 className='w-4 h-4 mr-2' />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className='text-xs text-muted-foreground mt-2'>
              Registered: {new Date(customer.registration_date).toLocaleDateString()}
            </p>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className='text-center py-12 text-muted-foreground'>
          {customers.length === 0 ? 'No customers yet. Create one to get started!' : 'No customers match your search.'}
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200"
          onClick={() => setPreviewPhoto(null)}
        >
          <div 
            className="relative bg-white p-3.5 rounded-xl max-w-[90vw] max-h-[85vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="outline"
              size="sm"
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full p-0 border border-slate-200 shadow bg-white hover:bg-slate-50 text-slate-500 font-bold"
              onClick={() => setPreviewPhoto(null)}
            >
              ✕
            </Button>
            <img
              src={previewPhoto.url}
              alt={previewPhoto.name}
              className="max-w-full max-h-[70vh] object-contain rounded-lg border border-slate-100"
            />
            <p className="text-center font-semibold text-slate-800 text-sm mt-3">{previewPhoto.name}</p>
          </div>
        </div>
      )}
    </div>
  )
}
