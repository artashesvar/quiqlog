// Quiqlog Background Service Worker
// Handles: recording state, screenshot capture, annotation, session upload

const APP_URL = 'https://quiqlog-git-staging-artashesvardanyan-9805s-projects.vercel.app'

// ─── In-memory state (avoids read/write race conditions) ─────────────────────
let recording = false
let steps = []
let authToken = null
let targetTabId = null // tab the user selected to record; null = record all tabs
let sessionId = null   // unique ID per recording session, used in upload path

// Load persisted state on startup.
// Stored as a promise so startRecording can await it to avoid race conditions
// when the service worker restarts and a message arrives before storage is read.
const stateReady = chrome.storage.local.get(['recording', 'authToken', 'steps']).then(result => {
  recording = result.recording ?? false
  authToken = result.authToken ?? null
  steps = result.steps ?? []
})

// ─── Screenshot + Annotation ─────────────────────────────────────────────────

async function captureAndAnnotateTab(clickX, clickY, dpr = 1) {
  // Enforce minimum interval between captures to stay under Chrome's rate limit
  const now = Date.now()
  const wait = MIN_CAPTURE_INTERVAL_MS - (now - lastCaptureTime)
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  lastCaptureTime = Date.now()

  // Hide the recording overlay before capturing so it doesn't appear in screenshots.
  // The content script responds only after the next paint (double rAF), guaranteeing
  // the overlay is invisible before captureVisibleTab runs.
  if (targetTabId !== null) {
    await chrome.tabs.sendMessage(targetTabId, { type: 'HIDE_OVERLAY' }).catch(() => {})
  }

  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 90,
    })
    return await annotateScreenshot(dataUrl, clickX, clickY, dpr)
  } catch (err) {
    console.error('[Quiqlog] Screenshot failed:', err)
    return null
  } finally {
    // Restore the overlay regardless of capture success/failure
    if (targetTabId !== null) {
      chrome.tabs.sendMessage(targetTabId, { type: 'SHOW_OVERLAY' }).catch(() => {})
    }
  }
}

async function annotateScreenshot(dataUrl, x, y, dpr = 1) {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const imageBitmap = await createImageBitmap(blob)

  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imageBitmap, 0, 0)

  // Scale CSS pixel coordinates to device pixels so the annotation
  // lands at the correct position on high-DPI screenshots.
  const px = x * dpr
  const py = y * dpr
  const radius = 22 * dpr
  const dotRadius = 5 * dpr

  ctx.beginPath()
  ctx.arc(px, py, radius, 0, 2 * Math.PI)
  ctx.fillStyle = 'rgba(255, 220, 0, 0.35)'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(px, py, radius, 0, 2 * Math.PI)
  ctx.strokeStyle = '#FFD700'
  ctx.lineWidth = 3 * dpr
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(px, py, dotRadius, 0, 2 * Math.PI)
  ctx.fillStyle = '#FFD700'
  ctx.fill()

  // Return Blob directly instead of converting to base64 data URL
  return canvas.convertToBlob({ type: 'image/png' })
}

// ─── Screenshot Upload ───────────────────────────────────────────────────────

async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  // Build binary string in chunks to avoid O(n²) string concatenation
  const CHUNK = 8192
  const chunks = []
  for (let i = 0; i < bytes.length; i += CHUNK) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)))
  }
  return btoa(chunks.join(''))
}

async function uploadScreenshot(blob) {
  if (!authToken) throw new Error('No auth token — skipping upload')
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

async function processClick({ x, y, dpr, label, url, pageTitle }) {
  if (!recording) return

  try {
    const screenshotBlob = await captureAndAnnotateTab(x, y, dpr)
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

    await chrome.storage.local.set({ steps, stepCount: steps.length })
    chrome.runtime.sendMessage({ type: 'STEP_COUNT', count: steps.length }).catch(() => {})
    console.log(`[Quiqlog] Step ${steps.length} recorded: "${label}" (screenshot: ${screenshotUrl ? 'yes' : 'no'})`)
  } catch (err) {
    console.error('[Quiqlog] Error processing click:', err)
  }
}

// ─── Content Script Injection ─────────────────────────────────────────────────
// Content script is NOT declared in the manifest. We inject on-demand only when
// recording starts, and re-inject when the user navigates within the recorded tab.

async function injectContentScript(tabId) {
  try {
    await Promise.all([
      chrome.scripting.executeScript({ target: { tabId }, files: ['src/content/content.js'] }),
      chrome.scripting.insertCSS({ target: { tabId }, files: ['src/content/styles.css'] }),
    ])
  } catch (err) {
    console.warn('[Quiqlog] Content script injection failed:', err)
  }
}

// Re-inject content script when the recorded tab navigates to a new page.
// The listener is added in startRecording and removed in stopRecording.
function onTabUpdated(tabId, changeInfo) {
  if (tabId === targetTabId && changeInfo.status === 'complete' && recording) {
    console.log('[Quiqlog] Tab navigated — re-injecting content script')
    injectContentScript(tabId)
  }
}

// ─── Recording Control ────────────────────────────────────────────────────────

async function startRecording(tabId = null) {
  await stateReady // ensure authToken is loaded from storage before recording
  recording = true
  steps = []
  sessionId = crypto.randomUUID()
  targetTabId = tabId
  clickQueue = Promise.resolve() // reset queue in case it was left in a rejected state
  await chrome.storage.local.set({ recording: true, steps: [], stepCount: 0 })
  await chrome.action.setBadgeText({ text: '●' })
  await chrome.action.setBadgeBackgroundColor({ color: '#EF4444' })

  if (tabId !== null) {
    await injectContentScript(tabId)
    // In case the __quiqlog_injected__ guard blocked re-injection (tab was
    // previously recorded and the content script is still loaded with
    // isRecording=false), explicitly re-activate it.
    chrome.tabs.sendMessage(tabId, { type: 'SET_RECORDING', value: true }).catch(() => {})
    chrome.tabs.onUpdated.addListener(onTabUpdated)
  }

  console.log('[Quiqlog] Recording started', targetTabId ? `(tab ${targetTabId})` : '(all tabs)')
}

async function stopRecording() {
  recording = false
  chrome.tabs.onUpdated.removeListener(onTabUpdated)
  await chrome.storage.local.set({ recording: false })
  await chrome.action.setBadgeText({ text: '' })

  // Wait for any in-progress click processing to finish.
  // targetTabId is still set so in-flight captures can hide/show the overlay.
  try {
    await clickQueue
  } catch (err) {
    console.warn('[Quiqlog] Click queue error on stop:', err)
  }

  // Notify the content script directly so the overlay is removed immediately,
  // rather than relying on the slower storage.onChanged fallback.
  if (targetTabId !== null) {
    chrome.tabs.sendMessage(targetTabId, { type: 'SET_RECORDING', value: false }).catch(() => {})
  }
  targetTabId = null

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
    await chrome.tabs.create({ url: `${APP_URL}/home/guides/${guideId}/editor` })
    steps = []
    sessionId = null
    await chrome.storage.local.set({ steps: [], stepCount: 0 })
  } catch (err) {
    console.error('[Quiqlog] Failed to submit session:', err)
    await chrome.tabs.create({ url: `${APP_URL}/home` })
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
    // Only respond to messages from the extension itself (popup/background),
    // not from content scripts on web pages, to avoid leaking authToken.
    if (sender.tab) {
      sendResponse({ error: 'unauthorized' })
      return false
    }
    // Await stateReady to avoid a race condition where the service worker
    // wakes from sleep and GET_STATE arrives before storage has been read.
    stateReady.then(() => sendResponse({ recording, steps, authToken }))
    return true // keep message channel open for async response
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
  if (message.type === 'CLEAR_TOKEN') {
    authToken = null
    chrome.storage.local.set({ authToken: null }).then(() => sendResponse({ ok: true }))
    return true
  }
})

console.log('[Quiqlog] Background service worker started')
