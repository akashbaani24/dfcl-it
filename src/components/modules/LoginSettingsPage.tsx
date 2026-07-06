'use client'
import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Trash2, Save, Image as ImageIcon, Smartphone, Monitor, Both } from 'lucide-react'
import { toast } from 'sonner'

export function LoginSettingsPage() {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [showOn, setShowOn] = useState<string>('both') // mobile, desktop, both
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/settings?key=loginImage')
      .then(r => r.json())
      .then(data => {
        if (data && data.imageUrl) {
          setImageUrl(data.imageUrl)
          setShowOn(data.showOn || 'both')
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image too large. Max 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImageUrl(reader.result as string)
      toast.success('Image loaded. Click Save to apply.')
    }
    reader.readAsDataURL(file)
  }

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'loginImage',
          value: { imageUrl, showOn },
        }),
      })
      if (!r.ok) throw new Error('Failed to save')
      toast.success('Login image settings saved!')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const removeImage = () => {
    setImageUrl('')
    toast.info('Image removed. Click Save to apply.')
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm text-muted-foreground">Loading...</p></div>
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Login Page Image Settings</h1>
        <p className="text-sm text-muted-foreground">Customize the image shown on the login page</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Upload + Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Image Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload area */}
            <div>
              <Label className="text-xs">Upload Image (max 2MB)</Label>
              <div
                className="mt-2 border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Click to upload image</p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG, GIF, WebP</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Image URL (if uploaded) */}
            {imageUrl && (
              <div>
                <Label className="text-xs">Image URL (base64)</Label>
                <Input
                  value={imageUrl.substring(0, 80) + '...'}
                  readOnly
                  className="mt-1 text-xs font-mono"
                />
              </div>
            )}

            {/* Show on: Mobile / Desktop / Both */}
            <div>
              <Label className="text-xs">Show image on</Label>
              <Select value={showOn} onValueChange={setShowOn}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">
                    <div className="flex items-center gap-2">
                      <Both className="h-4 w-4" /> Both (Mobile + Desktop)
                    </div>
                  </SelectItem>
                  <SelectItem value="desktop">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" /> Desktop only
                    </div>
                  </SelectItem>
                  <SelectItem value="mobile">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" /> Mobile only
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Choose where the image will be visible on the login page
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button onClick={save} disabled={saving} className="gap-1">
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
              {imageUrl && (
                <Button variant="outline" onClick={removeImage} className="gap-1 text-destructive">
                  <Trash2 className="h-4 w-4" /> Remove Image
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {imageUrl ? (
              <div className="space-y-3">
                <div className="border rounded-lg overflow-hidden bg-slate-50">
                  <img
                    src={imageUrl}
                    alt="Login preview"
                    className="w-full h-auto max-h-80 object-contain"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ImageIcon className="h-3 w-3" />
                  <span>Shows on: <strong className="text-slate-700">
                    {showOn === 'both' ? 'Mobile + Desktop' : showOn === 'desktop' ? 'Desktop only' : 'Mobile only'}
                  </strong></span>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-12 text-center">
                <ImageIcon className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No image uploaded yet</p>
                <p className="text-xs text-slate-400 mt-1">Default robot image will be shown</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
