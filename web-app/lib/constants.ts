export const APP_NAME = 'Quiqlog'

// Update this after publishing to Chrome Web Store
export const EXTENSION_ID = 'dlpkihkhjihfcomcgnkggahddkjciabd'

// Update NEXT_PUBLIC_APP_URL in .env.local
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const CHROME_WEB_STORE_URL = 'https://chrome.google.com/webstore/detail/quiqlog/YOUR_EXTENSION_ID_HERE'

export const SUPABASE_STORAGE_BUCKET = 'screenshots'

export const MAX_STEPS_PER_GUIDE = 100
export const MAX_TITLE_LENGTH = 150
export const MAX_DESCRIPTION_LENGTH = 2000

export const FREE_GUIDES_PER_MONTH = 10

// Polar API base URL — switches based on POLAR_SERVER env var
export const POLAR_API_URL =
  process.env.POLAR_SERVER === 'production'
    ? 'https://api.polar.sh'
    : 'https://sandbox-api.polar.sh'
