'use client'

import { useEffect, useState } from 'react'
import { EXTENSION_ID, CHROME_WEB_STORE_URL } from '@/lib/constants'
import { Button } from '@/components/ui/Button'

export default function ExtensionCTA() {
  const [extensionInstalled, setExtensionInstalled] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if extension is installed via chrome.runtime.sendMessage
    if (typeof window === 'undefined') return

    const win = window as any
    if (!win.chrome?.runtime?.sendMessage) {
      setExtensionInstalled(false)
      return
    }

    try {
      win.chrome.runtime.sendMessage(
        EXTENSION_ID,
        { type: 'PING' },
        (response: any) => {
          if (win.chrome.runtime.lastError) {
            setExtensionInstalled(false)
          } else {
            setExtensionInstalled(!!response?.alive)
          }
        }
      )
    } catch {
      setExtensionInstalled(false)
    }
  }, [])

  // Don't render until we know
  if (extensionInstalled === null) return null

  // Extension is installed — no banner needed
  if (extensionInstalled) return null

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border border-accent/30 bg-accent/5 shadow-glow animate-fade-in transition-shadow duration-300 hover:shadow-glow-lg">
      <div className="text-2xl flex-shrink-0">🧩</div>
      <div className="flex-1 min-w-0">
        <h3 className="font-heading font-semibold text-base text-text-primary">
          Install the Quiqlog extension
        </h3>
        <p className="text-sm text-text-secondary mt-0.5">
          Add the Chrome extension to start recording your workflows and creating guides instantly.
        </p>
      </div>
      <a href={CHROME_WEB_STORE_URL} target="_blank" rel="noreferrer" className="flex-shrink-0">
        <Button size="sm">
          Get Extension
        </Button>
      </a>
    </div>
  )
}
