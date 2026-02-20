'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EXTENSION_ID } from '@/lib/constants'

export default function TokenSync() {
  useEffect(() => {
    async function sync() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const win = window as any
      if (!win.chrome?.runtime?.sendMessage) return

      try {
        win.chrome.runtime.sendMessage(
          EXTENSION_ID,
          { type: 'STORE_TOKEN', token: session.access_token },
          () => { win.chrome.runtime.lastError /* suppress error */ }
        )
      } catch {}
    }

    sync()
  }, [])

  return null
}
