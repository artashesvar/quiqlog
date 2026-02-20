import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-glow" />
            <span className="font-heading font-bold text-lg text-text-primary">Quiqlog</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          No writing required
        </div>

        <h1 className="font-heading font-bold text-5xl sm:text-6xl text-text-primary leading-tight mb-6">
          Turn your clicks into<br />
          <span className="text-gradient">beautiful how-to guides</span>
        </h1>

        <p className="text-text-secondary text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Record your screen, capture every click, and instantly generate a polished,
          shareable step-by-step guide — without writing a single word.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/signup">
            <Button size="lg">
              Start for Free →
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button variant="secondary" size="lg">
              See How It Works
            </Button>
          </a>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="font-heading font-bold text-3xl text-text-primary text-center mb-3">
          How Quiqlog works
        </h2>
        <p className="text-text-muted text-center mb-12">Three steps to a shareable guide.</p>

        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              icon: '🎬',
              title: 'Record your workflow',
              body: 'Install the Chrome extension, hit "Start Recording," and go about your task normally. Every click is captured automatically.',
            },
            {
              step: '02',
              icon: '✏️',
              title: 'Review & refine',
              body: 'Your steps appear instantly in the editor with annotated screenshots. Edit titles, reorder steps, or delete accidental clicks.',
            },
            {
              step: '03',
              icon: '🔗',
              title: 'Share anywhere',
              body: 'Publish your guide and get a shareable link. Send it to teammates, clients, or embed it in your docs — no account needed to view.',
            },
          ].map(({ step, icon, title, body }) => (
            <div
              key={step}
              className="flex flex-col gap-4 p-6 rounded-lg border border-border bg-background-secondary shadow-soft"
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl">{icon}</span>
                <span className="font-heading font-bold text-4xl text-border">{step}</span>
              </div>
              <h3 className="font-heading font-semibold text-lg text-text-primary">{title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-10 text-center shadow-glow">
          <h2 className="font-heading font-bold text-3xl text-text-primary mb-3">
            Ready to create your first guide?
          </h2>
          <p className="text-text-secondary mb-8">
            It takes less than 2 minutes to set up and share your first how-to.
          </p>
          <Link href="/signup">
            <Button size="lg">
              Get Started — It&apos;s Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center">
        <p className="text-text-muted text-sm">
          © {new Date().getFullYear()} Quiqlog. Made with ☕
        </p>
      </footer>
    </div>
  )
}
