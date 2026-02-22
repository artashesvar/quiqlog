// Quiqlog Background Service Worker
// Handles: recording state, screenshot capture, annotation, session upload

const APP_URL = 'https://quiqlog-lbev35daa-artashesvardanyan-9805s-projects.vercel.app'

// ─── In-memory state (avoids read/write race conditions) ─────────────────────
let recording = false
let steps = []
let authToken = null
let targetTabId = null // tab the user selected to record; null = record all tabs
let sessionId = null   // unique ID per recording session, used in upload path

// Load persisted state on startup.
chrome.storage.local.get(['recording', 'authToken'], (result) => {
  recording = result.recording ?? false
  authToken = result.authToken ?? null
})

// ─── Screenshot + Annotation ─────────────────────────────────────────────────

async function captureAndAnnotateTab(clickX, clickY) {
  // Enforce minimum interval between captures to stay under Chrome's rate limit
  const now = Date.now()
  const wait = MIN_CAPTURE_INTERVAL_MS - (now - lastCaptureTime)
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  lastCaptureTime = Date.now()

  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 90,
    })
    return await annotateScreenshot(dataUrl, clickX, clickY)
  } catch (err) {
    console.error('[Quiqlog] Screenshot failed:', err)
    return null
  }
}

async function annotateScreenshot(dataUrl, x, y) {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const imageBitmap = await createImageBitmap(blob)

  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imageBitmap, 0, 0)

  const radius = 22
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, 2 * Math.PI)
  ctx.fillStyle = 'rgba(255, 220, 0, 0.35)'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(x, y, radius, 0, 2 * Math.PI)
  ctx.strokeStyle = '#FFD700'
  ctx.lineWidth = 3
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(x, y, 5, 0, 2 * Math.PI)
  ctx.fillStyle = '#FFD700'
  ctx.fill()

  // Return Blob directly instead of converting to base64 data URL
  return canvas.convertToBlob({ type: 'image/png' })
}

// ─── Screenshot Upload ───────────────────────────────────────────────────────

async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

async function uploadScreenshot(blob) {
  const base64 = await blobToBase64(blob)

  const response = await fetch(`${APP_URL}/api/extension/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ sessionId, screenshot: base64 }),
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`)
  }

  const data = await response.json()
  return data.url
}

// ─── Click queue — processes one at a time to prevent race conditions ─────────
let clickQueue = Promise.resolve()
let lastCaptureTime = 0
const MIN_CAPTURE_INTERVAL_MS = 600 // Chrome allows ~2 captureVisibleTab calls/sec

function enqueueClick(clickData) {
  clickQueue = clickQueue.then(() => processClick(clickData))
}

async function processClick({ x, y, label, url, pageTitle }) {
  if (!recording) return

  try {
    const screenshotBlob = await captureAndAnnotateTab(x, y)
    let screenshotUrl = null

    if (screenshotBlob && authToken) {
      // Attempt upload with one retry
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          screenshotUrl = await uploadScreenshot(screenshotBlob)
          break
        } catch (err) {
          console.warn(`[Quiqlog] Upload attempt ${attempt + 1} failed:`, err)
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 1000))
          }
        }
      }
    }

    // Store only metadata + URL (no base64 blob in memory)
    steps.push({ x, y, label, url, pageTitle, screenshotUrl })

    await chrome.storage.local.set({ stepCount: steps.length })
    chrome.runtime.sendMessage({ type: 'STEP_COUNT', count: steps.length }).catch(() => {})
    console.log(`[Quiqlog] Step ${steps.length} recorded: "${label}" (screenshot: ${screenshotUrl ? 'yes' : 'no'})`)
  } catch (err) {
    console.error('[Quiqlog] Error processing click:', err)
  }
}

// ─── Recording Control ────────────────────────────────────────────────────────

async function startRecording(tabId = null) {
  recording = true
  steps = []
  sessionId = crypto.randomUUID()
  targetTabId = tabId
  clickQueue = Promise.resolve() // reset queue in case it was left in a rejected state
  await chrome.storage.local.set({ recording: true, stepCount: 0 })
  await chrome.action.setBadgeText({ text: '●' })
  await chrome.action.setBadgeBackgroundColor({ color: '#EF4444' })

  // Directly notify the content script. If the message fails, the script is orphaned
  // (extension was reloaded without the user refreshing the tab). Re-inject it so the
  // user never has to manually refresh.
  if (tabId !== null) {
    const delivered = await chrome.tabs.sendMessage(tabId, { type: 'SET_RECORDING', value: true })
      .then(() => true)
      .catch(() => false)

    if (!delivered) {
      console.log('[Quiqlog] Content script orphaned — re-injecting into tab', tabId)
      await Promise.all([
        chrome.scripting.executeScript({ target: { tabId }, files: ['src/content/content.js'] }),
        chrome.scripting.insertCSS({ target: { tabId }, files: ['src/content/styles.css'] }),
      ]).catch((err) => console.warn('[Quiqlog] Re-injection failed:', err))
      await chrome.tabs.sendMessage(tabId, { type: 'SET_RECORDING', value: true }).catch(() => {})
    }
  }

  console.log('[Quiqlog] Recording started', targetTabId ? `(tab ${targetTabId})` : '(all tabs)')
}

async function stopRecording() {
  recording = false
  targetTabId = null
  await chrome.storage.local.set({ recording: false })
  await chrome.action.setBadgeText({ text: '' })

  // Wait for any in-progress click processing to finish.
  try {
    await clickQueue
  } catch (err) {
    console.warn('[Quiqlog] Click queue error on stop:', err)
  }

  if (steps.length === 0) {
    console.warn('[Quiqlog] No steps recorded.')
    return
  }

  if (!authToken) {
    await chrome.tabs.create({ url: `${APP_URL}/login` })
    return
  }

  console.log(`[Quiqlog] Submitting ${steps.length} steps (metadata only)...`)

  try {
    const response = await fetch(`${APP_URL}/api/extension/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: steps[0]?.pageTitle ?? 'New Guide',
        steps: steps.map(({ x, y, label, url, pageTitle, screenshotUrl }) => ({
          x, y, label, url, pageTitle, screenshotUrl,
        })),
      }),
    })

    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const { guideId } = await response.json()
    await chrome.tabs.create({ url: `${APP_URL}/dashboard/guides/${guideId}/editor` })
    steps = []
    sessionId = null
    await chrome.storage.local.set({ stepCount: 0 })
  } catch (err) {
    console.error('[Quiqlog] Failed to submit session:', err)
    await chrome.tabs.create({ url: `${APP_URL}/dashboard` })
  }
}

// ─── Message Listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type } = message

  if (type === 'PING') {
    sendResponse({ alive: true, version: '1.0.0' })
    return false
  }

  if (type === 'START_RECORDING') {
    startRecording(message.tabId ?? null).then(() => sendResponse({ ok: true }))
    return true
  }

  if (type === 'STOP_RECORDING') {
    stopRecording().then(() => sendResponse({ ok: true }))
    return true
  }

  if (type === 'CLICK_RECORDED') {
    // Ignore clicks from tabs other than the one the user selected
    if (targetTabId !== null && sender.tab?.id !== targetTabId) {
      sendResponse({ ok: true })
      return false
    }
    enqueueClick(message)
    sendResponse({ ok: true })
    return false
  }

  if (type === 'STORE_TOKEN') {
    authToken = message.token
    chrome.storage.local.set({ authToken: message.token })
    sendResponse({ ok: true })
    return false
  }

  if (type === 'CLEAR_TOKEN') {
    authToken = null
    chrome.storage.local.set({ authToken: null })
    sendResponse({ ok: true })
    return false
  }

  if (type === 'GET_STATE') {
    sendResponse({ recording, steps, authToken })
    return false
  }

  return false
})

// ─── External Messages (from web app) ────────────────────────────────────────

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ alive: true })
    return false
  }
  if (message.type === 'STORE_TOKEN') {
    authToken = message.token
    chrome.storage.local.set({ authToken: message.token }).then(() => sendResponse({ ok: true }))
    return true
  }
})

console.log('[Quiqlog] Background service worker started')
