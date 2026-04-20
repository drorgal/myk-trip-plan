import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Stack, Typography, Badge } from 'myk-library'
import styled, { keyframes } from 'styled-components'
import { useTripStore } from '@/stores/tripStore'
import { geocodeDestination } from '@/services/weatherService'
import L from 'leaflet'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

const slide = keyframes`
  from { transform: translateX(100%); }
  to   { transform: translateX(-100%); }
`

const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
`

const MapHeader = styled.div`
  padding: 12px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.gray[200]};
  flex-shrink: 0;
`

const LoadingBar = styled.div`
  height: 3px;
  background: ${({ theme }) => theme.colors.gray[200]};
  overflow: hidden;
  flex-shrink: 0;

  &::after {
    content: '';
    display: block;
    height: 100%;
    width: 40%;
    background: ${({ theme }) => theme.colors.primary[500]};
    animation: ${slide} 1.2s ease-in-out infinite;
  }
`

const MapWrapper = styled.div`
  flex: 1;
  min-height: 0;

  .leaflet-container {
    height: 100%;
    width: 100%;
    background: #e8e8e8;
  }
`

const ErrorBox = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`

export default function Map() {
  const { id } = useParams<{ id: string }>()
  const trip = useTripStore(s => s.trips.find(t => t.id === id))
  const setCoords = useTripStore(s => s.setCoords)

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const initRef = useRef(false)

  useEffect(() => {
    if (!trip || !containerRef.current || initRef.current) return
    initRef.current = true

    let cancelled = false

    async function init() {
      if (!trip || !containerRef.current) return

      let coords = trip.coords ?? null
      if (!coords) {
        coords = await geocodeDestination(trip.destination)
        if (cancelled) return
        if (!coords) { setStatus('error'); return }
        if (id) setCoords(id, coords)
      }
      if (cancelled || !containerRef.current) return

      const map = L.map(containerRef.current, { zoomControl: true })
        .setView([coords.lat, coords.lon], 12)
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      L.marker([coords.lat, coords.lon])
        .addTo(map)
        .bindPopup(`<b>📍 ${trip.destination}</b>`)
        .openPopup()

      if (!cancelled) setStatus('ready')

      for (const acc of trip.accommodations) {
        if (cancelled || !acc.address) continue
        const ac = await geocodeDestination(acc.address)
        if (cancelled || !ac) continue
        L.marker([ac.lat, ac.lon], {
          icon: L.divIcon({ className: '', html: '🏨', iconSize: [24, 24] }),
        }).addTo(map).bindPopup(`<b>${acc.name}</b>`)
      }

      for (const event of trip.days.flatMap(d => d.events.filter(e => e.location))) {
        if (cancelled || !event.location) continue
        const ec = await geocodeDestination(event.location)
        if (cancelled || !ec) continue
        L.marker([ec.lat, ec.lon], {
          icon: L.divIcon({ className: '', html: '📅', iconSize: [24, 24] }),
        }).addTo(map).bindPopup(`<b>${event.title}</b><br/>🕐 ${event.startTime}`)
      }
    }

    init()

    return () => {
      cancelled = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      initRef.current = false
    }
  }, [trip?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!trip) return null

  return (
    <PageWrapper>
      <MapHeader>
        <Stack direction="row" align="center" spacing="sm">
          <Typography variant="h5" style={{ margin: 0 }}>🗺️ מפה</Typography>
          <Badge variant="info" size="sm">{trip.destination}</Badge>
          {trip.accommodations.length > 0 && (
            <Badge size="sm">🏨 {trip.accommodations.length} לינות</Badge>
          )}
          {status === 'loading' && (
            <Typography variant="caption" style={{ opacity: 0.6 }}>מאתר יעד...</Typography>
          )}
        </Stack>
      </MapHeader>

      {status === 'loading' && <LoadingBar />}

      {status === 'error' ? (
        <ErrorBox>
          <Typography variant="body2">לא ניתן למצוא את "{trip.destination}" על המפה</Typography>
        </ErrorBox>
      ) : (
        <MapWrapper>
          <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
        </MapWrapper>
      )}
    </PageWrapper>
  )
}
