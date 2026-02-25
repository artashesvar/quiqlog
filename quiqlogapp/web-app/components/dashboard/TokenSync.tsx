'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EXTENSION_ID } from '@/lib/constants'

function sendToExtension(message: object) {
  const win = window as any
  if (!win.chrome?.runtime?.sendMessage) return
  try {
    win.chrome.runtime.sendMessage(
      EXTENSION_ID,
      message,
      () => { win.chrome.runtime.lastError /* suppress error */ }
    )
  } catch {}
}

export default function TokenSync() {
  useEffect(() => {
    const supabase = createClient()

    // Send immediately on mount — onAuthStateChange may have already fired
    // its INITIAL_SESSION event before this useEffect subscribed
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) sendToExtension({ type: 'STORE_TOKEN', token: session.access_token })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        sendToExtension({ type: 'STORE_TOKEN', token: session.access_token })
      } else {
        sendToExtension({ type: 'CLEAR_TOKEN' })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}
