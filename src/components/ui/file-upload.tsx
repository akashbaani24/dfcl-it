'use client'
// Reusable file attachment component.
// - Single mode: one image/file (e.g. user photo)
// - Multiple mode: multiple files (e.g. purchase receipts, expense bills)
//
// Files are stored as base64 data URLs in the database (no external storage
// needed). This keeps the system simple and self-contained.
//
// Usage:
//   <FileUpload
//     value={photo}  // single mode: string | null
//     onChange={setPhoto}
//     label="User Photo"
//     accept="image/*"
//   />
//   <FileUpload
//     multiple
//     value={attachments}  // multiple mode: string[] (array of data URLs)
//     onChange={setAttachments}
//     label="Attachments"
//     accept="image/*,.pdf"
//   />
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  value: string | string[] | null
  onChange: (v: string | string[] | null) => void
  label?: string
  accept?: string
  multiple?: boolean
  maxSizeMB?: number
  className?: string
}

export function FileUpload({
  value,
  onChange,
  label = 'Attach File',
  accept = 'image/*',
  multiple = false,
  maxSizeMB = 5,
  className = '',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  const files: string[] = multiple
    ? (Array.isArray(value) ? value : value ? [value] : [])
    : (value ? (Array.isArray(value) ? value : [value]) : [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected || selected.length === 0) return

    setLoading(true)
    const newFiles: string[] = []
    let processed = 0

    Array.from(selected).forEach((file) => {
      // Check size
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`${file.name} is too large (max ${maxSizeMB}MB)`)
        processed++
        if (processed === selected.length) {
          setLoading(false)
        }
        return
      }

      // Convert to base64 data URL
      const reader = new FileReader()
      reader.onload = () => {
        newFiles.push(reader.result as string)
        processed++
        if (processed === selected.length) {
          if (multiple) {
            onChange([...files, ...newFiles])
          } else {
            onChange(newFiles[0] || null)
          }
          setLoading(false)
          toast.success(`${newFiles.length} file(s) attached`)
        }
      }
      reader.onerror = () => {
        toast.error(`Failed to read ${file.name}`)
        processed++
        if (processed === selected.length) {
          setLoading(false)
        }
      }
      reader.readAsDataURL(file)
    })

    // Reset input so the same file can be selected again
    if (inputRef.current) inputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    if (multiple) {
      const updated = files.filter((_, i) => i !== index)
      onChange(updated)
    } else {
      onChange(null)
    }
  }

  const isImage = (dataUrl: string) => dataUrl.startsWith('data:image')

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="gap-1"
      >
        {loading ? (
          <>
            <Upload className="h-4 w-4 animate-pulse" /> Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" /> {label}
          </>
        )}
      </Button>

      {/* Preview — single mode */}
      {!multiple && files.length > 0 && (
        <div className="mt-2 relative inline-block">
          {isImage(files[0]) ? (
            <img
              src={files[0]}
              alt="Preview"
              className="h-24 w-24 object-cover rounded-md border"
            />
          ) : (
            <div className="h-24 w-24 flex items-center justify-center rounded-md border bg-slate-50">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <button
            type="button"
            onClick={() => removeFile(0)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center hover:bg-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Preview — multiple mode */}
      {multiple && files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {files.map((file, i) => (
            <div key={i} className="relative">
              {isImage(file) ? (
                <img
                  src={file}
                  alt={`Attachment ${i + 1}`}
                  className="h-20 w-20 object-cover rounded-md border"
                />
              ) : (
                <div className="h-20 w-20 flex flex-col items-center justify-center rounded-md border bg-slate-50 gap-1">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                  <span className="text-[8px] text-muted-foreground">PDF</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center hover:bg-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && !loading && (
        <p className="text-[10px] text-muted-foreground mt-1">
          {multiple ? `Click to attach files (max ${maxSizeMB}MB each)` : `Click to attach a file (max ${maxSizeMB}MB)`}
        </p>
      )}
    </div>
  )
}
