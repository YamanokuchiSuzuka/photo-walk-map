'use client'

import { useEffect, useRef, useCallback, useMemo } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

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
  routeGeometry?: { coordinates: [number, number][] } // Google Maps formatted coordinates
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
  const map = useRef<google.maps.Map | null>(null)
  const markers = useRef<google.maps.Marker[]>([])
  const routeRenderer = useRef<google.maps.Polyline | null>(null)
  const isInitialized = useRef(false)

  // photosの変更を安定化
  const photosHash = useMemo(() => JSON.stringify(photos), [photos])

  const clearMarkers = useCallback(() => {
    markers.current.forEach(marker => marker.setMap(null))
    markers.current = []
  }, [])

  const clearRoute = useCallback(() => {
    if (routeRenderer.current) {
      routeRenderer.current.setMap(null)
      routeRenderer.current = null
    }
  }, [])

  const createMarker = useCallback((
    lat: number, 
    lng: number, 
    type: 'current' | 'start' | 'end' | 'photo',
    title?: string
  ) => {
    if (!map.current) return null

    let icon: google.maps.Icon | google.maps.Symbol

    switch (type) {
      case 'current':
        icon = {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#007cbf',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
          scale: 10
        }
        break
      case 'start':
        icon = {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#10b981',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
          scale: 15
        }
        break
      case 'end':
        icon = {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
          scale: 15
        }
        break
      case 'photo':
        icon = {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#f59e0b',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
          scale: 8
        }
        break
      default:
        icon = {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#6b7280',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
          scale: 8
        }
    }

    const marker = new google.maps.Marker({
      position: { lat, lng },
      map: map.current,
      icon,
      title
    })

    return marker
  }, [])

  const initializeMap = useCallback(async () => {
    if (!mapContainer.current || isInitialized.current) return

    try {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        version: 'weekly',
        libraries: ['geometry']
      })

      await loader.load()

      map.current = new google.maps.Map(mapContainer.current, {
        zoom: 13,
        center: { lat: 35.6762, lng: 139.6503 }, // 東京駅
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      })

      // クリックイベント
      map.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng && onLocationUpdate) {
          const lat = e.latLng.lat()
          const lng = e.latLng.lng()
          onLocationUpdate(lat, lng)
        }
      })

      isInitialized.current = true
    } catch (error) {
      console.error('Google Maps initialization error:', error)
    }
  }, [onLocationUpdate])

  const updateMarkers = useCallback(() => {
    if (!map.current) return

    clearMarkers()
    const newMarkers: google.maps.Marker[] = []

    // スタート地点マーカー
    if (startLat && startLng) {
      const startMarker = createMarker(startLat, startLng, 'start', 'スタート地点')
      if (startMarker) newMarkers.push(startMarker)
    }

    // ゴール地点マーカー
    if (endLat && endLng) {
      const endMarker = createMarker(endLat, endLng, 'end', 'ゴール地点')
      if (endMarker) newMarkers.push(endMarker)
    }

    // 写真マーカー
    photos.forEach(photo => {
      const photoMarker = createMarker(
        photo.lat, 
        photo.lng, 
        'photo', 
        photo.missionName || 'ミッション写真'
      )
      if (photoMarker) newMarkers.push(photoMarker)
    })

    markers.current = newMarkers

    // マップの表示範囲を調整
    if (newMarkers.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      newMarkers.forEach(marker => {
        const position = marker.getPosition()
        if (position) bounds.extend(position)
      })
      map.current.fitBounds(bounds)
    }
  }, [startLat, startLng, endLat, endLng, photosHash, createMarker, clearMarkers])

  const updateRoute = useCallback(() => {
    if (!map.current) return

    clearRoute()

    if (showRoute && routeGeometry?.coordinates && routeGeometry.coordinates.length > 0) {
      const path = routeGeometry.coordinates.map(coord => ({
        lat: coord[1], // Google Maps uses [lat, lng]
        lng: coord[0]
      }))

      const polyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#2563eb',
        strokeOpacity: 1.0,
        strokeWeight: 4,
      })

      polyline.setMap(map.current)
      routeRenderer.current = polyline
    }
  }, [showRoute, routeGeometry, clearRoute])

  // 初期化
  useEffect(() => {
    initializeMap()
  }, [initializeMap])

  // マーカー更新
  useEffect(() => {
    if (isInitialized.current) {
      updateMarkers()
    }
  }, [updateMarkers])

  // ルート更新
  useEffect(() => {
    if (isInitialized.current) {
      updateRoute()
    }
  }, [updateRoute])

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-full min-h-[400px] bg-gray-100 rounded-lg"
      style={{ minHeight: '400px' }}
    />
  )
}