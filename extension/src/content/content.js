// Quiqlog Content Script
// Runs on all pages. Listens for clicks when recording is active.

let isRecording = false

// ─── Overlay IDs ──────────────────────────────────────────────────────────────

const OVERLAY_FRAME_ID = '__quiqlog_overlay_frame__'
const STOP_BTN_ID = '__quiqlog_stop_btn__'

// ─── Recording Indicator Overlay ──────────────────────────────────────────────

function createRecordingOverlay() {
  if (document.getElementById(OVERLAY_FRAME_ID)) return // already exists

  // Border frame — covers full viewport, pointer-events:none so it's non-blocking
  const frame = document.createElement('div')
  frame.id = OVERLAY_FRAME_ID
  frame.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    box-shadow: inset 0 0 0 3px #818CF8;
    pointer-events: none;
    z-index: 2147483646;
  `
  document.body.appendChild(frame)

  // Stop button — fixed bottom center
  const btn = document.createElement('button')
  btn.id = STOP_BTN_ID
  btn.className = '__quiqlog_stop_btn__'
  btn.textContent = 'Stop Recording'
  btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    background: #6366F1;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
    white-space: nowrap;
  `
  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    removeRecordingOverlay()
    isRecording = false // prevent further step recording immediately
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' })
  })
  document.body.appendChild(btn)
}

function removeRecordingOverlay() {
  document.getElementById(OVERLAY_FRAME_ID)?.remove()
  document.getElementById(STOP_BTN_ID)?.remove()
}

function setOverlayVisibility(visible) {
  const v = visible ? 'visible' : 'hidden'
  const frame = document.getElementById(OVERLAY_FRAME_ID)
  const btn = document.getElementById(STOP_BTN_ID)
  if (frame) frame.style.visibility = v
  if (btn) btn.style.visibility = v
}

// ─── Overlay Circle ───────────────────────────────────────────────────────────

function showClickCircle(x, y) {
  const circle = document.createElement('div')
  circle.className = '__quiqlog_circle__'
  circle.style.cssText = `
    position: fixed;
    left: ${x - 22}px;
    top: ${y - 22}px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255, 220, 0, 0.35);
    border: 3px solid #FFD700;
    pointer-events: none;
    z-index: 2147483647;
    animation: __quiqlog_pulse__ 0.8s ease-out forwards;
  `
  document.body.appendChild(circle)
  setTimeout(() => circle.remove(), 900)
}

// ─── Label Extraction ─────────────────────────────────────────────────────────

function extractLabel(element) {
  if (!element) return 'Unknown'

  // Priority order for label extraction
  const candidates = [
    element.getAttribute('aria-label'),
    element.getAttribute('title'),
    element.getAttribute('placeholder'),
    element.getAttribute('alt'),
    element.innerText?.trim().slice(0, 60),
    element.value?.trim().slice(0, 60),
    element.getAttribute('name'),
    element.getAttribute('id'),
    element.tagName.toLowerCase(),
  ]

  for (const candidate of candidates) {
    if (candidate && candidate.trim()) return candidate.trim()
  }

  return 'Element'
}

// ─── Click Handler ────────────────────────────────────────────────────────────

function handleClick(event) {
  if (!isRecording) return

  // Ignore clicks on our own overlay elements
  if (event.target.className === '__quiqlog_circle__') return
  if (event.target.closest?.(`#${STOP_BTN_ID}`)) return

  const x = event.clientX
  const y = event.clientY
  const label = extractLabel(event.target)

  // Show visual feedback immediately
  showClickCircle(x, y)

  // Send to background for screenshot capture
  chrome.runtime.sendMessage({
    type: 'CLICK_RECORDED',
    x,
    y,
    dpr: window.devicePixelRatio || 1,
    label,
    url: window.location.href,
    pageTitle: document.title,
  })
}

// ─── Recording State Sync ────────────────────────────────────────────────────

async function syncRecordingState() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' })
  isRecording = response?.recording ?? false
  if (isRecording) createRecordingOverlay()
}

// Listen for direct messages from the background (primary mechanism)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SET_RECORDING') {
    isRecording = message.value
    if (message.value) createRecordingOverlay()
    else removeRecordingOverlay()
  }

  if (message.type === 'HIDE_OVERLAY') {
    setOverlayVisibility(false)
    // Double rAF ensures the browser has committed the paint before we respond,
    // so the overlay is guaranteed not to appear in the screenshot.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => sendResponse({ hidden: true }))
    )
    return true // keep channel open for async response
  }

  if (message.type === 'SHOW_OVERLAY') {
    setOverlayVisibility(true)
  }
})

// Listen for storage changes as a fallback (e.g. for tabs without a direct message)
chrome.storage.onChanged.addListener((changes) => {
  if ('recording' in changes) {
    isRecording = changes.recording.newValue ?? false
    if (isRecording) createRecordingOverlay()
    else removeRecordingOverlay()
  }
})

// ─── Init ─────────────────────────────────────────────────────────────────────

syncRecordingState()

// Use capture phase so we catch clicks before other handlers can stop propagation
document.addEventListener('click', handleClick, { capture: true, passive: true })

console.log('[Quiqlog] Content script loaded on', window.location.hostname)
