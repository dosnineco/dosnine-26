'use client'

import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { Upload, Download, Loader2, Image as ImageIcon, Sparkles } from 'lucide-react'

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState('')
  const [uploadedImage, setUploadedImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generatedImage, setGeneratedImage] = useState(null)
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const fileInputRef = useRef(null)

  // Fetch history on mount
  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true)
      const response = await fetch('/api/generations?limit=12')
      const data = await response.json()
      if (data.success) {
        setHistory(data.data)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setUploadedImage(event.target?.result)
    }
    reader.readAsDataURL(file)
  }

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          imageBase64: uploadedImage,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to generate image')
      }

      if (!data.imageUrl) {
        throw new Error('No image URL returned')
      }

      setGeneratedImage(data.imageUrl)
      toast.success('Image generated successfully!')
      
      // Refresh history
      fetchHistory()
    } catch (error) {
      console.error('Generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate image')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (imageUrl) => {
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `generated-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Image downloading...')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles size={32} className="text-blue-500" />
            <h1 className="text-4xl font-black text-white">AI Image Generator</h1>
          </div>
          <p className="text-gray-400 text-lg">Generate stunning images with AI powered by OpenAI</p>
        </div>

        {/* Main Generator Section */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Input Panel */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-lg">
              <label className="block text-white font-semibold mb-3">
                Describe your image
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A serene landscape with mountains and a sunset..."
                className="w-full bg-gray-700 text-white rounded-xl p-4 border border-gray-600 focus:border-blue-500 focus:outline-none resize-none h-32"
                disabled={loading}
              />
              <p className="text-sm text-gray-400 mt-2">
                Be as detailed as possible for better results
              </p>
            </div>

            {/* Image Upload Section */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-2xl p-8 text-center cursor-pointer transition bg-gray-800/50"
            >
              {uploadedImage ? (
                <div className="space-y-3">
                  <ImageIcon size={32} className="mx-auto text-blue-500" />
                  <p className="text-white font-semibold">Image uploaded</p>
                  <p className="text-sm text-gray-400">Click to change</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload size={32} className="mx-auto text-gray-500" />
                  <p className="text-white font-semibold">Upload an image (optional)</p>
                  <p className="text-sm text-gray-400">to modify or use as reference</p>
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

            {/* Generate Button */}
            <button
              onClick={handleGenerateImage}
              disabled={loading || !prompt.trim()}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Generate Image
                </>
              )}
            </button>
          </div>

          {/* Preview Panel */}
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-lg flex flex-col items-center justify-center min-h-96">
            {generatedImage ? (
              <div className="space-y-4 w-full">
                <img
                  src={generatedImage}
                  alt="Generated"
                  className="w-full rounded-xl shadow-lg object-cover max-h-96"
                />
                <button
                  onClick={() => handleDownload(generatedImage)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Download size={20} />
                  Download PNG
                </button>
                <p className="text-sm text-gray-400 text-center">
                  Right-click to save, or use the download button above
                </p>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <ImageIcon size={48} className="mx-auto text-gray-600" />
                <p className="text-gray-400 text-lg">Your generated image will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* History Section */}
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-lg">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <ImageIcon size={24} />
            Generation History
          </h2>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No generations yet. Create your first image!</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-xl overflow-hidden bg-gray-700 aspect-square cursor-pointer hover:shadow-lg transition"
                >
                  <img
                    src={item.generated_image_url}
                    alt={item.prompt}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleDownload(item.generated_image_url)}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition"
                      title="Download"
                    >
                      <Download size={20} />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 translate-y-full group-hover:translate-y-0 transition">
                    <p className="text-white text-xs line-clamp-2">{item.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
