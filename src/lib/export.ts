'use client'
// Excel (CSV) + PDF export utilities

// Export an array of objects to CSV (opens in Excel)
export function exportToCSV(filename: string, rows: any[], columns?: { key: string; label: string }[]) {
  if (!rows || rows.length === 0) {
    alert('No data to export')
    return
  }
  const cols = columns || Object.keys(rows[0]).map((k) => ({ key: k, label: k }))
  const header = cols.map((c) => `"${c.label}"`).join(',')
  const body = rows.map((r) =>
    cols.map((c) => {
      let v = r[c.key]
      if (v === null || v === undefined) v = ''
      if (typeof v === 'object') v = JSON.stringify(v)
      v = String(v).replace(/"/g, '""')
      return `"${v}"`
    }).join(',')
  ).join('\n')
  const csv = '\uFEFF' + header + '\n' + body  // BOM for Excel UTF-8
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Export to PDF using the browser's print dialog (opens a styled window)
export function exportToPDF(title: string, rows: any[], columns?: { key: string; label: string }[]) {
  if (!rows || rows.length === 0) {
    alert('No data to export')
    return
  }
  const cols = columns || Object.keys(rows[0]).map((k) => ({ key: k, label: k }))
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) {
    alert('Please allow popups to export PDF')
    return
  }
  const now = new Date().toLocaleString()
  const tableRows = rows.map((r) =>
    `<tr>${cols.map((c) => {
      let v = r[c.key]
      if (v === null || v === undefined) v = ''
      if (typeof v === 'object') v = ''
      v = String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      return `<td>${v}</td>`
    }).join('')}</tr>`
  ).join('')
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        * { box-sizing: border-box; font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; }
        body { margin: 24px; color: #1a1a1a; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #1a1a1a; padding-bottom: 8px; }
        .logo { font-size: 18px; font-weight: bold; }
        .meta { font-size: 11px; color: #666; text-align: right; }
        h1 { font-size: 16px; margin: 12px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #1a1a1a; color: white; padding: 6px 8px; text-align: left; }
        td { padding: 5px 8px; border-bottom: 1px solid #e5e5e5; }
        tr:nth-child(even) { background: #f9f9f9; }
        .footer { margin-top: 24px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">📊 InventoryPro</div>
        <div class="meta">Generated: ${now}</div>
      </div>
      <h1>${title}</h1>
      <p style="font-size: 11px; color: #666;">Total records: ${rows.length}</p>
      <table>
        <thead><tr>${cols.map((c) => `<th>${c.label}</th>`).join('')}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div class="footer">InventoryPro © 2026 — Barcode & Serial-based Stock Management System</div>
      <div class="no-print" style="margin-top: 24px; text-align: center;">
        <button onclick="window.print()" style="padding: 8px 16px; background: #1a1a1a; color: white; border: none; border-radius: 4px; cursor: pointer;">🖨️ Print / Save as PDF</button>
      </div>
    </body>
    </html>
  `)
  win.document.close()
  // Auto-trigger print after a brief delay
  setTimeout(() => { win.focus(); win.print() }, 500)
}
