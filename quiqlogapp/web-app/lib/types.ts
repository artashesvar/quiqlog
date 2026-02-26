export interface Guide {
  id: string
  user_id: string
  title: string
  slug: string
  is_public: boolean
  created_at: string
  updated_at: string
  steps?: Step[]
  step_count?: number
}

export interface Step {
  id: string
  guide_id: string
  order_index: number
  type: 'step' | 'tip' | 'alert'
  title: string
  description: string
  screenshot_url: string | null
  click_x: number | null
  click_y: number | null
  element_label: string | null
  zoom_level: number
  pan_x: number
  pan_y: number
  indicator_x: number | null
  indicator_y: number | null
  created_at: string
}

export interface User {
  id: string
  email: string | undefined
  created_at: string
}

export interface RecordedStep {
  x: number
  y: number
  viewportWidth?: number
  viewportHeight?: number
  label: string
  screenshotBase64?: string
  screenshotUrl?: string | null
  url: string
  pageTitle: string
}

export interface ExtensionSession {
  title: string
  steps: RecordedStep[]
}
