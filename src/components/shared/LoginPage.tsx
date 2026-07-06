'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-store'
import { Loader2, Lock, User, Boxes, MessageCircle, Phone, Eye, EyeOff } from 'lucide-react'
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6"
      style={{
        background: 'linear-gradient(180deg, #87CEEB 0%, #4A90D9 50%, #1E3A8A 100%)',
      }}
    >
      {/* Decorative floating circles */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 h-40 w-40 rounded-full border-2 border-white/10" />
        <div className="absolute top-10 left-16 h-40 w-40 rounded-full border-2 border-white/10" />
        <div className="absolute bottom-20 right-10 h-52 w-52 rounded-full border-2 border-white/10" />
        <div className="absolute bottom-16 right-20 h-52 w-52 rounded-full border-2 border-white/10" />
      </div>

      {/* Main container: two columns on desktop, stacked on mobile */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-center">

        {/* ============ LEFT: Robot Illustration ============ */}
        <div className="flex flex-col items-center justify-center order-1 lg:order-1">
          {/* Robot image — user's provided image */}
          <div className="relative">
            {/* Glow behind robot */}
            <div className="absolute inset-0 bg-blue-400/20 blur-3xl rounded-full scale-110" />
            <img
              src="/robot-buddy.png"
              alt="DFCL-IT Buddy Robot"
              className="relative z-10 w-56 h-auto sm:w-64 lg:w-80 drop-shadow-2xl rounded-2xl"
            />
          </div>
          <div className="mt-4 lg:mt-6 text-center">
            <h2 className="text-white text-xl lg:text-2xl font-bold mb-1 lg:mb-2 drop-shadow-lg">
              DFCL-IT
            </h2>
            <p className="text-blue-100 text-xs lg:text-sm max-w-xs hidden sm:block">
              Barcode & Serial-based Stock Management System — your smart inventory buddy!
            </p>
          </div>
        </div>

        {/* ============ RIGHT: Login Card ============ */}
        <div className="w-full max-w-md mx-auto order-2 lg:order-2">
          <div className="bg-[#0F172A] rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-700/50">
            {/* Avatar / Logo */}
            <div className="flex justify-center mb-5">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/20">
                <Boxes className="h-8 w-8 text-white" />
              </div>
            </div>

            {/* Welcome text */}
            <div className="text-center mb-6">
              <h2 className="text-white text-xl font-bold mb-1">Welcome Back!</h2>
              <p className="text-slate-400 text-sm">Sign in to your account</p>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="space-y-4">
              {/* User ID */}
              <div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="userId"
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Enter your User ID"
                    autoFocus
                    className="w-full pl-10 pr-3 h-11 bg-[#1E293B] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 h-11 bg-[#1E293B] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Sign In button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-600/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-slate-500 text-xs">or</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            {/* Developer info */}
            <div className="text-center space-y-1">
              <p className="text-slate-400 text-xs">
                Idea & Developed by{' '}
                <span className="text-blue-400 font-semibold">Abdur Rahman Akash</span>
              </p>
              <a
                href="https://wa.me/8801534955065"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-emerald-400 text-xs transition-colors"
              >
                <MessageCircle className="h-3 w-3" />
                WhatsApp & Contact: 01534955065
                <Phone className="h-3 w-3 opacity-70" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

