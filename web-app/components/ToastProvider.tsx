'use client'

import { Toaster } from 'react-hot-toast'

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#161B27',
          color: '#F8FAFC',
          border: '1px solid #2A3147',
          borderRadius: '10px',
        },
      }}
    />
  )
}
