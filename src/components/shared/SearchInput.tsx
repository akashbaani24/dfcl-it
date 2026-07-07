'use client'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { useState, useEffect } from 'react'

// Debounced search input — reusable across all pages.
// 200ms debounce — feels instant to the user while still batching rapid
// keystrokes (avoids hammering the server on every character).
// Previous value was 400ms which felt sluggish; 200ms is the sweet spot
// used by most modern typeahead UIs (GitHub, Linear, Slack, etc.).
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const [local, setLocal] = useState(value)

  // Sync external value changes
  useEffect(() => {
    setLocal(value)
  }, [value])

  // Debounce 200ms — feels instant, still batches rapid typing
  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== value) onChange(local)
    }, 200)
    return () => clearTimeout(t)
  }, [local])

  return (
    <div className={`relative ${className}`}>
      <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="pl-8 pr-8 h-9 w-44 sm:w-64"
      />
      {local && (
        <button
          onClick={() => { setLocal(''); onChange('') }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
