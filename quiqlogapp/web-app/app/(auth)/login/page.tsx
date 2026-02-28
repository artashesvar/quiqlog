'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EXTENSION_IDS } from '@/lib/constants'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')

  // Safety net: clear any stale extension token whenever the login page loads.
  // Covers cases where CLEAR_TOKEN was missed (session expiry, hard reload, etc.)
  useEffect(() => {
    const win = window as any
    if (!win.chrome?.runtime?.sendMessage) return
    for (const id of EXTENSION_IDS) {
      try {
        win.chrome.runtime.sendMessage(id, { type: 'CLEAR_TOKEN' }, () => { win.chrome.runtime.lastError })
      } catch {}
    }
  }, [])
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/home')
    router.refresh()
  }

  return (
    <Card animate className="p-8 shadow-soft-lg">
      <h1 className="font-heading font-semibold text-xl text-text-primary mb-1">
        Welcome back
      </h1>
      <p className="text-text-muted text-sm mb-6">Sign in to your Quiqlog account</p>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          error={error || undefined}
        />

        <Button type="submit" loading={loading} className="w-full mt-2">
          Sign In
        </Button>
      </form>

      <p className="text-center text-sm text-text-muted mt-5">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-accent hover:text-accent-hover transition-colors">
          Sign up free
        </Link>
      </p>
    </Card>
  )
}
