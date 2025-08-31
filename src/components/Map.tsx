'use client'

import { useEffect, useRef, useCallback, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface MapProps {
  onLocationUpdate?: (lat: number, lng: number) => void
  startLat?: number
  startLng?: number
  endLat?: number
  endLng?: number
  photos?: Array<{
    id: string
    lat: number
    lng: number
    missionName?: string
  }>
  routeGeometry?: unknown // GeoJSON geometry for route
  showRoute?: boolean
}

export default function Map({ 
  onLocationUpdate, 
  startLat, 
  startLng, 
  endLat, 
  endLng,
  photos = [],
  routeGeometry,
  showRoute = false
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<mapboxgl.Marker[]>([])
  const isInitialized = useRef(false)

  // photosの変更を安定化
  const photosHash = useMemo(() => JSON.stringify(photos), [photos])

  const createCustomMarker = useCallback((type: 'current' | 'start' | 'end' | 'photo', content?: string) => {
    const el = document.createElement('div')
    
    switch (type) {
      case 'current':
        el.style.width = '20px'
        el.style.height = '20px'
        el.style.borderRadius = '50%'
        el.style.backgroundColor = '#007cbf'
        el.style.border = '3px solid #fff'
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
        break
      case 'start':
        el.style.width = '30px'
        el.style.height = '30px'
        el.style.borderRadius = '50% 50% 50% 0'
        el.style.backgroundColor = '#22c55e'
        el.style.border = '2px solid #fff'
        el.style.transform = 'rotate(-45deg)'
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
        break
      case 'end':
        el.style.width = '30px'
        el.style.height = '30px'
        el.style.borderRadius = '50% 50% 50% 0'
        el.style.backgroundColor = '#ef4444'
        el.style.border = '2px solid #fff'
        el.style.transform = 'rotate(-45deg)'
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
        break
      case 'photo':
        el.style.width = '24px'
        el.style.height = '24px'
        el.style.borderRadius = '50%'
        el.style.backgroundColor = '#f59e0b'
        el.style.border = '2px solid #fff'
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
        el.style.display = 'flex'
        el.style.alignItems = 'center'
        el.style.justifyContent = 'center'
        el.style.fontSize = '12px'
        el.innerHTML = '📸'
        break
    }
    
    return el
  }, [])

  // 地図初期化 - 一度だけ実行
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    
    if (!token) {
      console.error('Mapbox access token is not set')
      return
    }

    if (isInitialized.current || map.current) return

    mapboxgl.accessToken = token

    if (mapContainer.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [139.6917, 35.6895],
        zoom: 14
      })

      // 画像エラーを完全に抑制
      map.current.on('styleimagemissing', () => {
        // エラーを無視して何もしない
      })

      map.current.on('load', () => {
        // ルートレイヤーを追加
        if (map.current) {
          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: []
              }
            }
          })

          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 6,
              'line-opacity': 0.8
            }
          })
        }

        // 現在地の取得
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords
              
              if (map.current) {
                const currentLocationEl = createCustomMarker('current')
                new mapboxgl.Marker(currentLocationEl)
                  .setLngLat([longitude, latitude])
                  .addTo(map.current)
                
                map.current.flyTo({
                  center: [longitude, latitude],
                  zoom: 15
                })

                onLocationUpdate?.(latitude, longitude)
              }
            },
            (error) => {
              console.error('位置情報の取得に失敗しました:', error)
            },
            { enableHighAccuracy: true }
          )
        }

        // スタート地点のマーカー
        if (startLat && startLng && map.current) {
          const startEl = createCustomMarker('start')
          new mapboxgl.Marker(startEl)
            .setLngLat([startLng, startLat])
            .setPopup(new mapboxgl.Popup().setHTML('<div>スタート地点</div>'))
            .addTo(map.current)
        }

        // ゴール地点のマーカー
        if (endLat && endLng && map.current) {
          const endEl = createCustomMarker('end')
          new mapboxgl.Marker(endEl)
            .setLngLat([endLng, endLat])
            .setPopup(new mapboxgl.Popup().setHTML('<div>ゴール地点</div>'))
            .addTo(map.current)
        }
      })

      isInitialized.current = true
    }

    return () => {
      if (map.current) {
        markers.current.forEach(marker => marker.remove())
        map.current.remove()
        map.current = null
        isInitialized.current = false
      }
    }
  }, []) // 依存関係を空配列にして一度だけ実行

  // 撮影地点マーカーの更新 - photosHashで安定化
  useEffect(() => {
    if (!map.current || !isInitialized.current) return

    // 既存の撮影マーカーを削除
    markers.current.forEach(marker => marker.remove())
    markers.current = []

    // 新しい撮影マーカーを追加
    photos.forEach((photo) => {
      if (map.current) {
        const photoEl = createCustomMarker('photo')
        const marker = new mapboxgl.Marker(photoEl)
          .setLngLat([photo.lng, photo.lat])
        
        if (photo.missionName) {
          marker.setPopup(
            new mapboxgl.Popup().setHTML(`<div>📸 ${photo.missionName}</div>`)
          )
        }
        
        marker.addTo(map.current)
        markers.current.push(marker)
      }
    })
  }, [photosHash, createCustomMarker]) // photosHashを使用して安定化

  // ルート表示の更新
  useEffect(() => {
    if (!map.current || !isInitialized.current || !routeGeometry) return

    const source = map.current.getSource('route') as mapboxgl.GeoJSONSource
    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: routeGeometry
      })

      // ルートがある場合は地図をルート全体に合わせる
      if (routeGeometry.coordinates && routeGeometry.coordinates.length > 0) {
        const coordinates = routeGeometry.coordinates
        const bounds = coordinates.reduce((bounds: mapboxgl.LngLatBounds, coord: [number, number]) => {
          return bounds.extend(coord as [number, number])
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]))

        map.current.fitBounds(bounds, {
          padding: 50
        })
      }
    }
  }, [routeGeometry, showRoute])

  if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-6">
          <p className="text-gray-600 mb-2">地図を表示するには</p>
          <p className="text-sm text-gray-500">Mapbox APIキーの設定が必要です</p>
        </div>
      </div>
    )
  }

  return <div ref={mapContainer} className="w-full h-full" />
}