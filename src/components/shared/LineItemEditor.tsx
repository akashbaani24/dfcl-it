'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Plus, Trash2, ScanLine } from 'lucide-react'
import { list } from '@/lib/api'

export type LineItem = {
  id: string
  itemId: string
  itemName: string
  hasSerial: boolean
  quantity: number
  unitPrice: number
  totalPrice: number
  serials: string  // comma-separated
}

export function LineItemEditor({
  items,
  value,
  onChange,
  showSerials = true,
  showPrice = true,
  stockEntityId,
}: {
  items: any[]
  value: LineItem[]
  onChange: (v: LineItem[]) => void
  showSerials?: boolean
  showPrice?: boolean
  stockEntityId?: string  // when set, validate that serials are in this entity (for sales)
}) {
  const [newItemId, setNewItemId] = useState('')

  const addLine = () => {
    if (!newItemId) return
    const item = items.find((i) => i.id === newItemId)
    if (!item) return
    if (value.some((l) => l.itemId === newItemId)) return
    const newLine: LineItem = {
      id: Math.random().toString(36).slice(2),
      itemId: item.id,
      itemName: item.name,
      hasSerial: item.hasSerial,
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      serials: '',
    }
    onChange([...value, newLine])
    setNewItemId('')
  }

  const updateLine = (id: string, patch: Partial<LineItem>) => {
    onChange(value.map((l) => {
      if (l.id !== id) return l
      const updated = { ...l, ...patch }
      if (patch.quantity !== undefined || patch.unitPrice !== undefined) {
        updated.totalPrice = (updated.quantity || 0) * (updated.unitPrice || 0)
      }
      // Auto-set quantity from serials count if hasSerial
      if (updated.hasSerial && patch.serials !== undefined) {
        const serialCount = patch.serials.split(',').map((s) => s.trim()).filter(Boolean).length
        if (serialCount > 0) {
          updated.quantity = serialCount
          updated.totalPrice = updated.quantity * (updated.unitPrice || 0)
        }
      }
      return updated
    }))
  }

  const removeLine = (id: string) => {
    onChange(value.filter((l) => l.id !== id))
  }

  const totalAmount = value.reduce((s, l) => s + (l.totalPrice || 0), 0)

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-xs">Add Item</Label>
          <Select value={newItemId} onValueChange={setNewItemId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select item to add..." />
            </SelectTrigger>
            <SelectContent>
              {items.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.name} ({i.itemCode}) {i.hasSerial && '— Serial Tracking'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={addLine} size="sm" disabled={!newItemId} className="gap-1">
          <Plus className="h-4 w-4" /> Add Line
        </Button>
      </div>

      {value.length > 0 && (
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Item</TableHead>
                {showSerials && <TableHead className="min-w-[260px]">Serial Numbers (comma separated)</TableHead>}
                <TableHead className="w-20">Qty</TableHead>
                {showPrice && <TableHead className="w-28">Unit Price</TableHead>}
                {showPrice && <TableHead className="w-28">Total</TableHead>}
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {value.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{l.itemName}</div>
                    {l.hasSerial && (
                      <div className="text-[10px] text-emerald-700 flex items-center gap-1 mt-0.5">
                        <ScanLine className="h-3 w-3" /> Serial required
                      </div>
                    )}
                  </TableCell>
                  {showSerials && (
                    <TableCell>
                      {l.hasSerial ? (
                        <Input
                          value={l.serials}
                          onChange={(e) => updateLine(l.id, { serials: e.target.value })}
                          placeholder="SN001, SN002, SN003..."
                          className="font-mono text-xs"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">— (bulk item)</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <Input
                      type="number"
                      value={l.quantity}
                      onChange={(e) => updateLine(l.id, { quantity: Number(e.target.value) })}
                      disabled={l.hasSerial && showSerials}
                      className="w-20"
                    />
                  </TableCell>
                  {showPrice && (
                    <TableCell>
                      <Input
                        type="number"
                        value={l.unitPrice}
                        onChange={(e) => updateLine(l.id, { unitPrice: Number(e.target.value) })}
                        className="w-28"
                      />
                    </TableCell>
                  )}
                  {showPrice && (
                    <TableCell className="font-medium">{l.totalPrice.toFixed(2)}</TableCell>
                  )}
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(l.id)} className="h-7 w-7 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {showPrice && (
        <div className="flex justify-end">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Total Amount</div>
            <div className="text-lg font-bold">{totalAmount.toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
