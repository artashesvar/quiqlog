// Quiqlog Content Script
// Injected on-demand when recording starts. Listens for clicks and manages the recording overlay.

;(() => {
  // Guard against double-injection on SPA pages where tabs.onUpdated fires
  // without actually destroying the previous page context.
  if (window.__quiqlog_injected__) return
  window.__quiqlog_injected__ = true

  // Always true on injection — the background only injects this script when recording.
  let isRecording = true

  // ─── Overlay IDs ────────────────────────────────────────────────────────────

  const OVERLAY_FRAME_ID = '__quiqlog_overlay_frame__'
  const STOP_BTN_ID = '__quiqlog_stop_btn__'

  // ─── Recording Indicator Overlay ────────────────────────────────────────────

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

  // ─── Overlay Circle ─────────────────────────────────────────────────────────

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

  // ─── Label Extraction ───────────────────────────────────────────────────────

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

  // ─── Interactive Element Detection ─────────────────────────────────────────

  const INTERACTIVE_TAGS = new Set([
    'a', 'button', 'input', 'select', 'textarea',
    'option', 'label', 'summary', 'canvas', 'area', 'details',
  ])

  const INTERACTIVE_ROLES = new Set([
    'button', 'link', 'tab', 'checkbox', 'radio',
    'menuitem', 'menuitemcheckbox', 'menuitemradio',
    'switch', 'option', 'combobox', 'searchbox',
    'slider', 'spinbutton', 'textbox', 'treeitem',
  ])

  function isInteractiveElement(target) {
    // Walk the target + up to 4 ancestors looking for interactive signals
    let current = target
    for (let i = 0; i < 5 && current && current !== document.body; i++) {
      const tag = current.tagName?.toLowerCase()

      // Semantic HTML tags
      if (INTERACTIVE_TAGS.has(tag)) return true

      // ARIA roles
      const role = current.getAttribute?.('role')
      if (role && INTERACTIVE_ROLES.has(role)) return true

      // Contenteditable regions
      if (current.getAttribute?.('contenteditable') === 'true') return true

      // Explicitly focusable elements (tabindex >= 0)
      const tabindex = current.getAttribute?.('tabindex')
      if (tabindex !== null && tabindex !== '-1' && tabindex !== undefined) return true

      current = current.parentElement
    }

    // Fallback: cursor:pointer on the clicked element (catches styled custom components)
    try {
      if (getComputedStyle(target).cursor === 'pointer') return true
    } catch {}

    return false
  }

  // ─── Click Handler ──────────────────────────────────────────────────────────

  function handleClick(event) {
    if (!isRecording) return

    // Only capture left-clicks (ignore right-click, middle-click)
    if (event.button !== 0) return

    // Ignore clicks on our own overlay elements
    if (event.target.className === '__quiqlog_circle__') return
    if (event.target.closest?.(`#${STOP_BTN_ID}`)) return

    const x = event.clientX
    const y = event.clientY

    // Use the topmost painted element at the click coordinates rather than event.target.
    // This ensures clicks on popup/modal close buttons are attributed to the popup element
    // instead of the background page element that the event bubbled up through.
    const topElement = document.elementFromPoint(x, y) ?? event.target

    // Skip clicks on non-interactive elements (empty areas, backgrounds, layout containers)
    if (!isInteractiveElement(topElement)) return

    const label = extractLabel(topElement)

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

  // ─── Message Listener ───────────────────────────────────────────────────────

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

  // ─── Init ───────────────────────────────────────────────────────────────────

  createRecordingOverlay()
  document.addEventListener('mousedown', handleClick, { capture: true, passive: true })
  console.log('[Quiqlog] Content script loaded on', window.location.hostname)
})()
