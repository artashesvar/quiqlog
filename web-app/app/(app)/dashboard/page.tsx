import { createClient } from '@/lib/supabase/server'
import GuideList from '@/components/dashboard/GuideList'
import ExtensionCTA from '@/components/dashboard/ExtensionCTA'
import NewGuideButton from '@/components/dashboard/NewGuideButton'
import TokenSync from '@/components/dashboard/TokenSync'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: guides } = await supabase
    .from('guides')
    .select('*, steps(count)')
    .order('created_at', { ascending: false })

  const formattedGuides = (guides ?? []).map((g: any) => ({
    ...g,
    step_count: g.steps?.[0]?.count ?? 0,
    steps: undefined,
  }))

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-semibold text-2xl text-text-primary">
            Your Guides
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            {formattedGuides.length} guide{formattedGuides.length !== 1 ? 's' : ''} created
          </p>
        </div>
        <NewGuideButton />
      </div>

      {/* Syncs auth token to extension silently */}
      <TokenSync />

      {/* Extension CTA (client component — checks for extension) */}
      <ExtensionCTA />

      {/* Guide list */}
      <GuideList guides={formattedGuides} />
    </div>
  )
}
