'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Lock, User, Boxes, MessageCircle, Phone } from 'lucide-react'
import { toast } from 'sonner'

export function LoginPage() {
  const { setAuth } = useAuth()
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !password) return
    setLoading(true)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      })
      const data = await r.json()
      if (!r.ok) {
        toast.error(data.error || 'Login failed')
        return
      }
      setAuth(data)
      toast.success(`Welcome back, ${data.employee?.name || data.userId}!`)
    } catch (e: any) {
      toast.error(e.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a1a] flex flex-col">
      {/* Animated gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-br from-purple-600 via-fuchsia-500 to-blue-600 opacity-60 blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-gradient-to-tr from-cyan-500 via-blue-500 to-purple-600 opacity-50 blur-3xl animate-pulse-slower" />
        <div className="absolute top-1/3 right-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-pink-500 via-rose-400 to-purple-500 opacity-40 blur-3xl animate-float" />
        <div className="absolute bottom-1/4 left-1/3 h-80 w-80 rounded-full bg-gradient-to-tr from-indigo-500 via-violet-500 to-fuchsia-500 opacity-40 blur-3xl animate-float-delayed" />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Top bar with logo + system name */}
      <header className="relative z-10 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Boxes className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm sm:text-lg leading-tight tracking-wide">DFCL-IT</div>
            <div className="text-[10px] sm:text-xs text-purple-300/80 leading-tight">(Test System)</div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-white/50">
          <span className="hover:text-white/80 transition-colors cursor-default">HOME</span>
          <span className="hover:text-white/80 transition-colors cursor-default">ABOUT</span>
          <span className="hover:text-white/80 transition-colors cursor-default">CONTACT</span>
        </div>
      </header>

      {/* Main content area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-8 py-6">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

          {/* Left: Branding / Welcome message (hidden on mobile, shown on desktop) */}
          <div className="hidden lg:flex flex-col gap-6 text-white">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-xs text-purple-200 mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                System Online
              </div>
              <h1 className="text-5xl xl:text-6xl font-bold leading-tight">
                Welcome
                <span className="block bg-gradient-to-r from-purple-300 via-fuchsia-300 to-blue-300 bg-clip-text text-transparent">
                  Back.
                </span>
              </h1>
            </div>
            <p className="text-white/60 text-lg max-w-md leading-relaxed">
              Barcode & Serial-based Stock Management System. Sign in to manage your purchase, inventory, sales and accounts — all in one place.
            </p>
            <div className="flex flex-wrap gap-3 mt-2">
              {['Purchase', 'Inventory', 'Sales', 'Accounts', 'Reports'].map((m) => (
                <span key={m} className="px-3 py-1.5 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 text-xs text-white/70">
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Login form card */}
          <div className="w-full max-w-md mx-auto">
            <div className="relative">
              {/* Glow behind card */}
              <div className="absolute -inset-1 bg-gradient-to-br from-purple-600/40 via-fuchsia-500/30 to-blue-600/40 rounded-2xl blur-xl" />
              <div className="relative bg-[#13132a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
                <div className="text-center mb-6">
                  <div className="lg:hidden mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/40 mb-3">
                    <Boxes className="h-7 w-7 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Sign In</h2>
                  <p className="text-sm text-white/50 mt-1">Enter your credentials to continue</p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <Label htmlFor="userId" className="text-xs text-white/70 font-medium">User ID</Label>
                    <div className="relative mt-1.5">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        id="userId"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="Enter your user ID"
                        autoFocus
                        className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-purple-400/50"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-xs text-white/70 font-medium">Password</Label>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-purple-400/50"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 mt-2 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-blue-600 hover:from-purple-500 hover:via-fuchsia-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-purple-500/30 border-0 transition-all"
                  >
                    {loading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</>
                    ) : (
                      'LOG IN'
                    )}
                  </Button>
                </form>

                {/* Demo credentials hint */}
                <div className="mt-5 pt-4 border-t border-white/10">
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2 text-center">Demo Accounts</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/5 rounded-md px-2.5 py-1.5 border border-white/5">
                      <div className="text-purple-300 font-medium">👑 Admin</div>
                      <div className="text-white/50 font-mono text-[10px]">admin / admin123</div>
                    </div>
                    <div className="bg-white/5 rounded-md px-2.5 py-1.5 border border-white/5">
                      <div className="text-blue-300 font-medium">💼 Sales</div>
                      <div className="text-white/50 font-mono text-[10px]">sales / sales123</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-4 sm:px-8 py-4 border-t border-white/10 bg-[#0a0a1a]/60 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="text-xs text-white/50">
            <span className="text-white/70 font-medium">Idea & Developed by:</span>{' '}
            <span className="bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent font-semibold">Abdur Rahman Akash</span>
          </div>
          <a
            href="https://wa.me/8801534955065"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-white/60 hover:text-emerald-400 transition-colors group"
          >
            <MessageCircle className="h-3.5 w-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>WhatsApp & Contact:</span>
            <span className="font-mono font-semibold text-emerald-400">01534955065</span>
            <Phone className="h-3 w-3 text-emerald-400/70" />
          </a>
        </div>
      </footer>
    </div>
  )
}
