'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <Card animate className="p-8 text-center shadow-soft-lg">
        <div className="text-4xl mb-4">📬</div>
        <h2 className="font-heading font-semibold text-lg text-text-primary mb-2">
          Check your email
        </h2>
        <p className="text-text-muted text-sm">
          We sent a confirmation link to <strong className="text-text-secondary">{email}</strong>.
          Click it to activate your account.
        </p>
        <Link href="/login" className="text-accent hover:text-accent-hover text-sm mt-4 block transition-colors">
          Back to sign in
        </Link>
      </Card>
    )
  }

  return (
    <Card animate className="p-8 shadow-soft-lg">
      <h1 className="font-heading font-semibold text-xl text-text-primary mb-1">
        Create your account
      </h1>
      <p className="text-text-muted text-sm mb-6">Start making guides in seconds</p>

      <form onSubmit={handleSignup} className="flex flex-col gap-4">
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
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          error={error || undefined}
        />

        <Button type="submit" loading={loading} className="w-full mt-2">
          Create Account
        </Button>
      </form>

      <p className="text-center text-sm text-text-muted mt-5">
        Already have an account?{' '}
        <Link href="/login" className="text-accent hover:text-accent-hover transition-colors">
          Sign in
        </Link>
      </p>
    </Card>
  )
}
