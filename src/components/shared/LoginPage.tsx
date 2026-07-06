'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Lock, User, Boxes, MessageCircle, Phone, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export function LoginPage() {
  const { setAuth } = useAuth()
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white">
      {/* ============ LEFT PANEL (blue branding) ============ */}
      <div className="relative lg:w-1/2 bg-gradient-to-br from-[#3b5bdb] via-[#4263eb] to-[#5c7cfa] text-white flex flex-col p-8 sm:p-12 lg:p-16 overflow-hidden">
        {/* Subtle decorative shapes */}
        <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3" />
        <div className="pointer-events-none absolute top-1/2 right-10 h-32 w-32 rounded-full bg-white/5" />

        {/* Top: Logo + System Name */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <Boxes className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-wide leading-tight">DFCL-IT</div>
            <div className="text-xs text-blue-100/80 leading-tight">(Test System)</div>
          </div>
        </div>

        {/* Center: Welcome message */}
        <div className="relative z-10 flex-1 flex flex-col justify-center my-8 lg:my-0">
          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-xs text-blue-50 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
              System Online
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
              Welcome
              <span className="block mt-1">Back.</span>
            </h1>
            <p className="text-blue-100/90 text-base sm:text-lg leading-relaxed mb-6">
              Barcode & Serial-based Stock Management System. Sign in to manage your purchase, inventory, sales and accounts — all in one place.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Purchase', 'Inventory', 'Sales', 'Accounts', 'Reports'].map((m) => (
                <span key={m} className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-xs text-blue-50 font-medium">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: Developer info */}
        <div className="relative z-10 text-sm space-y-1">
          <div className="text-blue-50/90">
            <span className="text-blue-100/70">Idea & Developed by</span>{' '}
            <span className="font-semibold text-white">Abdur Rahman Akash</span>
          </div>
          <a
            href="https://wa.me/8801534955065"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-blue-100/80 hover:text-white transition-colors group"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>WhatsApp & Contact:</span>
            <span className="font-mono font-semibold">01534955065</span>
            <Phone className="h-3 w-3 opacity-70" />
          </a>
        </div>
      </div>

      {/* ============ RIGHT PANEL (login form on white) ============ */}
      <div className="lg:w-1/2 bg-white flex flex-col p-6 sm:p-10 lg:p-16">
        {/* Mobile-only logo at top */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#3b5bdb] to-[#5c7cfa] flex items-center justify-center">
            <Boxes className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 leading-tight">DFCL-IT</div>
            <div className="text-[10px] text-slate-500 leading-tight">(Test System)</div>
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
          {/* User icon */}
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#3b5bdb] to-[#5c7cfa] flex items-center justify-center shadow-lg shadow-blue-200">
              <User className="h-8 w-8 text-white" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Sign In</h2>
            <p className="text-sm text-slate-500">Enter your credentials to continue</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="userId" className="text-xs text-slate-700 font-medium uppercase tracking-wide">User ID</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter your user ID"
                  autoFocus
                  className="pl-10 h-12 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#4263eb] focus:ring-2 focus:ring-blue-100 transition-colors"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password" className="text-xs text-slate-700 font-medium uppercase tracking-wide">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-12 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#4263eb] focus:ring-2 focus:ring-blue-100 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 bg-gradient-to-r from-[#3b5bdb] to-[#4263eb] hover:from-[#3551c4] hover:to-[#3a57d4] text-white font-semibold shadow-md shadow-blue-200 border-0 transition-all"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </div>

        {/* Mobile-only footer */}
        <div className="lg:hidden pt-6 mt-6 border-t border-slate-100 text-center text-xs text-slate-500 space-y-1">
          <div>
            <span className="text-slate-400">Idea & Developed by</span>{' '}
            <span className="font-semibold text-slate-700">Abdur Rahman Akash</span>
          </div>
          <a
            href="https://wa.me/8801534955065"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#3b5bdb]"
          >
            <MessageCircle className="h-3 w-3" />
            <span>WhatsApp & Contact: 01534955065</span>
          </a>
        </div>
      </div>
    </div>
  )
}
