// Quiqlog Popup Script

const APP_URL = 'https://app.quiqlog.com'

const recordBtn = document.getElementById('record-btn')
const recordLabel = document.getElementById('record-label')
const recordIcon = document.getElementById('record-icon')
const statusBadge = document.getElementById('status-badge')
const statusText = document.getElementById('status-text')
const stepCountDisplay = document.getElementById('step-count-display')
const stepCountEl = document.getElementById('step-count')
const recordingSection = document.getElementById('recording-section')
const authSection = document.getElementById('auth-section')
const processingSection = document.getElementById('processing-section')
const tabPickerSection = document.getElementById('tab-picker-section')
const tabList = document.getElementById('tab-list')
const tabPickerHint = document.getElementById('tab-picker-hint')
const confirmTabBtn = document.getElementById('confirm-tab-btn')
const loginLink = document.getElementById('login-link')
const dashboardLink = document.getElementById('dashboard-link')

let isRecording = false
let selectedTabId = null
let selectedTab = null

// Set links
loginLink.href = APP_URL + '/login'
dashboardLink.href = APP_URL + '/home'

function updateUI(recording, stepCount = 0, hasToken = false) {
  isRecording = recording
  tabPickerSection.style.display = 'none' // always hide tab picker when updating main UI

  if (!hasToken) {
    authSection.style.display = 'flex'
    recordingSection.style.display = 'none'
    statusBadge.className = 'status-badge status-idle'
    statusText.textContent = 'Not logged in'
    return
  }

  authSection.style.display = 'none'
  recordingSection.style.display = 'flex'

  if (recording) {
    statusBadge.className = 'status-badge status-recording'
    statusText.textContent = 'Recording'

    recordBtn.className = 'btn btn-danger'
    recordLabel.textContent = 'Stop Recording'
    recordIcon.innerHTML = '<rect x="4" y="4" width="16" height="16" rx="2"/>'

    if (stepCount > 0) {
      stepCountDisplay.style.display = 'flex'
      stepCountEl.textContent = stepCount
    }
  } else {
    statusBadge.className = 'status-badge status-idle'
    statusText.textContent = 'Idle'

    recordBtn.className = 'btn btn-primary'
    recordLabel.textContent = 'Start Recording'
    recordIcon.innerHTML = '<circle cx="12" cy="12" r="10"/>'

    stepCountDisplay.style.display = 'none'
    stepCountEl.textContent = '0'
  }
}

// Load initial state
async function loadState() {
  const state = await chrome.runtime.sendMessage({ type: 'GET_STATE' })
  const hasToken = !!state?.authToken
  updateUI(state?.recording ?? false, state?.steps?.length ?? 0, hasToken)
}

// ─── Tab picker ───────────────────────────────────────────────────────────────

async function showTabPicker() {
  const allTabs = await chrome.tabs.query({})
  // Filter out internal Chrome pages that can't be recorded
  const recordableTabs = allTabs.filter(
    (t) => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('about:')
  )

  selectedTabId = null
  selectedTab = null
  renderTabList(recordableTabs)
  updateConfirmBtn()

  recordingSection.style.display = 'none'
  tabPickerSection.style.display = 'flex'
}

function renderTabList(tabs) {
  tabList.innerHTML = ''

  if (tabs.length === 0) {
    tabList.innerHTML = '<p class="hint-text" style="padding:8px;text-align:center">No recordable tabs open.</p>'
    return
  }

  tabs.forEach((tab) => {
    const item = document.createElement('div')
    item.className = 'tab-item'

    const favicon = document.createElement(tab.favIconUrl ? 'img' : 'div')
    favicon.className = tab.favIconUrl ? 'tab-favicon' : 'tab-favicon-fallback'
    if (tab.favIconUrl) {
      favicon.src = tab.favIconUrl
      favicon.onerror = () => {
        const fallback = document.createElement('div')
        fallback.className = 'tab-favicon-fallback'
        favicon.replaceWith(fallback)
      }
    }

    const title = document.createElement('span')
    title.className = 'tab-title'
    title.textContent = tab.title || tab.url

    item.appendChild(favicon)
    item.appendChild(title)

    item.addEventListener('click', () => {
      selectedTabId = tab.id
      selectedTab = tab
      document.querySelectorAll('.tab-item').forEach((el) => el.classList.remove('selected'))
      item.classList.add('selected')
      updateConfirmBtn()
    })

    tabList.appendChild(item)
  })
}

function updateConfirmBtn() {
  confirmTabBtn.disabled = !selectedTabId
  tabPickerHint.style.display = selectedTabId ? 'none' : 'block'
}

// Confirm tab selection → start recording first, then navigate to the tab.
// Order matters: recording must be active in the background (and storage updated)
// before the tab becomes visible, otherwise the content script misses the state
// change and ignores all clicks.
confirmTabBtn.addEventListener('click', async () => {
  if (!selectedTabId || !selectedTab) return
  tabPickerSection.style.display = 'none'
  updateUI(true, 0, true)

  // Wait for background to set recording=true and write to storage.
  // The content script's storage.onChanged fires during this await,
  // so isRecording is true on the target tab before the user sees it.
  await chrome.runtime.sendMessage({ type: 'START_RECORDING', tabId: selectedTabId }).catch(() => {})

  // Now it's safe to switch — the content script is already ready
  chrome.tabs.update(selectedTabId, { active: true })
  chrome.windows.update(selectedTab.windowId, { focused: true })
})

// ─── Processing state ─────────────────────────────────────────────────────────

function showProcessing() {
  processingSection.style.display = 'flex'
  recordingSection.style.display = 'none'
}

function hideProcessing() {
  processingSection.style.display = 'none'
}

// ─── Main record button ───────────────────────────────────────────────────────

recordBtn.addEventListener('click', async () => {
  if (isRecording) {
    // If it takes more than 1s, show the spinner (button stays as-is until then)
    const processingTimer = setTimeout(showProcessing, 1000)

    try {
      await chrome.runtime.sendMessage({ type: 'STOP_RECORDING' })
    } catch (_) {
      // Expected: the popup may close before the response arrives
      // because the background opens the guide editor tab first
    } finally {
      clearTimeout(processingTimer)
      hideProcessing()
      updateUI(false, 0, true)
    }
  } else {
    await showTabPicker()
  }
})

// Listen for step count updates from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'STEP_COUNT') {
    stepCountEl.textContent = message.count
    if (message.count > 0) {
      stepCountDisplay.style.display = 'flex'
    }
  }
})

loadState()
