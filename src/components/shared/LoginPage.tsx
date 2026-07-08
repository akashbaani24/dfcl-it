'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-store'
import { Loader2, Lock, User, Boxes, MessageCircle, Phone, Eye, EyeOff, KeyRound, X, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export function LoginPage() {
  const { setAuth } = useAuth()
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [customImage, setCustomImage] = useState<string | null>(null)

  // Forgot Password dialog state
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotUserId, setForgotUserId] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null)

  // Admin messages for the current userId (if any resolved password reset
  // requests exist). We fetch these on userId blur so the user sees the
  // admin's reply ("Your new password is xyz") without having to log in.
  const [adminMessages, setAdminMessages] = useState<Array<{ requestNo: string; message: string; resolvedAt: string }>>([])
  const [showMessages, setShowMessages] = useState(false)

  useEffect(() => {
    fetch('/api/settings?key=loginImage')
      .then(r => r.json())
      .then(data => {
        if (data && data.imageUrl) {
          setCustomImage(data.imageUrl)
        }
      })
      .catch(() => {})
  }, [])

  // When userId changes (on blur), check for admin messages
  const checkAdminMessages = async () => {
    if (!userId.trim()) {
      setAdminMessages([])
      setShowMessages(false)
      return
    }
    try {
      const r = await fetch(`/api/password-reset?userId=${encodeURIComponent(userId.trim())}`)
      const data = await r.json()
      if (data.resolved && data.resolved.length > 0) {
        setAdminMessages(data.resolved)
        setShowMessages(true)
      } else {
        setAdminMessages([])
        setShowMessages(false)
      }
    } catch {
      setAdminMessages([])
      setShowMessages(false)
    }
  }

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

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotUserId.trim()) {
      toast.error('Please enter your User ID')
      return
    }
    setForgotLoading(true)
    try {
      const r = await fetch('/api/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: forgotUserId.trim() }),
      })
      const data = await r.json()
      if (!r.ok) {
        toast.error(data.error || 'Failed to submit request')
        return
      }
      setForgotSuccess(data.requestNo)
      toast.success('Request sent to admin!')
    } catch (e: any) {
      toast.error(e.message || 'Network error')
    } finally {
      setForgotLoading(false)
    }
  }

  const closeForgot = () => {
    setForgotOpen(false)
    setForgotUserId('')
    setForgotSuccess(null)
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">
      {/* ============ LEFT: Image Section (full-height on desktop) ============ */}
      <div
        className="lg:w-1/2 lg:min-h-screen flex flex-col items-center justify-center p-8 lg:p-12 relative"
        style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #4A90D9 60%, #87CEEB 100%)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 h-40 w-40 rounded-full border-2 border-white/10" />
          <div className="absolute top-16 left-16 h-40 w-40 rounded-full border-2 border-white/10" />
          <div className="absolute bottom-20 right-10 h-52 w-52 rounded-full border-2 border-white/10" />
          <div className="absolute bottom-16 right-20 h-52 w-52 rounded-full border-2 border-white/10" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-blue-400/30 blur-3xl rounded-full scale-110" />
            <img
              src={customImage || '/robot-buddy.png'}
              alt="DFCL-IT"
              className="relative z-10 w-56 h-auto sm:w-64 lg:w-80 drop-shadow-2xl rounded-2xl object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/robot-buddy.png'
              }}
            />
          </div>
          <h2 className="text-white text-2xl lg:text-3xl font-bold mb-2 drop-shadow-lg">
            DFCL-IT
          </h2>
          <p className="text-blue-100 text-sm lg:text-base">
            Barcode &amp; Serial-based Stock Management System
          </p>
          <p className="text-blue-200/70 text-xs mt-4 hidden lg:block">
            Idea &amp; Developed by{' '}
            <span className="text-white font-semibold">Abdur Rahman Akash</span>
          </p>
          <a
            href="https://wa.me/8801534955065"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-blue-200/80 hover:text-white text-xs transition-colors"
          >
            <MessageCircle className="h-3 w-3" />
            WhatsApp: 01534955065
            <Phone className="h-3 w-3 opacity-70" />
          </a>
        </div>
      </div>

      {/* ============ RIGHT: Login Form Section ============ */}
      <div className="lg:w-1/2 lg:min-h-screen flex items-center justify-center p-6 sm:p-10 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Avatar / Logo */}
          <div className="flex justify-center mb-5">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/20">
              <Boxes className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Welcome text */}
          <div className="text-center mb-6">
            <h2 className="text-slate-900 text-2xl font-bold mb-1">Welcome Back!</h2>
            <p className="text-slate-500 text-sm">Sign in to your account</p>
          </div>

          {/* Admin message banner (if any resolved password reset request) */}
          {showMessages && adminMessages.length > 0 && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-emerald-800 mb-1">
                    Admin reply for your account:
                  </p>
                  {adminMessages.map((m, i) => (
                    <div key={i} className="text-xs text-emerald-700 mb-1 last:mb-0">
                      <p className="font-medium">{m.message}</p>
                      <p className="text-[10px] text-emerald-600 mt-0.5">
                        {m.requestNo} · {new Date(m.resolvedAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowMessages(false)}
                  className="text-emerald-400 hover:text-emerald-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="userId" className="block text-xs font-medium text-slate-700 mb-1.5">
                User ID
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="userId"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  onBlur={checkAdminMessages}
                  placeholder="Enter your User ID"
                  autoFocus
                  className="w-full pl-10 pr-3 h-11 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 h-11 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Forgot password link */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
              >
                <KeyRound className="h-3 w-3" />
                Forgot Password?
              </button>
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
        </div>
      </div>

      {/* ============ FORGOT PASSWORD DIALOG ============ */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                  <KeyRound className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Forgot Password</h3>
              </div>
              <button
                type="button"
                onClick={closeForgot}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              {forgotSuccess ? (
                // Success state
                <div className="text-center py-4">
                  <div className="h-14 w-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                  </div>
                  <h4 className="text-base font-semibold text-slate-900 mb-1">Request Sent!</h4>
                  <p className="text-xs text-slate-500 mb-3">
                    Your password reset request has been sent to the admin.
                  </p>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 mb-4">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Your Request No</p>
                    <p className="text-sm font-mono font-semibold text-slate-900">{forgotSuccess}</p>
                  </div>
                  <p className="text-xs text-slate-600 mb-4">
                    Please contact the admin (WhatsApp: 01534955065) to get your new password.
                    When the admin resets it, you&apos;ll see a message here on your next login.
                  </p>
                  <button
                    type="button"
                    onClick={closeForgot}
                    className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors"
                  >
                    Got it
                  </button>
                </div>
              ) : (
                // Form state
                <form onSubmit={submitForgot} className="space-y-4">
                  <p className="text-xs text-slate-600">
                    Enter your User ID below. A reset request will be sent to the admin.
                    The admin will reset your password and send you a reply — you&apos;ll see
                    it here on your next login.
                  </p>
                  <div>
                    <label htmlFor="forgotUserId" className="block text-xs font-medium text-slate-700 mb-1.5">
                      User ID
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="forgotUserId"
                        type="text"
                        value={forgotUserId}
                        onChange={(e) => setForgotUserId(e.target.value)}
                        placeholder="Enter your User ID"
                        autoFocus
                        className="w-full pl-10 pr-3 h-11 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={closeForgot}
                      className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {forgotLoading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                      ) : (
                        'Send Request'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
