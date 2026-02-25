'use client'

import { useState } from 'react'
import { FREE_GUIDES_PER_MONTH } from '@/lib/constants'

export default function PaywallOverlay() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/polar/checkout', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to start checkout')
      const { url } = await res.json()

      // Dynamic import keeps PolarEmbedCheckout out of the SSR bundle (it uses window APIs)
      const { PolarEmbedCheckout } = await import('@polar-sh/checkout/embed')
      const checkout = await PolarEmbedCheckout.create(url, { theme: 'dark' })

      checkout.addEventListener('success', () => {
        // Reload so the editor re-checks subscription status server-side
        window.location.reload()
      })
    } catch (err) {
      console.error('[Quiqlog] Checkout error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-background-secondary border border-border rounded-xl p-8 max-w-md w-full mx-4 shadow-soft-xl animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paywall-title"
      >
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 mb-6 mx-auto">
          <svg
            className="w-6 h-6 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        </div>

        {/* Heading */}
        <h2
          id="paywall-title"
          className="text-xl font-bold text-text-primary text-center mb-2"
        >
          Monthly limit reached
        </h2>
        <p className="text-text-secondary text-sm text-center mb-6">
          You&apos;ve used all {FREE_GUIDES_PER_MONTH} free guides for this month. Upgrade to Pro
          to keep creating unlimited guides.
        </p>

        {/* Feature list */}
        <ul className="space-y-2 mb-6">
          {[
            'Unlimited guides every month',
            'All future Pro features',
            'Priority support',
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2.5 text-sm text-text-secondary">
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-accent/15 flex items-center justify-center">
                <svg
                  className="w-2.5 h-2.5 text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
              {feature}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full bg-accent hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 text-sm shadow-glow hover:shadow-glow-lg"
        >
          {loading ? 'Opening checkout…' : 'Upgrade to Pro'}
        </button>

        {error && (
          <p className="mt-3 text-center text-xs text-error">{error}</p>
        )}

        <p className="mt-4 text-center text-xs text-text-muted">
          You can still view this guide — upgrade to edit and create more.
        </p>
      </div>
    </div>
  )
}
