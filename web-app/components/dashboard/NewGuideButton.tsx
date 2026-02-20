'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export default function NewGuideButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function createGuide() {
    setLoading(true)
    try {
      const res = await fetch('/api/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Guide' }),
      })
      const data = await res.json()
      if (data.id) {
        router.push(`/dashboard/guides/${data.id}/editor`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={createGuide} loading={loading}>
      + New Guide
    </Button>
  )
}
