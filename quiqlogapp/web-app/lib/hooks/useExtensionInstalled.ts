'use client'

import { useEffect, useState } from 'react'
import { EXTENSION_ID } from '@/lib/constants'

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

    try {
      win.chrome.runtime.sendMessage(
        EXTENSION_ID,
        { type: 'PING' },
        (response: any) => {
          if (win.chrome.runtime.lastError) {
            setInstalled(false)
          } else {
            setInstalled(!!response?.alive)
          }
        }
      )
    } catch {
      setInstalled(false)
    }
  }, [])

  return installed
}
