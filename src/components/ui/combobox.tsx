'use client'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export type ComboOption = { value: string; label: string; sublabel?: string }

export function ComboBox({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  options: ComboOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

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
      <PopoverContent className="p-0 min-w-[300px]" align="start">
        <Command>
          <CommandInput placeholder="Type to search..." className="h-9" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label + ' ' + (option.sublabel || '')}
                  onSelect={() => {
                    onChange(option.value === value ? '' : option.value)
                    setOpen(false)
                  }}
                  className="py-2"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === option.value ? 'opacity-100' : 'opacity-0'
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
