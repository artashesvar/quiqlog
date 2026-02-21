'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AppNavProps {
  userEmail?: string
  hasSubscription?: boolean
  isPro?: boolean
  isCanceled?: boolean
  subscriptionEnd?: string
}

export default function AppNav({ userEmail, hasSubscription, isPro, isCanceled, subscriptionEnd }: AppNavProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function openPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/polar/portal', { method: 'POST' })
      if (!res.ok) return
      const { url } = await res.json()
      if (url) window.open(url, '_blank')
    } finally {
      setPortalLoading(false)
      setOpen(false)
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <nav className="border-b border-border bg-background-secondary/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-glow" />
          <span className="font-heading font-bold text-base text-text-primary">Quiqlog</span>
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen(!open)}
            className="w-8 h-8 rounded-full bg-accent/20 border border-border flex items-center justify-center hover:bg-accent/30 transition-colors"
            aria-label="User menu"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent-hover"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-64 rounded-sm border border-border bg-background-secondary shadow-soft-lg py-1 animate-fade-in">
              {userEmail && (
                <div className="px-3 py-2 border-b border-border">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-text-muted truncate">{userEmail}</p>
                    {isPro && !isCanceled && (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide bg-accent/20 text-accent-hover px-1.5 py-0.5 rounded-sm">
                        Pro
                      </span>
                    )}
                  </div>
                  {isPro && !isCanceled && subscriptionEnd && (
                    <p className="text-[10px] text-text-muted mt-0.5">
                      Renews {new Date(subscriptionEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                  {isCanceled && subscriptionEnd && (
                    <p className="text-[10px] text-warning mt-0.5">
                      Your Pro ends {new Date(subscriptionEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
              )}
              {hasSubscription && (
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-background-tertiary hover:text-text-primary transition-colors disabled:opacity-50"
                >
                  {portalLoading ? 'Loading...' : 'Manage Subscription'}
                </button>
              )}
              <button
                onClick={signOut}
                className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-background-tertiary hover:text-text-primary transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
