'use client'

import { useState, useRef } from 'react'
import { Camera, Upload, X, CheckCircle2 } from 'lucide-react'

interface PhotoUploaderProps {
  photos: Array<{
    id: string
    missionName: string
    timestamp: Date | string
  }>
  onUploadComplete?: () => void
}

interface UploadResult {
  photoId: string
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  imageUrl?: string
  error?: string
}

export default function PhotoUploader({ photos, onUploadComplete }: PhotoUploaderProps) {
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (files: FileList) => {
    const newResults: UploadResult[] = Array.from(files).map((file, index) => ({
      photoId: photos[index]?.id || '',
      file,
      status: 'pending'
    }))

    setUploadResults(prev => [...prev, ...newResults])
  }

  const removeFile = (index: number) => {
    setUploadResults(prev => prev.filter((_, i) => i !== index))
  }

  const uploadPhotos = async () => {
    if (uploadResults.length === 0) return

    setIsUploading(true)

    for (let i = 0; i < uploadResults.length; i++) {
      const result = uploadResults[i]
      if (result.status !== 'pending') continue

      // 状態を更新：アップロード中
      setUploadResults(prev => 
        prev.map((r, idx) => 
          idx === i ? { ...r, status: 'uploading' } : r
        )
      )

      try {
        const formData = new FormData()
        formData.append('file', result.file)
        formData.append('photoId', result.photoId)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (data.success) {
          // 状態を更新：成功
          setUploadResults(prev => 
            prev.map((r, idx) => 
              idx === i ? { 
                ...r, 
                status: 'success', 
                imageUrl: data.imageUrl 
              } : r
            )
          )
        } else {
          // 状態を更新：エラー
          setUploadResults(prev => 
            prev.map((r, idx) => 
              idx === i ? { 
                ...r, 
                status: 'error', 
                error: data.message 
              } : r
            )
          )
        }
      } catch (error) {
        // 状態を更新：エラー
        setUploadResults(prev => 
          prev.map((r, idx) => 
            idx === i ? { 
              ...r, 
              status: 'error', 
              error: 'ネットワークエラー'
            } : r
          )
        )
      }

      // 少し待機（連続アップロードでサーバー負荷軽減）
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsUploading(false)
    onUploadComplete?.()
  }

  const getStatusIcon = (status: UploadResult['status']) => {
    switch (status) {
      case 'pending':
        return <Camera className="h-4 w-4 text-gray-400" />
      case 'uploading':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'error':
        return <X className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusText = (result: UploadResult) => {
    switch (result.status) {
      case 'pending':
        return 'アップロード待機中'
      case 'uploading':
        return 'アップロード中...'
      case 'success':
        return 'アップロード完了'
      case 'error':
        return `エラー: ${result.error}`
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <Upload className="h-5 w-5 mr-2" />
        写真をアップロード
      </h3>

      <p className="text-sm text-gray-600 mb-4">
        一眼レフで撮影した写真をアップロードして、撮影記録と結びつけましょう
      </p>

      {/* ファイル選択 */}
      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 font-medium">クリックして写真を選択</p>
          <p className="text-sm text-gray-500">または写真をドラッグ&ドロップ</p>
        </button>
      </div>

      {/* アップロード予定の写真一覧 */}
      {uploadResults.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-800 mb-3">選択された写真</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {uploadResults.map((result, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{result.file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(result.file.size / 1024 / 1024).toFixed(2)}MB - {getStatusText(result)}
                  </p>
                </div>
                {result.status === 'pending' && (
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-gray-200 rounded-full"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}
                {result.status === 'success' && result.imageUrl && (
                  <img 
                    src={result.imageUrl} 
                    alt="Uploaded"
                    className="w-10 h-10 object-cover rounded-lg"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* アップロードボタン */}
      {uploadResults.some(r => r.status === 'pending') && (
        <button
          onClick={uploadPhotos}
          disabled={isUploading || uploadResults.length === 0}
          className="w-full bg-blue-600 text-white rounded-lg py-3 px-4 font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
        >
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              <span>アップロード中...</span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span>写真をアップロード</span>
            </>
          )}
        </button>
      )}

      {/* 完了メッセージ */}
      {uploadResults.length > 0 && !uploadResults.some(r => r.status === 'pending' || r.status === 'uploading') && (
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 font-medium">
            {uploadResults.filter(r => r.status === 'success').length}枚の写真をアップロードしました！
          </p>
        </div>
      )}
    </div>
  )
}