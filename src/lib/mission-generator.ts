import { Mission } from '@/types'

export interface MissionGenerationRequest {
  startLocation: string
  endLocation: string
  season: string
  timeOfDay: string
}

export async function generateMissions(request: MissionGenerationRequest): Promise<Mission[]> {
  try {
    const response = await fetch('/api/generate-missions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error('ミッション生成に失敗しました')
    }

    const data = await response.json()
    return data.missions
  } catch (error) {
    console.error('ミッション生成エラー:', error)
    // フォールバック：デフォルトミッション
    return getDefaultMissions()
  }
}

function getDefaultMissions(): Mission[] {
  return [
    {
      id: '1',
      name: '古い建物',
      description: '歴史を感じる建築物を撮影',
      completed: false,
      count: 0,
      targetCount: 3
    },
    {
      id: '2',
      name: '緑のあるもの',
      description: '植物や自然を撮影',
      completed: false,
      count: 0,
      targetCount: 3
    },
    {
      id: '3',
      name: '面白い形',
      description: 'ユニークな形状のものを撮影',
      completed: false,
      count: 0,
      targetCount: 3
    }
  ]
}

export function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return '春'
  if (month >= 6 && month <= 8) return '夏'  
  if (month >= 9 && month <= 11) return '秋'
  return '冬'
}

export function getCurrentTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return '朝'
  if (hour >= 12 && hour < 17) return '午後'
  if (hour >= 17 && hour < 21) return '夕方'
  return '夜'
}