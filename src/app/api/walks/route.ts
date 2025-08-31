import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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

    return NextResponse.json({ walk })
  } catch (error) {
    console.error('Walk save error:', error)
    return NextResponse.json({ error: 'Failed to save walk' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const walks = await prisma.walk.findMany({
      include: {
        photos: true,
        routes: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // missionsをJSONから復元
    const formattedWalks = walks.map(walk => ({
      ...walk,
      missions: JSON.parse(walk.missions)
    }))

    return NextResponse.json({ walks: formattedWalks })
  } catch (error) {
    console.error('Walk fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch walks' }, { status: 500 })
  }
}