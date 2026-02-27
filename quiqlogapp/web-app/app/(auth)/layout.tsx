import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mb-2">
            <Image src="/logo1.png" alt="Quiqlog" width={360} height={200} className="h-16 w-auto mx-auto" priority />
          </div>
          <p className="text-text-muted text-sm">Instant how-to guides from your clicks</p>
        </div>
        {children}
      </div>
    </div>
  )
}
