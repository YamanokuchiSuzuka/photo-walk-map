import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { startAddress, endAddress } = await request.json()
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

    console.log(`Route request: ${startAddress} -> ${endAddress}`)

    if (!mapboxToken) {
      console.error('Mapbox token not configured')
      return NextResponse.json({ error: 'Mapbox token not configured' }, { status: 500 })
    }

    // 1. 住所をジオコーディング（緯度経度に変換）
    const [startCoords, endCoords] = await Promise.all([
      geocodeAddress(startAddress, mapboxToken),
      geocodeAddress(endAddress, mapboxToken)
    ])

    if (!startCoords) {
      console.error(`Failed to geocode start address: ${startAddress}`)
      return NextResponse.json({ 
        error: `スタート地点「${startAddress}」の位置情報を取得できませんでした` 
      }, { status: 400 })
    }

    if (!endCoords) {
      console.error(`Failed to geocode end address: ${endAddress}`)
      return NextResponse.json({ 
        error: `ゴール地点「${endAddress}」の位置情報を取得できませんでした` 
      }, { status: 400 })
    }

    // 2. 徒歩ルートを取得
    const routeData = await getWalkingRoute(startCoords, endCoords, mapboxToken)

    if (!routeData) {
      return NextResponse.json({ 
        error: 'ルートを取得できませんでした' 
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      route: {
        startCoords,
        endCoords,
        geometry: routeData.geometry,
        distance: Math.round(routeData.distance), // メートル単位
        duration: Math.round(routeData.duration / 60), // 分単位
        steps: routeData.legs[0]?.steps || []
      }
    })

  } catch (error) {
    console.error('Route API error:', error)
    return NextResponse.json({ 
      error: 'ルート取得中にエラーが発生しました' 
    }, { status: 500 })
  }
}

async function geocodeAddress(address: string, token: string): Promise<[number, number] | null> {
  try {
    // よく使われる駅の事前定義座標
    const predefinedStations: { [key: string]: [number, number] } = {
      '現在地': [139.7673068, 35.6809591], // 東京駅
      '現在の場所': [139.7673068, 35.6809591], // 東京駅
      '現在': [139.7673068, 35.6809591], // 東京駅
      '東京駅': [139.7673068, 35.6809591],
      '渋谷駅': [139.7016358, 35.6580992],
      '新宿駅': [139.7005713, 35.6896067],
      '池袋駅': [139.7109599, 35.7295626],
      '原宿駅': [139.7024296, 35.6702087],
      '表参道駅': [139.7123306, 35.6659220],
      '品川駅': [139.7388029, 35.6284613],
      '上野駅': [139.7774603, 35.7140867],
      '秋葉原駅': [139.7744733, 35.6983306],
      '有楽町駅': [139.7630820, 35.6752311],
      '銀座駅': [139.7671646, 35.6715842],
      '浅草駅': [139.7966440, 35.7120649],
      '押上駅': [139.8139242, 35.7100656],
      '錦糸町駅': [139.8138103, 35.6969184],
      '両国駅': [139.7930579, 35.6956021],
      '門前仲町駅': [139.7957234, 35.6717968],
      '月島駅': [139.7825644, 35.6654083],
      '豊洲駅': [139.7956531, 35.6549444],
      '新木場駅': [139.8267578, 35.6460139],
      '大手町駅': [139.7663286, 35.6861226],
      '日本橋駅': [139.7735156, 35.6853061],
      '神田駅': [139.7711644, 35.6918028]
    }

    // 事前定義された駅かチェック
    if (predefinedStations[address]) {
      console.log(`事前定義された駅「${address}」の座標を使用します。`)
      return predefinedStations[address]
    }

    const encodedAddress = encodeURIComponent(address)
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${token}&country=JP&limit=1`
    
    console.log(`Geocoding request for: ${address}`)
    console.log(`URL: ${url}`)

    const response = await fetch(url)
    const data = await response.json()

    console.log(`Geocoding response for "${address}":`, JSON.stringify(data, null, 2))

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center
      console.log(`Found coordinates for "${address}": [${lng}, ${lat}]`)
      return [lng, lat]
    }

    console.log(`No geocoding results found for: ${address}`)
    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

async function getWalkingRoute(
  start: [number, number], 
  end: [number, number], 
  token: string
): Promise<any | null> {
  try {
    const [startLng, startLat] = start
    const [endLng, endLat] = end
    
    console.log(`Walking route request: [${startLng}, ${startLat}] -> [${endLng}, ${endLat}]`)
    
    // 距離をチェック（徒歩ルートは現実的な距離に制限）
    const distance = Math.sqrt(Math.pow(endLng - startLng, 2) + Math.pow(endLat - startLat, 2)) * 111 // 概算距離（km）
    console.log(`Distance between points: ~${distance.toFixed(1)}km`)
    
    if (distance > 50) { // 50km以上の徒歩ルートは非現実的
      console.error(`Distance too long for walking route: ${distance.toFixed(1)}km`)
      return null
    }
    
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${startLng},${startLat};${endLng},${endLat}?access_token=${token}&geometries=geojson&steps=true&banner_instructions=true&voice_instructions=true`
    
    console.log(`Directions API URL: ${url}`)
    
    const response = await fetch(url)
    const data = await response.json()

    console.log(`Directions API response status: ${response.status}`)
    console.log(`Directions API response:`, JSON.stringify(data, null, 2))

    if (!response.ok) {
      console.error('Directions API error:', data)
      return null
    }

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0]
      console.log(`Route found: ${(route.distance/1000).toFixed(1)}km, ${Math.round(route.duration/60)}min`)
      return route
    }

    console.log('No routes found in response')
    return null
  } catch (error) {
    console.error('Routing error:', error)
    return null
  }
}