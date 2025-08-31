import Link from 'next/link'
import { MapPin, Camera, Route } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 space-y-6">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">散歩写真マップ</h1>
          <p className="text-gray-600 mt-2">目的を持った散歩で特別な体験を</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Link
            href="/plan"
            className="flex items-center justify-center space-x-3 bg-green-600 text-white rounded-lg p-4 hover:bg-green-700 transition-colors"
          >
            <Route className="h-5 w-5" />
            <span className="font-medium">新しい散歩を始める</span>
          </Link>
          
          <Link
            href="/history"
            className="flex items-center justify-center space-x-3 bg-blue-600 text-white rounded-lg p-4 hover:bg-blue-700 transition-colors"
          >
            <Camera className="h-5 w-5" />
            <span className="font-medium">過去の散歩を見る</span>
          </Link>
        </div>

        <div className="text-center text-sm text-gray-500">
          マップを見ながらミッション達成を目指そう
        </div>
      </div>
    </div>
  )
}
