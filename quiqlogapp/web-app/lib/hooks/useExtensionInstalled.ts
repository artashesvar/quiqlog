'use client'

import { useEffect, useState } from 'react'
import { EXTENSION_IDS } from '@/lib/constants'

/**
 * Detects whether the Quiqlog Chrome extension is installed by sending
 * a PING message to the extension via chrome.runtime.sendMessage.
 *
 * Returns:
 *   null    — detection in progress
 *   true    — extension is installed and responding
 *   false   — extension is not installed (or not a Chrome browser)
 */
export function useExtensionInstalled(): boolean | null {
  const [installed, setInstalled] = useState<boolean | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const win = window as any
    if (!win.chrome?.runtime?.sendMessage) {
      setInstalled(false)
      return
    }

    let responded = false
    for (const id of EXTENSION_IDS) {
      try {
        win.chrome.runtime.sendMessage(
          id,
          { type: 'PING' },
          (response: any) => {
            if (!win.chrome.runtime.lastError && response?.alive) {
              responded = true
              setInstalled(true)
            }
          }
        )
      } catch {}
    }
    // If neither extension responds, mark as not installed after a short delay
    setTimeout(() => { if (!responded) setInstalled(false) }, 500)
  }, [])

  return installed
}
