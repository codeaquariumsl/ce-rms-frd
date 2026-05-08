'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Camera, Upload, X } from 'lucide-react'
import { createCustomer } from '@/lib/db'

interface Customer {
  id: string
  nic: string
  name: string
  email: string
  phone: string
  address: string
  photo?: string
  createdAt: string
}

interface CustomerFormProps {
  initialData?: Customer
  onSuccess?: () => void
  onCancel?: () => void
}

export function CustomerForm({ initialData, onSuccess, onCancel }: CustomerFormProps) {
  const [formData, setFormData] = useState({
    nic: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    photo: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (initialData) {
      setFormData({
        nic: initialData.nic,
        name: initialData.name,
        email: initialData.email,
        phone: initialData.phone,
        address: initialData.address,
        photo: initialData.photo || '',
      })
    }
  }, [initialData])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  function validateNIC(nic: string): boolean {
    // Basic NIC validation - alphanumeric, length check
    return nic.length >= 9 && /^[a-zA-Z0-9]+$/.test(nic)
  }

  async function handleStartCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setShowCamera(true)
    } catch (err) {
      setError('Unable to access camera. Please check permissions.')
    }
  }

  function handleCapturePhoto() {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d')
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0)
        const photoData = canvasRef.current.toDataURL('image/jpeg', 0.8)
        setFormData({ ...formData, photo: photoData })
        handleStopCamera()
      }
    }
  }

  function handleStopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowCamera(false)
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const photoData = e.target?.result as string
        setFormData({ ...formData, photo: photoData })
      }
      reader.readAsDataURL(file)
    }
  }

  function handleRemovePhoto() {
    setFormData({ ...formData, photo: '' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validate NIC
    if (!validateNIC(formData.nic)) {
      setError('NIC must be at least 9 characters and contain only alphanumeric characters')
      return
    }

    // Duplicate NIC check should be handled by backend
    /* 
    if (!initialData) {
      const customers = JSON.parse(localStorage.getItem('customers') || '[]')
      if (customers.some((c: any) => c.nic === formData.nic)) {
        setError('A customer with this NIC already exists')
        return
      }
    }
    */

    setLoading(true)

    try {
      const payload = {
        org_id: 1, // Demo org ID
        ...formData
      }

      if (initialData) {
        // Update not implemented in shim yet
        console.warn('Update customer not yet supported via API shim')
      } else {
        await createCustomer(payload)
      }

      setFormData({
        nic: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        photo: '',
      })
      onSuccess?.()
    } catch (err) {
      setError('Failed to save customer')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className='p-6 border border-blue-200 bg-gradient-to-br from-blue-50 to-white'>
      <h2 className='text-2xl font-bold text-primary mb-6'>
        {initialData ? 'Edit Customer' : 'Register New Customer'}
      </h2>

      {error && (
        <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm'>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* Photo Upload/Capture Section */}
        <Card className='p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200'>
          <div className='flex items-center gap-4'>
            {/* Photo Preview */}
            <div className='flex flex-col items-center gap-2'>
              {formData.photo ? (
                <div className='relative'>
                  <img 
                    src={formData.photo} 
                    alt='Customer photo' 
                    className='w-24 h-24 object-cover rounded-lg border-2 border-primary'
                  />
                  <button
                    type='button'
                    onClick={handleRemovePhoto}
                    className='absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1'
                  >
                    <X className='w-4 h-4' />
                  </button>
                </div>
              ) : (
                <div className='w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-300'>
                  <Camera className='w-8 h-8 text-gray-400' />
                </div>
              )}
              <p className='text-xs text-muted-foreground text-center'>Customer Photo</p>
            </div>

            {/* Camera/Upload Controls */}
            <div className='flex flex-col gap-2 flex-1'>
              <Button
                type='button'
                variant='outline'
                onClick={handleStartCamera}
                disabled={showCamera}
                className='border-primary text-primary hover:bg-blue-50 gap-2'
              >
                <Camera className='w-4 h-4' />
                Capture Photo
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => fileInputRef.current?.click()}
                className='border-primary text-primary hover:bg-blue-50 gap-2'
              >
                <Upload className='w-4 h-4' />
                Upload Photo
              </Button>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                onChange={handleFileUpload}
                className='hidden'
              />
            </div>
          </div>

          {/* Camera Preview */}
          {showCamera && (
            <div className='mt-4 flex flex-col gap-3'>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className='w-full rounded-lg border-2 border-primary'
              />
              <canvas ref={canvasRef} className='hidden' />
              <div className='flex gap-2'>
                <Button
                  type='button'
                  onClick={handleCapturePhoto}
                  className='flex-1 bg-primary hover:bg-primary/90'
                >
                  Take Photo
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleStopCamera}
                  className='flex-1'
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>

        <div className='space-y-2'>
          <Label htmlFor='nic' className='text-primary font-semibold'>NIC (National ID) *</Label>
          <Input
            id='nic'
            value={formData.nic}
            onChange={(e) => setFormData({ ...formData, nic: e.target.value.toUpperCase() })}
            placeholder='Enter NIC number'
            required
            disabled={!!initialData}
            className='border-blue-200 focus:ring-primary'
          />
          <p className='text-xs text-muted-foreground'>Minimum 9 characters, alphanumeric only</p>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='name' className='text-primary font-semibold'>Full Name *</Label>
          <Input
            id='name'
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder='Enter full name'
            required
            className='border-blue-200 focus:ring-primary'
          />
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <Label htmlFor='email' className='text-primary font-semibold'>Email *</Label>
            <Input
              id='email'
              type='email'
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder='Enter email'
              required
              className='border-blue-200 focus:ring-primary'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='phone' className='text-primary font-semibold'>Phone *</Label>
            <Input
              id='phone'
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder='Enter phone number'
              required
              className='border-blue-200 focus:ring-primary'
            />
          </div>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='address' className='text-primary font-semibold'>Address *</Label>
          <Input
            id='address'
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder='Enter address'
            required
            className='border-blue-200 focus:ring-primary'
          />
        </div>

        <div className='flex justify-end gap-2 pt-4 border-t border-blue-100'>
          <Button type='button' variant='outline' onClick={onCancel}>
            Cancel
          </Button>
          <Button type='submit' disabled={loading} className='bg-primary hover:bg-blue-700'>
            {loading ? 'Saving...' : initialData ? 'Update Customer' : 'Register Customer'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
