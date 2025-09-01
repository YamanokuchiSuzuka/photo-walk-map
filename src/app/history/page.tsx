'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Camera, CheckCircle2, MapPin, Calendar, Clock, Image } from 'lucide-react'
import Map from '@/components/Map'
import ImageModal from '@/components/ImageModal'
import { Walk } from '@/types'
import { getUploadedImages } from '@/utils/imageStorage'

interface Mission {
  id?: string
  name: string
  description: string
  completed?: boolean
}

interface Photo {
  id: string
  lat: number
  lng: number
  missionName?: string
  timestamp: string
  imageUrl?: string
}

export default function HistoryPage() {
  const [walks, setWalks] = useState<Walk[]>([])
  const [selectedWalk, setSelectedWalk] = useState<Walk | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<{
    imageUrl: string
    alt: string
    missionName: string
    timestamp: string
  } | null>(null)
  const [uploadedImages, setUploadedImages] = useState<any[]>([])

  useEffect(() => {
    fetchWalks()
    setUploadedImages(getUploadedImages())
  }, [])

  const fetchWalks = async () => {
    try {
      const response = await fetch('/api/walks')
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched walks:', data.walks?.length || 0)
        setWalks(data.walks || [])
        
        // データベースが空でもメッセージを表示しない（ローカル画像があるため）
        if (data.message && uploadedImages.length === 0) {
          setError(data.message)
        }
      } else {
        console.log('API response not ok:', response.status)
        // データベースエラーでもローカル画像があれば表示
        if (uploadedImages.length === 0) {
          setError('散歩履歴の取得に失敗しました')
        }
      }
    } catch (error) {
      console.error('履歴取得エラー:', error)
      // ネットワークエラーでもローカル画像があれば表示
      if (uploadedImages.length === 0) {
        setError('散歩履歴の取得に失敗しました')
      }
    } finally {
      setLoading(false)
    }
  }

  const allPhotos = walks.flatMap(walk => 
    walk.photos.map(photo => ({
      id: photo.id,
      lat: photo.lat,
      lng: photo.lng,
      missionName: photo.missionName || 'unknown'
    }))
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', { 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">履歴を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchWalks}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Link href="/" className="p-2 hover:bg-white/20 rounded-lg">
            <ArrowLeft className="h-6 w-6 text-gray-700" />
          </Link>
          <h1 className="text-xl font-bold text-gray-800 ml-2">散歩履歴</h1>
        </div>

        {walks.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-600 mb-2">まだ散歩記録がありません</h2>
            <p className="text-gray-500 mb-6">最初の散歩に出かけましょう！</p>
            <Link
              href="/plan"
              className="inline-flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              <MapPin className="h-5 w-5" />
              <span>新しい散歩を始める</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左側：散歩リスト */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                過去の散歩
              </h2>
              
              {walks.map((walk) => {
                const completedMissions = walk.missions.filter(m => m.completed || false).length
                const totalPhotos = walk.photos.length
                
                return (
                  <div
                    key={walk.id}
                    onClick={() => setSelectedWalk(walk)}
                    className={`bg-white rounded-lg shadow-lg p-4 cursor-pointer transition-all hover:shadow-xl ${
                      selectedWalk?.id === walk.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-800">
                          {formatDate(walk.createdAt)}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center mt-1">
                          <Clock className="h-4 w-4 mr-1" />
                          散歩記録
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {completedMissions}/{walk.missions.length} ミッション
                        </div>
                        <div className="text-sm text-gray-600">
                          📸 {totalPhotos}枚
                        </div>
                      </div>
                    </div>

                    {/* ミッション概要 */}
                    <div className="space-y-1">
                      {walk.missions.slice(0, 3).map((mission, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle2 
                            className={`h-3 w-3 ${
                              mission.completed ? 'text-green-600' : 'text-gray-400'
                            }`} 
                          />
                          <span className="text-xs text-gray-600">
                            {mission.name} {mission.completed && '✨'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 右側：マップ表示 */}
            <div className="lg:sticky lg:top-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
                <MapPin className="h-5 w-5 mr-2" />
                {selectedWalk ? '選択した散歩' : '全ての撮影地点'}
              </h2>
              
              <div className="bg-white rounded-lg shadow-lg p-4">
                <div className="h-96 rounded-lg overflow-hidden">
                  <Map 
                    photos={selectedWalk ? 
                      selectedWalk.photos.map(photo => ({
                        id: photo.id,
                        lat: photo.lat,
                        lng: photo.lng,
                        missionName: photo.missionName || 'unknown'
                      })) : 
                      allPhotos
                    } 
                  />
                </div>
                
                {selectedWalk && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h3 className="font-medium text-gray-800 mb-2">選択した散歩の詳細</h3>
                    <div className="text-sm text-gray-600 mb-4">
                      <p>📸 撮影数: {selectedWalk.photos.length}枚</p>
                      <p>✅ 完了ミッション: {selectedWalk.missions.filter(m => m.completed).length}/{selectedWalk.missions.length}</p>
                      <p>📅 {formatDate(selectedWalk.createdAt)}</p>
                    </div>
                    
                    {/* 写真ギャラリー */}
                    {(() => {
                      // データベースからの画像
                      const dbPhotos = selectedWalk.photos.filter(photo => photo.imageUrl)
                      
                      // ローカルストレージからの画像（このwalkIdに関連するもの）
                      const localPhotos = uploadedImages.filter(img => 
                        img.walkId === selectedWalk.id.toString() || 
                        (!img.walkId && selectedWalk.photos.some(p => p.id === img.photoId))
                      )
                      
                      const allPhotos = [...dbPhotos, ...localPhotos.map(img => ({
                        id: img.photoId,
                        imageUrl: img.imageUrl,
                        missionName: img.missionName,
                        timestamp: img.timestamp
                      }))]
                      
                      return allPhotos.length > 0 ? (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                            <Image className="h-4 w-4 mr-1" />
                            アップロード済み写真
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {allPhotos.map((photo, index) => (
                              <div key={`${photo.id}-${index}`} className="relative">
                                <img
                                  src={photo.imageUrl}
                                  alt={photo.missionName || '撮影写真'}
                                  className="w-full h-20 object-cover rounded-lg hover:opacity-80 hover:scale-105 transition-all cursor-pointer"
                                  onClick={() => {
                                    setSelectedImage({
                                      imageUrl: photo.imageUrl!,
                                      alt: photo.missionName || '撮影写真',
                                      missionName: photo.missionName || '撮影写真',
                                      timestamp: photo.timestamp
                                    })
                                  }}
                                />
                                <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                                  {photo.missionName}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null
                    })()}
                  </div>
                )}
                
                {!selectedWalk && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h3 className="font-medium text-gray-800 mb-2">個人撮影マップ</h3>
                    <div className="text-sm text-gray-600">
                      <p>📸 総撮影数: {allPhotos.length}枚</p>
                      <p>🚶‍♂️ 散歩回数: {walks.length}回</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 画像モーダル */}
      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage.imageUrl}
          alt={selectedImage.alt}
          missionName={selectedImage.missionName}
          timestamp={selectedImage.timestamp}
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  )
}