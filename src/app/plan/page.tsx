'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, Target, Sparkles } from 'lucide-react'
import { generateMissions, getCurrentSeason, getCurrentTimeOfDay } from '@/lib/mission-generator'

export default function PlanPage() {
  const [startAddress, setStartAddress] = useState('')
  const [endAddress, setEndAddress] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleStartWalk = async () => {
    if (!startAddress.trim() || !endAddress.trim()) {
      alert('スタート地点とゴール地点を入力してください')
      return
    }

    setIsGenerating(true)
    
    try {
      // AIミッション生成
      const missions = await generateMissions({
        startLocation: startAddress,
        endLocation: endAddress,
        season: getCurrentSeason(),
        timeOfDay: getCurrentTimeOfDay()
      })

      // 生成されたミッションをlocalStorageに保存
      localStorage.setItem('generatedMissions', JSON.stringify(missions))

      const params = new URLSearchParams({
        start: startAddress,
        end: endAddress
      })
      window.location.href = `/walk?${params}`
    } catch (error) {
      console.error('ミッション生成エラー:', error)
      alert('ミッション生成に失敗しました。デフォルトのミッションで開始します。')
      
      const params = new URLSearchParams({
        start: startAddress,
        end: endAddress
      })
      window.location.href = `/walk?${params}`
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center mb-6">
          <Link href="/" className="p-2 hover:bg-white/20 rounded-lg">
            <ArrowLeft className="h-6 w-6 text-gray-700" />
          </Link>
          <h1 className="text-xl font-bold text-gray-800 ml-2">散歩を計画する</h1>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="start-address" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <MapPin className="h-4 w-4 mr-2 text-green-600" />
                スタート地点
              </label>
              <input
                id="start-address"
                name="start-address"
                type="text"
                value={startAddress}
                onChange={(e) => setStartAddress(e.target.value)}
                placeholder="例：渋谷駅、現在地など"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={isGenerating}
                autoComplete="street-address"
              />
            </div>

            <div>
              <label htmlFor="end-address" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Target className="h-4 w-4 mr-2 text-blue-600" />
                ゴール地点
              </label>
              <input
                id="end-address"
                name="end-address"
                type="text"
                value={endAddress}
                onChange={(e) => setEndAddress(e.target.value)}
                placeholder="例：表参道、原宿駅など"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isGenerating}
                autoComplete="street-address"
              />
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Sparkles className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">撮影ミッション自動生成</h3>
                <p className="text-xs text-yellow-700 mt-1">
                  設定した場所と季節に合わせて、3つの撮影ミッションを自動で作成します
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleStartWalk}
            disabled={isGenerating || !startAddress.trim() || !endAddress.trim()}
            className="w-full bg-green-600 text-white rounded-lg py-4 px-6 font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>ミッション生成中...</span>
              </>
            ) : (
              <>
                <MapPin className="h-5 w-5" />
                <span>散歩を開始する</span>
              </>
            )}
          </button>
        </div>

        <div className="text-center text-sm text-gray-500 mt-6">
          歩行時間は1-2時間程度を目安に設定してください
        </div>
      </div>
    </div>
  )
}