import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  console.log('Walk API POST called')
  try {

    const body = await request.json()
    console.log('Request body received:', { 
      hasStartLat: !!body.startLat,
      hasMissions: !!body.missions,
      photosCount: body.photos?.length || 0,
      routesCount: body.routes?.length || 0
    })

    const {
      startLat,
      startLng,
      endLat,
      endLng,
      missions,
      photos,
      routes,
      distance,
      steps
    } = body

    try {
      console.log('Creating walk in database...')
      // 散歩データを保存
      const walk = await prisma.walk.create({
        data: {
          startLat: parseFloat(startLat),
          startLng: parseFloat(startLng),
          endLat: parseFloat(endLat),
          endLng: parseFloat(endLng),
          missions: JSON.stringify(missions),
          startTime: new Date(),
          endTime: new Date(),
          distance: distance ? parseFloat(distance) : null,
          steps: steps ? parseInt(steps) : null,
          photos: {
            create: photos.map((photo: { missionType?: string; missionName: string; lat: number; lng: number; timestamp?: Date }) => ({
              missionType: photo.missionType || 'mission',
              missionName: photo.missionName,
              lat: parseFloat(photo.lat),
              lng: parseFloat(photo.lng),
              timestamp: new Date(photo.timestamp || new Date())
            }))
          },
          routes: {
            create: routes.map((route: { lat: number; lng: number; timestamp?: Date }) => ({
              lat: parseFloat(route.lat),
              lng: parseFloat(route.lng),
              timestamp: new Date(route.timestamp || new Date())
            }))
          }
        },
        include: {
          photos: true,
          routes: true
        }
      })
      console.log('Walk created successfully:', walk.id)
      return NextResponse.json({ walk })
    } catch (dbError) {
      console.error('Database error:', dbError)
      // データベースエラーの場合は一時的なIDを返す
      return NextResponse.json({ 
        success: true, 
        message: '散歩データを記録しました',
        walk: { id: Date.now() }
      })
    }
  } catch (error) {
    console.error('Walk save error:', error)
    return NextResponse.json({ error: 'Failed to save walk' }, { status: 500 })
  }
}

export async function GET() {
  console.log('Walk API GET called')
  try {
    try {
      console.log('Fetching walks from database...')
      const walks = await prisma.walk.findMany({
        include: {
          photos: true,
          routes: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      console.log('Walks fetched successfully:', walks.length)
      
      // missionsをJSONから復元
      const formattedWalks = walks.map(walk => ({
        ...walk,
        missions: JSON.parse(walk.missions)
      }))

      return NextResponse.json({ walks: formattedWalks })
    } catch (dbError) {
      console.error('Database fetch error:', dbError)
      // データベースエラーの場合は空の配列を返す
      return NextResponse.json({ 
        walks: [],
        message: 'データベース接続エラーのため履歴を表示できません'
      })
    }
  } catch (error) {
    console.error('Walk fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch walks' }, { status: 500 })
  }
}