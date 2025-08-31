'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, MapPin, Camera, Clock, ArrowLeft, Home } from 'lucide-react'
import Map from '@/components/Map'
import PhotoUploader from '@/components/PhotoUploader'
import { Mission } from '@/types'

interface WalkSummary {
  missions: Mission[]
  photos: Array<{
    id: string
    lat: number
    lng: number
    missionName: string
  }>
  startTime: string // JSON経由で文字列として渡される
  endTime: string   // JSON経由で文字列として渡される
  totalPhotos: number
  completedMissions: number
}

function WalkCompleteContent() {
  const searchParams = useSearchParams()
  const walkData = searchParams.get('data')
  const [summary, setSummary] = useState<WalkSummary | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (walkData) {
      try {
        const data = JSON.parse(decodeURIComponent(walkData))
        setSummary(data)
        saveWalkToDatabase(data)
      } catch (error) {
        console.error('データの解析に失敗しました:', error)
      }
    }
  }, [walkData])

  const saveWalkToDatabase = async (data: WalkSummary) => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/walks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startLat: 35.6895, // 仮の値、実際は散歩開始時に設定
          startLng: 139.6917,
          endLat: 35.6895,
          endLng: 139.6917,
          missions: data.missions,
          photos: data.photos,
          routes: [], // 実際のルートデータを追加予定
          distance: null,
          steps: null
        })
      })

      if (response.ok) {
        console.log('散歩データを保存しました')
      }
    } catch (error) {
      console.error('データ保存エラー:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">散歩データを処理中...</p>
        </div>
      </div>
    )
  }

  const startTime = new Date(summary.startTime)
  const endTime = new Date(summary.endTime)
  const duration = endTime.getTime() - startTime.getTime()
  const hours = Math.floor(duration / (1000 * 60 * 60))
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center mb-6">
          <Link href="/" className="p-2 hover:bg-white/20 rounded-lg">
            <ArrowLeft className="h-6 w-6 text-gray-700" />
          </Link>
          <h1 className="text-xl font-bold text-gray-800 ml-2">散歩完了</h1>
        </div>

        {/* 完了通知 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="text-center mb-6">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">お疲れ様でした！</h2>
            <p className="text-gray-600">素敵な散歩体験でした</p>
          </div>

          {/* サマリー統計 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Camera className="h-6 w-6 text-green-600 mx-auto mb-1" />
              <div className="text-xl font-bold text-green-800">{summary.totalPhotos}</div>
              <div className="text-xs text-green-600">撮影枚数</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <div className="text-xl font-bold text-blue-800">{summary.completedMissions}</div>
              <div className="text-xs text-blue-600">達成ミッション</div>
            </div>
          </div>

          {/* 時間情報 */}
          <div className="flex items-center justify-center text-gray-600 mb-6">
            <Clock className="h-4 w-4 mr-2" />
            <span className="text-sm">
              散歩時間: {hours > 0 && `${hours}時間`}{minutes}分
            </span>
          </div>

          {/* ミッション結果 */}
          <div className="space-y-2 mb-6">
            <h3 className="font-medium text-gray-800">ミッション結果</h3>
            {summary.missions.map((mission) => (
              <div
                key={mission.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  mission.completed
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle2 
                    className={`h-4 w-4 ${
                      mission.completed ? 'text-green-600' : 'text-gray-400'
                    }`} 
                  />
                  <span className={`text-sm ${
                    mission.completed ? 'text-green-800' : 'text-gray-600'
                  }`}>
                    {mission.name}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {mission.count}/{mission.targetCount}
                  {mission.completed && ' ✨'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 撮影マップ */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <h3 className="font-medium text-gray-800 mb-3">撮影マップ</h3>
          <div className="h-64 rounded-lg overflow-hidden">
            <Map photos={summary.photos} />
          </div>
        </div>

        {/* 写真アップロード */}
        <div className="mb-6">
          <PhotoUploader 
            photos={summary.photos.map(photo => ({
              id: photo.id,
              missionName: photo.missionName,
              timestamp: new Date()
            }))}
            onUploadComplete={() => {
              console.log('写真アップロード完了')
            }}
          />
        </div>

        {/* アクションボタン */}
        <div className="space-y-3">
          <Link
            href="/history"
            className="w-full bg-blue-600 text-white rounded-lg py-3 px-4 font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <MapPin className="h-5 w-5" />
            <span>散歩履歴を見る</span>
          </Link>
          
          <Link
            href="/"
            className="w-full bg-white border border-gray-300 text-gray-700 rounded-lg py-3 px-4 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
          >
            <Home className="h-5 w-5" />
            <span>ホームに戻る</span>
          </Link>
        </div>

        {isSaving && (
          <div className="text-center text-sm text-gray-500 mt-4">
            散歩データを保存中...
          </div>
        )}
      </div>
    </div>
  )
}

export default function WalkCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">散歩データを読み込み中...</p>
        </div>
      </div>
    }>
      <WalkCompleteContent />
    </Suspense>
  )
}