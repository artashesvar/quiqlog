'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

interface AppNavProps {
  userEmail?: string
}

export default function AppNav({ userEmail }: AppNavProps) {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="border-b border-border bg-background-secondary/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-glow" />
          <span className="font-heading font-bold text-base text-text-primary">Quiqlog</span>
        </Link>

        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="text-xs text-text-muted hidden sm:block">
              {userEmail}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>
    </nav>
  )
}
