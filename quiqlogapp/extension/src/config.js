// Quiqlog — shared config
// APP_URL is auto-detected from the extension ID — no manual changes needed.

const DEV_EXTENSION_ID  = 'mbhpdbjlkcacgpgfpjpeeocpobbkfkgg' // unpacked / staging only
const PROD_EXTENSION_ID = 'iopeebakhepefmglmdphjmjkibdefeoe' // published Chrome Web Store

const APP_URL = chrome.runtime.id === PROD_EXTENSION_ID
  ? 'https://app.quiqlog.com'
  : 'https://quiqlog-git-staging-artashesvardanyan-9805s-projects.vercel.app'
