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
          {/* Mobile: smaller robot, Desktop: full size */}
          <div className="scale-75 lg:scale-100 origin-center">
            <RobotIllustration />
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

// ============ Robot Illustration (SVG) ============
function RobotIllustration() {
  return (
    <div className="relative">
      {/* Glow behind robot */}
      <div className="absolute inset-0 bg-blue-400/20 blur-3xl rounded-full scale-150" />

      {/* Speech bubble */}
      <div className="absolute -top-8 -right-4 bg-white rounded-2xl px-4 py-2 shadow-lg z-10">
        <p className="text-slate-700 text-xs font-medium whitespace-nowrap">Hello, I'm your buddy! 👋</p>
        <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white rotate-45" />
      </div>

      <svg
        width="280"
        height="320"
        viewBox="0 0 280 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 drop-shadow-2xl"
      >
        <defs>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id="headGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="screenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#1E40AF" />
          </radialGradient>
        </defs>

        {/* Antenna */}
        <line x1="140" y1="20" x2="140" y2="50" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
        <circle cx="140" cy="16" r="6" fill="#60A5FA">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* Head */}
        <rect x="90" y="50" width="100" height="85" rx="20" fill="url(#headGrad)" stroke="#1E40AF" strokeWidth="2" />

        {/* Face screen */}
        <rect x="105" y="65" width="70" height="55" rx="12" fill="url(#screenGrad)" />

        {/* Left eye */}
        <circle cx="125" cy="88" r="8" fill="url(#eyeGlow)">
          <animate attributeName="r" values="8;7;8" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="127" cy="86" r="3" fill="white" opacity="0.9" />

        {/* Right eye */}
        <circle cx="155" cy="88" r="8" fill="url(#eyeGlow)">
          <animate attributeName="r" values="8;7;8" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="157" cy="86" r="3" fill="white" opacity="0.9" />

        {/* Smile */}
        <path d="M125 105 Q140 112 155 105" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Ears */}
        <rect x="80" y="80" width="12" height="25" rx="6" fill="#3B82F6" />
        <rect x="188" y="80" width="12" height="25" rx="6" fill="#3B82F6" />

        {/* Neck */}
        <rect x="130" y="135" width="20" height="12" fill="#1E40AF" rx="2" />

        {/* Body */}
        <rect x="85" y="147" width="110" height="105" rx="18" fill="url(#bodyGrad)" stroke="#1E40AF" strokeWidth="2" />

        {/* Chest panel / glowing core */}
        <circle cx="140" cy="190" r="20" fill="#0F172A" stroke="#3B82F6" strokeWidth="2" />
        <circle cx="140" cy="190" r="14" fill="#60A5FA" opacity="0.3">
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="140" cy="190" r="8" fill="#93C5FD">
          <animate attributeName="r" values="8;10;8" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* Body buttons */}
        <circle cx="115" cy="225" r="3" fill="#93C5FD" opacity="0.7" />
        <circle cx="140" cy="228" r="3" fill="#93C5FD" opacity="0.7" />
        <circle cx="165" cy="225" r="3" fill="#93C5FD" opacity="0.7" />

        {/* Left arm (waving) */}
        <g>
          <rect x="55" y="160" width="28" height="12" rx="6" fill="#3B82F6">
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 70 166; -20 70 166; 0 70 166"
              dur="2s"
              repeatCount="indefinite"
            />
          </rect>
          <circle cx="50" cy="155" r="12" fill="#60A5FA">
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 70 166; -20 70 166; 0 70 166"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
        </g>

        {/* Right arm */}
        <rect x="197" y="170" width="28" height="12" rx="6" fill="#3B82F6" />
        <circle cx="230" cy="176" r="12" fill="#60A5FA" />

        {/* Legs */}
        <rect x="105" y="252" width="22" height="40" rx="8" fill="#1E40AF" />
        <rect x="153" y="252" width="22" height="40" rx="8" fill="#1E40AF" />

        {/* Feet */}
        <ellipse cx="116" cy="296" rx="18" ry="8" fill="#1E3A8A" />
        <ellipse cx="164" cy="296" rx="18" ry="8" fill="#1E3A8A" />

        {/* Shadow */}
        <ellipse cx="140" cy="312" rx="60" ry="6" fill="#000000" opacity="0.2" />
      </svg>
    </div>
  )
}
