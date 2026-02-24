import ExtensionCTA from '@/components/dashboard/ExtensionCTA'

export const metadata = { title: 'Home' }

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Extension CTA (client component — checks for extension) */}
      <ExtensionCTA />
    </div>
  )
}
