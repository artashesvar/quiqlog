// Quiqlog Content Script
// Injected on-demand when recording starts. Listens for clicks and manages the recording overlay.

;(() => {
  // Guard against double-injection on SPA pages where tabs.onUpdated fires
  // without actually destroying the previous page context.
  if (window.__quiqlog_injected__) return
  window.__quiqlog_injected__ = true

  // Always true on injection — the background only injects this script when recording.
  let isRecording = true
  let keepaliveInterval = null

  // ─── Overlay IDs ────────────────────────────────────────────────────────────

  const OVERLAY_FRAME_ID = '__quiqlog_overlay_frame__'
  const STOP_BTN_ID = '__quiqlog_stop_btn__'
  const PANEL_ID = '__quiqlog_panel__'
  const PANEL_HEADER_ID = '__quiqlog_panel_header__'
  const PANEL_LIST_ID = '__quiqlog_panel_list__'
  const PANEL_THUMB_ID = '__quiqlog_panel_thumb__'

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
      stopKeepalive()
      isRecording = false // prevent further step recording immediately
      chrome.runtime.sendMessage({ type: 'STOP_RECORDING' })
    })
    document.body.appendChild(btn)
  }

  function removeRecordingOverlay() {
    document.getElementById(OVERLAY_FRAME_ID)?.remove()
    document.getElementById(STOP_BTN_ID)?.remove()
    removePreviewPanel()
  }

  function setOverlayVisibility(visible) {
    const v = visible ? 'visible' : 'hidden'
    const frame = document.getElementById(OVERLAY_FRAME_ID)
    const btn = document.getElementById(STOP_BTN_ID)
    const panel = document.getElementById(PANEL_ID)
    if (frame) frame.style.visibility = v
    if (btn) btn.style.visibility = v
    if (panel) panel.style.visibility = v
    // Also hide any click-feedback circles so they don't appear in screenshots
    document.querySelectorAll('.__quiqlog_circle__').forEach(el => {
      el.style.visibility = v
    })
  }

  // ─── Live Preview Panel ──────────────────────────────────────────────────────

  function createTrashIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '11')
    svg.setAttribute('height', '11')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '2.5')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')
    svg.style.cssText = 'pointer-events:none;display:block;'
    const lid = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
    lid.setAttribute('points', '3 6 5 6 21 6')
    const body = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    body.setAttribute('d', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2')
    svg.appendChild(lid)
    svg.appendChild(body)
    return svg
  }

  function createPreviewPanel() {
    if (document.getElementById(PANEL_ID)) return // already exists

    const panel = document.createElement('div')
    panel.id = PANEL_ID

    // Header — acts as the drag handle
    const header = document.createElement('div')
    header.id = PANEL_HEADER_ID
    const dot = document.createElement('span')
    dot.className = '__quiqlog_red_dot__'
    header.appendChild(dot)
    header.appendChild(document.createTextNode('\u00A0Recording...'))

    // Scrollable list of previous steps
    const list = document.createElement('div')
    list.id = PANEL_LIST_ID
    list.style.display = 'none'

    // Thumbnail for the most recent step
    const thumb = document.createElement('div')
    thumb.id = PANEL_THUMB_ID
    thumb.style.display = 'none'

    panel.appendChild(header)
    panel.appendChild(list)
    panel.appendChild(thumb)

    // Set initial position as plain inline styles (not !important) so the
    // drag handler can freely override them with JS inline style assignments.
    panel.style.bottom = '20px'
    panel.style.left = '20px'

    document.body.appendChild(panel)

    setupPanelDrag(panel, header)
  }

  function removePreviewPanel() {
    document.getElementById(PANEL_ID)?.remove()
  }

  function setupPanelDrag(panel, handle) {
    let isDragging = false
    let startX = 0, startY = 0, startLeft = 0, startTop = 0

    handle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return
      isDragging = true
      startX = e.clientX
      startY = e.clientY
      const rect = panel.getBoundingClientRect()
      startLeft = rect.left
      startTop = rect.top
      e.preventDefault()
    })

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return
      const newLeft = startLeft + (e.clientX - startX)
      const newTop = startTop + (e.clientY - startY)
      // Clamp to viewport so panel can't be dragged fully off-screen
      const maxLeft = window.innerWidth - panel.offsetWidth
      const maxTop = window.innerHeight - panel.offsetHeight
      panel.style.left = `${Math.max(0, Math.min(newLeft, maxLeft))}px`
      panel.style.top = `${Math.max(0, Math.min(newTop, maxTop))}px`
      // Switch from bottom/right anchoring to top/left once the user drags
      panel.style.bottom = 'auto'
      panel.style.right = 'auto'
    })

    document.addEventListener('mouseup', () => {
      isDragging = false
    })
  }

  function updatePanelSteps(steps) {
    const list = document.getElementById(PANEL_LIST_ID)
    const thumb = document.getElementById(PANEL_THUMB_ID)
    if (!list || !thumb) return

    list.innerHTML = ''
    thumb.innerHTML = ''

    if (steps.length === 0) {
      list.style.display = 'none'
      thumb.style.display = 'none'
      return
    }

    // All steps except the last → scrollable list
    const previousSteps = steps.slice(0, -1)
    if (previousSteps.length > 0) {
      list.style.display = 'block'
      previousSteps.forEach((step, i) => {
        const item = document.createElement('div')
        item.className = '__quiqlog_step_item__'

        const labelSpan = document.createElement('span')
        labelSpan.className = '__quiqlog_step_label__'
        const truncated = step.label ? step.label.slice(0, 15) : ''
        labelSpan.textContent = truncated ? `Step ${i + 1}: ${truncated}` : `Step ${i + 1}`

        const deleteBtn = document.createElement('button')
        deleteBtn.className = '__quiqlog_step_delete__'
        deleteBtn.appendChild(createTrashIcon())
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          chrome.runtime.sendMessage({ type: 'DELETE_STEP', index: i })
        })

        item.appendChild(labelSpan)
        item.appendChild(deleteBtn)
        list.appendChild(item)
      })
      // Keep the most recent past step in view
      list.scrollTop = list.scrollHeight
    } else {
      list.style.display = 'none'
    }

    // Most recent step → thumbnail
    thumb.style.display = 'block'
    const lastStep = steps[steps.length - 1]
    const lastIndex = steps.length - 1

    const thumbLabel = document.createElement('div')
    thumbLabel.className = '__quiqlog_thumb_label__'
    const truncatedLast = lastStep.label ? lastStep.label.slice(0, 15) : ''
    thumbLabel.textContent = truncatedLast
      ? `Step ${lastIndex + 1}: ${truncatedLast}`
      : `Step ${lastIndex + 1}`

    const thumbWrapper = document.createElement('div')
    thumbWrapper.className = '__quiqlog_thumb_wrapper__'

    if (lastStep.screenshotUrl) {
      const img = document.createElement('img')
      img.className = '__quiqlog_thumb_img__'
      img.src = lastStep.screenshotUrl
      img.alt = `Step ${lastIndex + 1}`
      thumbWrapper.appendChild(img)
    } else {
      const placeholder = document.createElement('div')
      placeholder.className = '__quiqlog_thumb_placeholder__'
      placeholder.textContent = 'No screenshot'
      thumbWrapper.appendChild(placeholder)
    }

    const thumbDeleteBtn = document.createElement('button')
    thumbDeleteBtn.className = '__quiqlog_thumb_delete__'
    thumbDeleteBtn.appendChild(createTrashIcon())
    thumbDeleteBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      chrome.runtime.sendMessage({ type: 'DELETE_STEP', index: lastIndex })
    })
    thumbWrapper.appendChild(thumbDeleteBtn)

    thumb.appendChild(thumbLabel)
    thumb.appendChild(thumbWrapper)
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

  // ─── Service Worker Keepalive ────────────────────────────────────────────────
  // Ping the background every 25s while recording to prevent Chrome from
  // terminating the service worker due to inactivity (MV3 ~5-minute idle limit).
  // With pings every 25s the SW stays alive for as long as the user is on the
  // recorded tab, extending effective lifetime to ~15 minutes or more.

  function startKeepalive() {
    if (keepaliveInterval !== null) return // already running
    keepaliveInterval = setInterval(() => {
      chrome.runtime.sendMessage({ type: 'KEEPALIVE' }).catch(() => {})
    }, 25000)
  }

  function stopKeepalive() {
    if (keepaliveInterval !== null) {
      clearInterval(keepaliveInterval)
      keepaliveInterval = null
    }
  }

  // ─── Click Handler ──────────────────────────────────────────────────────────

  function handleClick(event) {
    if (!isRecording) return

    // Only capture left-clicks (ignore right-click, middle-click)
    if (event.button !== 0) return

    // Ignore clicks on our own overlay elements
    if (event.target.className === '__quiqlog_circle__') return
    if (event.target.closest?.(`#${STOP_BTN_ID}`)) return
    if (event.target.closest?.(`#${PANEL_ID}`)) return

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
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      label,
      url: window.location.href,
      pageTitle: document.title,
    })
  }

  // ─── Message Listener ───────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'SET_RECORDING') {
      isRecording = message.value
      if (message.value) {
        createRecordingOverlay()
        createPreviewPanel()
        startKeepalive()
      } else {
        removeRecordingOverlay()
        stopKeepalive()
      }
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

    if (message.type === 'PANEL_STEPS_UPDATE') {
      updatePanelSteps(message.steps)
    }
  })

  // ─── Init ───────────────────────────────────────────────────────────────────

  createRecordingOverlay()
  createPreviewPanel()
  startKeepalive()
  document.addEventListener('mousedown', handleClick, { capture: true, passive: true })

  // Repopulate panel with steps captured on previous pages (navigation case).
  // GET_PANEL_STEPS is a content-script-safe endpoint on the background that
  // returns only label + screenshotUrl, without the sensitive authToken.
  chrome.runtime.sendMessage({ type: 'GET_PANEL_STEPS' }, (response) => {
    if (response && response.steps && response.steps.length > 0) {
      updatePanelSteps(response.steps)
    }
  })

  console.log('[Quiqlog] Content script loaded on', window.location.hostname)
})()
