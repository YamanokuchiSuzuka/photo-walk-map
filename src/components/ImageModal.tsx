'use client'

import { useState } from 'react'
import { X, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react'

interface ImageModalProps {
  imageUrl: string
  alt: string
  missionName: string
  timestamp?: string
  isOpen: boolean
  onClose: () => void
}

export default function ImageModal({ imageUrl, alt, missionName, timestamp, isOpen, onClose }: ImageModalProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  if (!isOpen) return null

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `${missionName}_${timestamp || Date.now()}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetView = () => {
    setZoom(1)
    setRotation(0)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
      resetView()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-7xl max-h-full">
        {/* 閉じるボタン */}
        <button
          onClick={() => {
            onClose()
            resetView()
          }}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
        >
          <X className="h-8 w-8" />
        </button>

        {/* 操作パネル */}
        <div className="absolute -top-12 left-0 flex items-center space-x-4 z-10">
          <button
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
            className="text-white hover:text-gray-300 transition-colors"
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="h-6 w-6" />
          </button>
          <span className="text-white text-sm">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
            className="text-white hover:text-gray-300 transition-colors"
            disabled={zoom >= 3}
          >
            <ZoomIn className="h-6 w-6" />
          </button>
          <button
            onClick={() => setRotation(prev => (prev + 90) % 360)}
            className="text-white hover:text-gray-300 transition-colors"
          >
            <RotateCw className="h-6 w-6" />
          </button>
          <button
            onClick={handleDownload}
            className="text-white hover:text-gray-300 transition-colors"
          >
            <Download className="h-6 w-6" />
          </button>
          <button
            onClick={resetView}
            className="text-white hover:text-gray-300 transition-colors text-sm"
          >
            リセット
          </button>
        </div>

        {/* 画像 */}
        <div className="overflow-hidden rounded-lg">
          <img
            src={imageUrl}
            alt={alt}
            className="max-w-none transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              maxHeight: '80vh',
              maxWidth: '90vw'
            }}
          />
        </div>

        {/* 画像情報 */}
        <div className="absolute -bottom-16 left-0 right-0 text-center">
          <div className="bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg inline-block">
            <p className="font-medium">{missionName}</p>
            {timestamp && (
              <p className="text-sm text-gray-300">
                {new Date(timestamp).toLocaleDateString('ja-JP', { 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}