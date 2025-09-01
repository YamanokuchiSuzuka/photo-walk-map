'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Camera, CheckCircle2, Navigation } from 'lucide-react'
import Map from '@/components/Map'
import { Mission } from '@/types'
import { v4 as uuidv4 } from 'uuid'

function getDefaultMissions(): Mission[] {
  return [
    {
      id: uuidv4(),
      name: '古い建物',
      description: '歴史を感じる建築物を撮影',
      completed: false,
      count: 0,
      targetCount: 3
    },
    {
      id: uuidv4(),
      name: '緑のあるもの',
      description: '植物や自然を撮影',
      completed: false,
      count: 0,
      targetCount: 3
    },
    {
      id: uuidv4(),
      name: '面白い形',
      description: 'ユニークな形状のものを撮影',
      completed: false,
      count: 0,
      targetCount: 3
    }
  ]
}

interface RouteInfo {
  startCoords: [number, number]
  endCoords: [number, number]
  geometry: unknown
  distance: number
  duration: number
}

function WalkPageContent() {
  const searchParams = useSearchParams()
  const startAddress = searchParams.get('start') || ''
  const endAddress = searchParams.get('end') || ''
  
  const [missions, setMissions] = useState<Mission[]>([])
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)

  // ルート取得
  useEffect(() => {
    if (startAddress && endAddress) {
      fetchRoute()
    }
  }, [startAddress, endAddress])

  const fetchRoute = async () => {
    setIsLoadingRoute(true)
    try {
      const response = await fetch('/api/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startAddress,
          endAddress
        })
      })

      const data = await response.json()
      if (data.success) {
        setRouteInfo(data.route)
      } else {
        console.error('ルート取得失敗:', data.error)
      }
    } catch (error) {
      console.error('ルート取得エラー:', error)
    } finally {
      setIsLoadingRoute(false)
    }
  }

  // AIで生成されたミッションを読み込み
  useEffect(() => {
    const savedMissions = localStorage.getItem('generatedMissions')
    if (savedMissions) {
      try {
        const parsedMissions = JSON.parse(savedMissions)
        setMissions(parsedMissions)
        localStorage.removeItem('generatedMissions') // 使用後削除
      } catch (error) {
        console.error('ミッション読み込みエラー:', error)
        setMissions(getDefaultMissions())
      }
    } else {
      setMissions(getDefaultMissions())
    }
  }, [])

  const [selectedMission, setSelectedMission] = useState<string>('')
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null)

  // 位置情報取得
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('位置情報取得エラー:', error)
          // エラーの場合は東京駅を設定
          setCurrentLocation({
            lat: 35.6762,
            lng: 139.6503
          })
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5分間キャッシュ
        }
      )

      return () => navigator.geolocation.clearWatch(watchId)
    } else {
      // 位置情報が利用できない場合は東京駅を設定
      setCurrentLocation({
        lat: 35.6762,
        lng: 139.6503
      })
    }
  }, [])
  const [photos, setPhotos] = useState<Array<{id: string, lat: number, lng: number, missionName: string}>>([])

  const handlePhotoTaken = () => {
    if (!selectedMission || !currentLocation) {
      alert('ミッションを選択して位置情報を取得してください')
      return
    }

    const mission = missions.find(m => m.id === selectedMission)
    if (!mission) return

    const newPhoto = {
      id: Date.now().toString(),
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      missionName: mission.name
    }

    setPhotos([...photos, newPhoto])

    const updatedMissions = missions.map(m => {
      if (m.id === selectedMission) {
        const newCount = m.count + 1
        return {
          ...m,
          count: newCount,
          completed: newCount >= m.targetCount
        }
      }
      return m
    })

    setMissions(updatedMissions)
    setSelectedMission('')
    
    alert(`📸 ${mission.name}を記録しました！`)
  }

  const completedMissions = missions.filter(m => m.completed).length
  const totalMissions = missions.length

  const handleCompleteWalk = () => {
    const walkSummary = {
      missions,
      photos,
      startTime: new Date(Date.now() - 60 * 60 * 1000), // 仮の開始時間（1時間前）
      endTime: new Date(),
      totalPhotos: photos.length,
      completedMissions
    }

    const dataParam = encodeURIComponent(JSON.stringify(walkSummary))
    window.location.href = `/walk-complete?data=${dataParam}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm p-4 z-10">
          <div className="flex items-center justify-between">
            <Link href="/plan" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="text-center">
              <div className="text-sm text-gray-600">散歩中</div>
              <div className="text-xs text-gray-500">{startAddress} → {endAddress}</div>
            </div>
            <div className="w-9" />
          </div>

          {/* Mission Progress */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">今日のミッション</span>
              <span className="text-gray-600">{completedMissions}/{totalMissions} 完了</span>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {missions.map((mission) => (
                <div
                  key={mission.id}
                  className={`flex items-center justify-between p-2 rounded-lg border ${
                    mission.completed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {mission.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />
                    )}
                    <span className={`text-sm ${mission.completed ? 'text-green-800' : 'text-gray-800'}`}>
                      {mission.name}
                    </span>
                  </div>
                  <span className="text-xs text-gray-600">
                    {mission.count}/{mission.targetCount}
                    {mission.completed && ' ✨'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <Map 
            onLocationUpdate={(lat, lng) => setCurrentLocation({ lat, lng })}
            currentLat={currentLocation?.lat}
            currentLng={currentLocation?.lng}
            photos={photos}
            startLat={routeInfo?.startCoords[1]}
            startLng={routeInfo?.startCoords[0]}
            endLat={routeInfo?.endCoords[1]}
            endLng={routeInfo?.endCoords[0]}
            routeGeometry={routeInfo?.geometry}
            showRoute={!!routeInfo}
          />
          
          {isLoadingRoute && (
            <div className="absolute top-4 left-4 right-4 bg-white rounded-lg shadow-lg p-3 flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">ルートを取得中...</span>
            </div>
          )}

          {routeInfo && (
            <div className="absolute top-4 left-4 right-4 bg-white rounded-lg shadow-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">距離: {(routeInfo.distance / 1000).toFixed(1)}km</span>
                <span className="text-gray-600">予想時間: {routeInfo.duration}分</span>
              </div>
            </div>
          )}
        </div>

        {/* Photo Taking Interface */}
        <div className="bg-white border-t border-gray-200 p-4 space-y-4">
          <div>
            <label htmlFor="mission-select" className="block text-sm font-medium text-gray-700 mb-2">
              撮影するミッション
            </label>
            <select
              id="mission-select"
              name="mission-select"
              value={selectedMission}
              onChange={(e) => setSelectedMission(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">ミッションを選択...</option>
              {missions.filter(m => !m.completed).map((mission) => (
                <option key={mission.id} value={mission.id}>
                  {mission.name} ({mission.count}/{mission.targetCount})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePhotoTaken}
            disabled={!selectedMission || !currentLocation}
            className="w-full bg-blue-600 text-white rounded-lg py-3 px-4 font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            <Camera className="h-5 w-5" />
            <span>撮影完了</span>
          </button>

          <button
            onClick={handleCompleteWalk}
            className="w-full bg-green-600 text-white rounded-lg py-3 px-4 font-medium hover:bg-green-700 transition-colors mt-2"
          >
            散歩を完了する
          </button>

          {!currentLocation && (
            <div className="flex items-center space-x-2 text-orange-600 text-sm mt-2">
              <Navigation className="h-4 w-4" />
              <span>位置情報を取得中...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function WalkPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">散歩ページを読み込み中...</p>
        </div>
      </div>
    }>
      <WalkPageContent />
    </Suspense>
  )
}