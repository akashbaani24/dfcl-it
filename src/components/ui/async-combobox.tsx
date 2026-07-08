'use client'
// AsyncComboBox — server-side typeahead dropdown for large datasets.
//
// WHY THIS EXISTS
// ---------------
// The regular ComboBox loads ALL options upfront and filters client-side.
// That's instant for ~100 items but becomes slow with thousands of items
// (heavy initial fetch + 10k DOM nodes = laggy dropdown).
//
// AsyncComboBox instead:
//   1. Fetches only the first batch (20 items) when the dropdown opens.
//   2. As the user types, fetches matching items from /api/search (200ms
//      debounce) — so only ~20 items are ever in the DOM.
//   3. Shows cached results INSTANTLY while the new query is in-flight
//      (stale-while-revalidate pattern — feels zero-latency).
//   4. Shows a tiny loading spinner during fetches.
//
// WHEN TO USE
// -----------
// Use AsyncComboBox for resources that can grow large: items, suppliers,
// employees, customers, entities. Use the regular ComboBox for small
// fixed lists (e.g. status, type, UoM if <50).
//
// PROPS
// -----
//   slug        — the search slug registered in /api/search (e.g. 'items')
//   value       — currently selected id
//   onChange     — callback with selected id
//   placeholder — input placeholder
//   disabled    — disable the trigger
//   initialLabel— if you already know the label for `value` (e.g. when
//                  editing), pass it here so we don't need to fetch it
//                  on mount. Otherwise we'll resolve it from the slug.
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect, useRef, useCallback } from 'react'

export type AsyncComboOption = { id: string; label: string; sublabel?: string }

type Props = {
  slug: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  // Optional: pre-resolved label for the current value (avoids a fetch on mount)
  initialLabel?: string
  initialSublabel?: string
}

export function AsyncComboBox({
  slug,
  value,
  onChange,
  placeholder = 'Search...',
  className,
  disabled = false,
  initialLabel,
  initialSublabel,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<AsyncComboOption[]>([])
  const [loading, setLoading] = useState(false)
  // The currently-selected option's display info (so the trigger button shows
  // the right label even before the dropdown is opened)
  const [selected, setSelected] = useState<{ label: string; sublabel?: string } | null>(
    initialLabel ? { label: initialLabel, sublabel: initialSublabel } : null
  )

  // Cache: query string → results. Prevents refetching the same query when
  // the user types and then backspaces. Also used for stale-while-revalidate.
  const cacheRef = useRef<Map<string, AsyncComboOption[]>>(new Map())
  // Track the current in-flight request so we can ignore stale responses
  const reqIdRef = useRef(0)

  // Resolve the label for the current value on mount (if not provided)
  useEffect(() => {
    if (!value || selected) return
    // Try to find it in the initial fetch
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(`/api/search?slug=${slug}&limit=100`)
        if (!r.ok) return
        const data: any[] = await r.json()
        if (cancelled) return
        const found = data.find((d) => d.id === value)
        if (found) setSelected({ label: found.label, sublabel: found.sublabel })
        // Stash these as the empty-query cache so opening the dropdown is instant
        cacheRef.current.set('', data)
      } catch {}
    })()
    return () => { cancelled = true }
  }, [value, slug, selected])

  // Fetch function with stale-while-revalidate pattern
  const fetchOptions = useCallback(async (q: string) => {
    // Check cache first — if we have a result for this exact query, show it
    // instantly while we fetch a fresh copy in the background.
    const cached = cacheRef.current.get(q)
    if (cached) {
      setOptions(cached)
    }

    // If query is empty AND we already have cached results, no need to refetch
    if (!q && cached) {
      return
    }

    setLoading(true)
    const myReqId = ++reqIdRef.current
    try {
      const url = `/api/search?slug=${slug}${q ? `&q=${encodeURIComponent(q)}` : ''}&limit=20`
      const r = await fetch(url)
      if (!r.ok) return
      const data: AsyncComboOption[] = await r.json()
      // Only apply if this is still the latest request (ignore stale responses)
      if (myReqId !== reqIdRef.current) return
      setOptions(data)
      cacheRef.current.set(q, data)
    } catch {
      // Network error — keep showing cached results if any
    } finally {
      if (myReqId === reqIdRef.current) setLoading(false)
    }
  }, [slug])

  // Debounced fetch on query change (200ms — feels instant)
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      fetchOptions(query)
    }, 200)
    return () => clearTimeout(t)
  }, [query, open, fetchOptions])

  // Initial fetch when dropdown opens
  useEffect(() => {
    if (open && options.length === 0 && !loading) {
      fetchOptions('')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal h-10', !selected && 'text-muted-foreground', className)}
        >
          <span className="truncate text-left">
            {selected ? (
              <span className="flex items-center gap-2">
                <span>{selected.label}</span>
                {selected.sublabel && (
                  <span className="text-xs text-muted-foreground font-mono">({selected.sublabel})</span>
                )}
              </span>
            ) : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 min-w-[320px]" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Type to search..."
              className="h-9"
              value={query}
              onValueChange={setQuery}
            />
            {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
          </div>
          <CommandList>
            {options.length === 0 && !loading ? (
              <CommandEmpty>
                {query ? `No matches for "${query}"` : 'Start typing to search...'}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={() => {
                      const newVal = option.id === value ? '' : option.id
                      onChange(newVal)
                      if (newVal) {
                        setSelected({ label: option.label, sublabel: option.sublabel })
                      } else {
                        setSelected(null)
                      }
                      setOpen(false)
                      setQuery('')
                    }}
                    className="py-2"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value === option.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="flex items-center gap-2 flex-1">
                      <span className="font-medium">{option.label}</span>
                      {option.sublabel && (
                        <span className="text-xs text-muted-foreground font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {option.sublabel}
                        </span>
                      )}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          {options.length > 0 && (
            <div className="px-3 py-1.5 border-t text-[10px] text-muted-foreground flex items-center justify-between">
              <span>{options.length} result{options.length !== 1 ? 's' : ''}{query && ` for "${query}"`}</span>
              <span>Type to refine · 200ms debounce</span>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
