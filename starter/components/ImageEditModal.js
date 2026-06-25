import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { Upload, CheckCircle, Download, Copy, RotateCcw, X, Loader2, FileImage, Sparkles } from 'lucide-react'

export default function ImageEditModal({ isOpen, onClose }) {
  const [originalImage, setOriginalImage] = useState(null)
  const [editedImage, setEditedImage] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingComplete, setEditingComplete] = useState(false)
  const [tokenUsage, setTokenUsage] = useState(null)
  const [processingStep, setProcessingStep] = useState(0)
  const fileInputRef = useRef(null)

  const processingSteps = [
    'Preparing image...',
    'Compressing for API...',
    'Sending to DALL-E...',
    'Generating image...',
    'Finalizing image...',
  ]

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setOriginalImage(event.target?.result)
      setEditedImage(null)
      setEditingComplete(false)
      setPrompt('')
      setTokenUsage(null)
    }
    reader.readAsDataURL(file)
  }

  const handleEditImage = async () => {
    if (!originalImage) {
      toast.error('Please upload an image first')
      return
    }

    if (!prompt.trim()) {
      toast.error('Please enter an edit prompt')
      return
    }

    setLoading(true)
    setEditingComplete(false)
    setTokenUsage(null)
    setProcessingStep(0)

    // Simulate progress steps
    const progressInterval = setInterval(() => {
      setProcessingStep((prev) => (prev < processingSteps.length - 1 ? prev + 1 : prev))
    }, 1500)

    try {
      const response = await fetch('/api/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: originalImage,
          prompt: prompt.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.message || data.error || 'Failed to edit image'
        console.error('API Error:', { status: response.status, ...data })
        throw new Error(errorMsg)
      }

      if (!data.imageUrl) {
        console.error('No image URL in response:', data)
        throw new Error('Image generation succeeded but no image URL was returned')
      }

      setEditedImage(data.imageUrl)
      setTokenUsage(data.usage || null)
      setEditingComplete(true)
      setProcessingStep(processingSteps.length - 1)
      toast.success('Image edited successfully!')
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = error?.message || 'Failed to edit image'
      toast.error(errorMessage)
      setEditingComplete(false)
    } finally {
      clearInterval(progressInterval)
      setLoading(false)
    }
  }

  const handleDownload = async (format = 'png') => {
    if (!editedImage) {
      toast.error('No image to download')
      return
    }

    try {
      // Create image element to convert format
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          
          canvas.toBlob((blob) => {
            const link = document.createElement('a')
            const url = window.URL.createObjectURL(blob)
            link.href = url
            link.download = `edited-image-${Date.now()}.${format}`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
            toast.success(`Image downloaded as ${format.toUpperCase()}`)
          }, `image/${format}`, format === 'jpg' ? 0.95 : 1)
        } catch (err) {
          toast.error('Failed to process image')
          console.error('Canvas error:', err)
        }
      }
      
      img.onerror = () => {
        // Fallback: direct download without format conversion
        fetch(editedImage, { mode: 'no-cors' })
          .then(res => res.blob())
          .then(blob => {
            const link = document.createElement('a')
            const url = window.URL.createObjectURL(blob)
            link.href = url
            link.download = `edited-image-${Date.now()}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
            toast.success('Image downloaded')
          })
          .catch(err => {
            toast.error('Download failed. Try copying to clipboard instead.')
            console.error('Fallback download error:', err)
          })
      }
      
      img.src = editedImage
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download image')
    }
  }

  const handleCopyToClipboard = async () => {
    if (!editedImage) return

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          
          canvas.toBlob(async (blob) => {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ])
              toast.success('Image copied to clipboard!')
            } catch (err) {
              toast.error('Failed to copy to clipboard')
            }
          })
        } catch (err) {
          toast.error('Failed to process image for clipboard')
          console.error('Canvas error:', err)
        }
      }
      
      img.onerror = () => {
        toast.error('Failed to load image for clipboard copy')
      }
      
      img.src = editedImage
    } catch (err) {
      toast.error('Failed to copy to clipboard')
      console.error('Clipboard error:', err)
    }
  }

  const handleReset = () => {
    setOriginalImage(null)
    setEditedImage(null)
    setPrompt('')
    setEditingComplete(false)
    setTokenUsage(null)
    setProcessingStep(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-3xl bg-white shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-900 p-1"
        >
          <X size={24} />
        </button>

        <div className="p-6 md:p-8">
          {!editingComplete ? (
            // EDITING VIEW
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="text-accent" size={32} />
                  <h2 className="text-3xl font-black text-black">Edit Image with AI</h2>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Upload an image, describe your edits, and download the result. Output: up to 1024x1024px
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Upload Section */}
                <div className="rounded-2xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-accent transition">
                  {originalImage ? (
                    <div className="space-y-4">
                      <p className="text-sm font-semibold text-gray-900 flex items-center justify-center gap-2">
                        <FileImage size={16} className="text-accent" /> Original Image
                      </p>
                      <img
                        src={originalImage}
                        alt="Original"
                        className="mx-auto max-h-48 rounded-lg shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm text-accent hover:underline font-semibold"
                      >
                        Change image
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer space-y-3"
                    >
                      <div className="flex justify-center">
                        <Upload size={48} className="text-gray-400" />
                      </div>
                      <p className="text-sm font-semibold text-gray-900">Click to upload or drag & drop</p>
                      <p className="text-xs text-gray-500">PNG, JPG, WebP (max 10MB)</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {/* Prompt Section */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      How do you want to edit it?
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe the edits in detail..."
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-black focus:border-accent focus:outline-none resize-none"
                      rows={8}
                      disabled={loading}
                    />
                  </div>
                  <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
                    <p className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-1">
                      💡 Examples:
                    </p>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• "Make background white"</li>
                      <li>• "Add more contrast"</li>
                      <li>• "Change to black and white"</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Progress Bar and Status */}
              {loading && (
                <div className="space-y-3 rounded-2xl bg-gradient-to-r from-accent/10 to-accent/5 p-4 border border-accent/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin text-accent" size={20} />
                      <p className="text-sm font-semibold text-black">
                        {processingSteps[processingStep]}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {processingStep + 1} / {processingSteps.length}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-500"
                      style={{
                        width: `${((processingStep + 1) / processingSteps.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleEditImage}
                  disabled={loading || !originalImage || !prompt.trim()}
                  className="flex-1 rounded-2xl bg-accent px-6 py-4 font-semibold text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition text-center flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Edit Image
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="rounded-2xl border border-gray-200 px-6 py-4 font-semibold text-black hover:bg-gray-50 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  <RotateCcw size={18} />
                  Reset
                </button>
                <button
                  onClick={onClose}
                  className="rounded-2xl border border-gray-200 px-6 py-4 font-semibold text-black hover:bg-gray-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            // DOWNLOAD VIEW (after successful edit)
            <div className="space-y-6">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <CheckCircle size={56} className="text-green-500" />
                </div>
                <h2 className="text-3xl font-black text-black">Image Edited Successfully!</h2>
                <p className="mt-2 text-sm text-gray-600">Your edited image is ready to download</p>
              </div>

              {/* Image Preview */}
              {editedImage && (
                <div className="rounded-3xl bg-gradient-to-b from-gray-50 to-gray-100 p-8 shadow-lg border border-gray-200">
                  <div className="rounded-2xl overflow-hidden bg-white p-1">
                    <img
                      src={editedImage}
                      alt="AI Generated"
                      className="w-full rounded-xl shadow-md max-h-96 object-cover"
                      onError={() => {
                        toast.error('Failed to load preview image')
                      }}
                    />
                  </div>
                  <p className="text-center mt-3 text-xs text-gray-500">
                    Generated by AI • {tokenUsage?.image_size_kb || 'N/A'} KB
                  </p>
                </div>
              )}

              {/* Token Usage Info */}
              {tokenUsage && (
                <div className="grid md:grid-cols-4 gap-3 rounded-2xl bg-gray-50 p-4 border border-gray-200">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 font-semibold">Image Size</p>
                    <p className="mt-1 text-sm font-bold text-black">{tokenUsage.image_size_kb} KB</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 font-semibold">Prompt Tokens</p>
                    <p className="mt-1 text-sm font-bold text-black">{tokenUsage.prompt_tokens}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 font-semibold">Image Tokens</p>
                    <p className="mt-1 text-sm font-bold text-black">{tokenUsage.image_tokens}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 font-semibold">Estimated Total</p>
                    <p className="mt-1 text-sm font-bold text-accent">{tokenUsage.estimated_total_tokens}</p>
                  </div>
                </div>
              )}

              {/* Download Options */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-900">Download your edited image:</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleDownload('png')}
                    className="rounded-2xl bg-accent px-6 py-4 font-semibold text-white hover:bg-accent/90 transition flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Download size={18} />
                    PNG Format
                  </button>
                  <button
                    onClick={() => handleDownload('jpg')}
                    className="rounded-2xl bg-accent px-6 py-4 font-semibold text-white hover:bg-accent/90 transition flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Download size={18} />
                    JPG Format
                  </button>
                </div>

                {/* Copy to Clipboard */}
                <button
                  onClick={handleCopyToClipboard}
                  className="w-full rounded-2xl border border-gray-200 px-6 py-4 font-semibold text-black hover:bg-gray-50 transition flex items-center justify-center gap-2 active:scale-95"
                >
                  <Copy size={18} />
                  Copy to Clipboard
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleReset}
                  className="flex-1 rounded-2xl border border-gray-200 px-6 py-4 font-semibold text-black hover:bg-gray-50 transition flex items-center justify-center gap-2"
                >
                  <RotateCcw size={18} />
                  Edit Another
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 rounded-2xl bg-gray-900 px-6 py-4 font-semibold text-white hover:bg-gray-800 transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
