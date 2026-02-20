// Quiqlog Content Script
// Runs on all pages. Listens for clicks when recording is active.

let isRecording = false

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
    label,
    url: window.location.href,
    pageTitle: document.title,
  })
}

// ─── Recording State Sync ────────────────────────────────────────────────────

async function syncRecordingState() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' })
  isRecording = response?.recording ?? false
}

// Listen for direct messages from the background (primary mechanism)
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SET_RECORDING') {
    isRecording = message.value
  }
})

// Listen for storage changes as a fallback (e.g. for tabs without a direct message)
chrome.storage.onChanged.addListener((changes) => {
  if ('recording' in changes) {
    isRecording = changes.recording.newValue ?? false
  }
})

// ─── Init ─────────────────────────────────────────────────────────────────────

syncRecordingState()

// Use capture phase so we catch clicks before other handlers can stop propagation
document.addEventListener('click', handleClick, { capture: true, passive: true })

console.log('[Quiqlog] Content script loaded on', window.location.hostname)
