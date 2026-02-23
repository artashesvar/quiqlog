'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EXTENSION_ID } from '@/lib/constants'

function sendTokenToExtension(token: string) {
  const win = window as any
  if (!win.chrome?.runtime?.sendMessage) return
  try {
    win.chrome.runtime.sendMessage(
      EXTENSION_ID,
      { type: 'STORE_TOKEN', token },
      () => { win.chrome.runtime.lastError /* suppress error */ }
    )
  } catch {}
}

export default function TokenSync() {
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        sendTokenToExtension(session.access_token)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}
