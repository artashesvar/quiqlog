export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-3 h-3 rounded-full bg-accent shadow-glow" />
            <span className="font-heading font-bold text-2xl text-text-primary">Quiqlog</span>
          </div>
          <p className="text-text-muted text-sm">Instant how-to guides from your clicks</p>
        </div>
        {children}
      </div>
    </div>
  )
}
