import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PublicGuideHeader from '@/components/public/PublicGuideHeader'
import PublicStep from '@/components/public/PublicStep'
import PublicTipAlertBlock from '@/components/public/PublicTipAlertBlock'
import type { Metadata } from 'next'
import { APP_NAME } from '@/lib/constants'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: guide } = await supabase
    .from('guides')
    .select('title, steps(screenshot_url)')
    .eq('slug', slug)
    .eq('is_public', true)
    .order('order_index', { referencedTable: 'steps', ascending: true })
    .limit(1, { referencedTable: 'steps' })
    .single()

  if (!guide) return { title: 'Guide Not Found' }

  const firstScreenshot = (guide.steps as any)?.[0]?.screenshot_url

  return {
    title: guide.title,
    description: `Step-by-step guide: ${guide.title} — made with ${APP_NAME}`,
    openGraph: {
      title: guide.title,
      description: `Step-by-step guide: ${guide.title}`,
      images: firstScreenshot ? [firstScreenshot] : [],
      type: 'article',
    },
  }
}

export default async function PublicGuidePage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: guide } = await supabase
    .from('guides')
    .select('*, steps(*)')
    .eq('slug', slug)
    .eq('is_public', true)
    .order('order_index', { referencedTable: 'steps', ascending: true })
    .single()

  if (!guide) notFound()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-8">
        <PublicGuideHeader guide={guide} />

        <div className="flex flex-col gap-6">
          {(() => {
            let stepCount = 0
            return guide.steps?.map((item: any, index: number) => {
              if (item.type === 'step') stepCount++
              return (
                <div key={item.id} className={`stagger-${Math.min(index + 1, 9)}`}>
                  {item.type === 'tip' || item.type === 'alert' ? (
                    <PublicTipAlertBlock block={item} />
                  ) : (
                    <PublicStep step={item} stepNumber={stepCount} />
                  )}
                </div>
              )
            })
          })()}
        </div>

        {/* Footer */}
        <footer className="pt-8 border-t border-border text-center">
          <p className="text-text-muted text-sm">
            Made with{' '}
            <a
              href="/"
              className="text-accent hover:text-accent-hover transition-colors font-medium"
            >
              Quiqlog
            </a>
            {' '}— Create how-to guides from your clicks, instantly.
          </p>
        </footer>
      </div>
    </div>
  )
}
