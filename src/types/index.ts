export interface Mission {
  id: string
  name: string
  description: string
  completed: boolean
  count: number
  targetCount: number
}

export interface WalkPlan {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  missions: Mission[]
}

export interface PhotoRecord {
  id: string
  walkId: string
  missionType: 'mission' | 'favorite'
  missionName?: string
  lat: number
  lng: number
  imageUrl?: string
  timestamp: Date
}

export interface WalkRoute {
  id: string
  walkId: string
  lat: number
  lng: number
  timestamp: Date
}

export interface Walk {
  id: string
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  missions: Mission[]
  startTime: Date
  endTime?: Date
  distance?: number
  steps?: number
  photos: PhotoRecord[]
  routes: WalkRoute[]
}