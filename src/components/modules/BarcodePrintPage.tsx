'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { PageHeader, EmptyState, Badge } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ComboBox } from '@/components/ui/combobox'
import { AsyncComboBox } from '@/components/ui/async-combobox'
import { Printer, Search, ScanLine, Package, X, Loader2 } from 'lucide-react'
import { list } from '@/lib/api'
import { toast } from 'sonner'

type SearchResult = {
  id: string
  itemName: string
  itemCode: string
  barcode: string
  serialNumber: string
  qty: number
  uom: string
  entity: string
  status: string
  purchaseNo: string
  receiveNo: string
  createdAt: string
}

export function BarcodePrintPage() {
  const [searchType, setSearchType] = useState<'purchase' | 'item' | 'barcode' | 'serial'>('purchase')
  const [purchaseNo, setPurchaseNo] = useState('')
  const [itemId, setItemId] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [serialInput, setSerialInput] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // Selected rows for printing
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Print preview
  const [printOpen, setPrintOpen] = useState(false)

  const doSearch = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    setSelected(new Set())
    try {
      const params = new URLSearchParams({ searchType })
      if (searchType === 'purchase' && purchaseNo) params.set('purchaseNo', purchaseNo)
      if (searchType === 'item' && itemId) params.set('itemId', itemId)
      if (searchType === 'barcode' && barcodeInput) params.set('barcode', barcodeInput)
      if (searchType === 'serial' && serialInput) params.set('serial', serialInput)

      const res = await fetch(`/api/barcode-search?${params}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Search failed')
      }
      const data = await res.json()
      setResults(data)
      if (data.length === 0) {
        toast.info('No barcodes found matching your search')
      } else {
        // Auto-select all by default
        setSelected(new Set(data.map((r: SearchResult) => r.id)))
        toast.success(`Found ${data.length} barcode(s)`)
      }
    } catch (e: any) {
      toast.error(e.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [searchType, purchaseNo, itemId, barcodeInput, serialInput])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === results.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(results.map((r) => r.id)))
    }
  }

  const selectedResults = useMemo(() => {
    return results.filter((r) => selected.has(r.id))
  }, [results, selected])

  const handlePrint = () => {
    if (selectedResults.length === 0) {
      toast.error('Select at least one barcode to print')
      return
    }
    setPrintOpen(true)
  }

  const searchTypeOptions = [
    { value: 'purchase', label: 'By Purchase ID' },
    { value: 'item', label: 'By Item' },
    { value: 'barcode', label: 'By Barcode Number' },
    { value: 'serial', label: 'By Serial Number' },
  ]

  return (
    <div>
      <PageHeader title="Barcode Print" description="Search and print barcodes by Purchase ID, Item, Barcode Number, or Serial Number" />

      {/* Search Panel */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold">Search By:</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Search type selector */}
            <div>
              <Label className="text-xs">Search Type</Label>
              <div className="mt-1">
                <ComboBox
                  value={searchType}
                  onChange={(v) => { setSearchType(v as any); setResults([]); setSearched(false) }}
                  options={searchTypeOptions}
                  placeholder="Select search type"
                />
              </div>
            </div>

            {/* Search input — changes based on type */}
            {searchType === 'purchase' && (
              <div className="lg:col-span-2">
                <Label className="text-xs">Purchase ID (e.g. PUR-260707-01-0000001)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={purchaseNo}
                    onChange={(e) => setPurchaseNo(e.target.value)}
                    placeholder="Type Purchase ID..."
                    className="font-mono text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                  />
                  <Button onClick={doSearch} disabled={loading || !purchaseNo} className="gap-1">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </Button>
                </div>
              </div>
            )}

            {searchType === 'item' && (
              <div className="lg:col-span-2">
                <Label className="text-xs">Select Item</Label>
                <div className="flex gap-2 mt-1">
                  <div className="flex-1">
                    <AsyncComboBox
                      slug="items"
                      value={itemId}
                      onChange={setItemId}
                      placeholder="Search item to print barcodes for..."
                    />
                  </div>
                  <Button onClick={doSearch} disabled={loading || !itemId} className="gap-1">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </Button>
                </div>
              </div>
            )}

            {searchType === 'barcode' && (
              <div className="lg:col-span-2">
                <Label className="text-xs">Barcode Number</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Type barcode number (e.g. 2607070288025)..."
                    className="font-mono text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                  />
                  <Button onClick={doSearch} disabled={loading || !barcodeInput} className="gap-1">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </Button>
                </div>
              </div>
            )}

            {searchType === 'serial' && (
              <div className="lg:col-span-2">
                <Label className="text-xs">Serial Number</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={serialInput}
                    onChange={(e) => setSerialInput(e.target.value)}
                    placeholder="Type serial number (e.g. SN001)..."
                    className="font-mono text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                  />
                  <Button onClick={doSearch} disabled={loading || !serialInput} className="gap-1">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      {loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Searching...</CardContent></Card>
      ) : searched && results.length === 0 ? (
        <EmptyState title="No barcodes found" hint="Try a different search criteria" />
      ) : results.length > 0 ? (
        <>
          {/* Action bar */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={toggleSelectAll} className="gap-1">
              {selected.size === results.length ? 'Deselect All' : 'Select All'}
            </Button>
            <span className="text-xs text-muted-foreground">
              {selected.size} of {results.length} selected
            </span>
            <Button onClick={handlePrint} disabled={selected.size === 0} className="gap-1 ml-auto bg-blue-600 hover:bg-blue-700">
              <Printer className="h-4 w-4" /> Print Selected ({selected.size})
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={selected.size === results.length && results.length > 0}
                          onChange={toggleSelectAll}
                          className="h-4 w-4"
                        />
                      </TableHead>
                      <TableHead>Sl</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Barcode Number</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>UoM</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Purchase ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r, i) => (
                      <TableRow key={r.id} className={selected.has(r.id) ? 'bg-blue-50/50' : ''}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selected.has(r.id)}
                            onChange={() => toggleSelect(r.id)}
                            className="h-4 w-4"
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>
                          <div className="text-xs font-medium">{r.itemName}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{r.itemCode}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.barcode || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{r.serialNumber || '—'}</TableCell>
                        <TableCell className="text-xs text-right font-medium">{r.qty}</TableCell>
                        <TableCell className="text-xs">{r.uom}</TableCell>
                        <TableCell className="text-xs">{r.entity}</TableCell>
                        <TableCell><Badge status={r.status} /></TableCell>
                        <TableCell className="font-mono text-[10px]">{r.purchaseNo || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Print Preview Overlay */}
      {printOpen && (
        <PrintPreview
          items={selectedResults}
          onClose={() => setPrintOpen(false)}
        />
      )}
    </div>
  )
}

/**
 * Print Preview — full-screen overlay with print-friendly barcode labels.
 * Each selected item gets a label card showing:
 *   - Item Name
 *   - Barcode Number (as both text and barcode-like lines)
 *   - Serial Number
 *   - Qty
 *
 * Uses a CSS-based barcode representation (vertical lines) so no external
 * barcode library is needed. For actual barcode scanning, the number text
 * is sufficient.
 */
function PrintPreview({ items, onClose }: { items: SearchResult[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto print:relative print:overflow-visible">
      {/* Toolbar */}
      <div className="sticky top-0 bg-white border-b px-4 py-2 flex items-center justify-between print:hidden">
        <h2 className="text-sm font-semibold">Barcode Print Preview — {items.length} label(s)</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Barcode labels grid */}
      <div className="p-6 print:p-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 print:grid-cols-3">
          {items.map((item, i) => (
            <BarcodeLabel key={i} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Individual barcode label — shows item name, barcode, serial, qty.
 * The barcode is rendered as CSS vertical lines (visual representation).
 * The actual barcode number is also printed as text below the lines.
 */
function BarcodeLabel({ item }: { item: SearchResult }) {
  // Generate a pseudo-barcode visual from the barcode number.
  // Each digit maps to a pattern of vertical lines of varying widths.
  const barcodeLines = useMemo(() => {
    if (!item.barcode) return []
    const lines: Array<{ width: number; black: boolean }> = []
    // Start guard
    lines.push({ width: 2, black: true })
    lines.push({ width: 1, black: false })
    // Each character → 3 lines (black, white, black) with varying widths
    for (const ch of item.barcode) {
      const code = ch.charCodeAt(0)
      const w1 = (code % 3) + 1
      const w2 = ((code >> 2) % 3) + 1
      const w3 = ((code >> 4) % 3) + 1
      lines.push({ width: w1, black: true })
      lines.push({ width: w2, black: false })
      lines.push({ width: w3, black: true })
    }
    // End guard
    lines.push({ width: 1, black: false })
    lines.push({ width: 2, black: true })
    return lines
  }, [item.barcode])

  return (
    <div className="border-2 border-black rounded p-2 print:break-inside-avoid" style={{ minHeight: '120px' }}>
      {/* Item Name */}
      <div className="text-[10px] font-bold text-center truncate mb-1" title={item.itemName}>
        {item.itemName}
      </div>

      {/* Barcode visual */}
      <div className="flex items-end justify-center h-12 mb-1">
        {barcodeLines.length > 0 ? (
          <div className="flex items-end h-full">
            {barcodeLines.map((line, i) => (
              <div
                key={i}
                style={{
                  width: `${line.width}px`,
                  height: '100%',
                  backgroundColor: line.black ? '#000' : 'transparent',
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground">No barcode</div>
        )}
      </div>

      {/* Barcode number */}
      <div className="text-[9px] font-mono text-center font-bold mb-1">
        {item.barcode || '—'}
      </div>

      {/* Serial Number */}
      {item.serialNumber && (
        <div className="text-[8px] text-center text-muted-foreground">
          SN: <span className="font-mono">{item.serialNumber}</span>
        </div>
      )}

      {/* Qty + UoM */}
      <div className="text-[8px] text-center mt-1">
        Qty: <span className="font-bold">{item.qty}</span> {item.uom}
      </div>
    </div>
  )
}
