import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Stack, Typography, Badge, Button, Spinner } from 'myk-library'
import styled, { keyframes } from 'styled-components'
import { useTripStore } from '@/stores/tripStore'
import { useAiStore } from '@/stores/aiStore'
import { geocodeDestination } from '@/services/weatherService'
import { sendAiMessage } from '@/services/aiService'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { List, X, Sparkles } from 'lucide-react'
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

// ── Marker CSS injected once ──────────────────────────────────────────────────
const MARKER_STYLES = `
.myk-marker {
  display: flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: 20px;
  font-weight: 600; font-size: 12px; white-space: nowrap;
  cursor: pointer;
}
.myk-marker-hotel {
  background: #1c2130; border: 2px solid #f59e0b;
  color: #f59e0b; box-shadow: 0 2px 8px rgba(245,158,11,0.35);
}
.myk-marker-event {
  background: #1c2130; border: 2px solid #60a5fa;
  color: #60a5fa; box-shadow: 0 2px 8px rgba(96,165,250,0.3);
}
.myk-marker-ai {
  background: #1c2130; border: 2px solid #a78bfa;
  color: #a78bfa; box-shadow: 0 2px 8px rgba(167,139,250,0.3);
}
`
if (typeof document !== 'undefined' && !document.getElementById('myk-map-styles')) {
  const style = document.createElement('style')
  style.id = 'myk-map-styles'
  style.textContent = MARKER_STYLES
  document.head.appendChild(style)
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface AiSuggestion {
  name: string
  address: string
  type: string
  description: string
  coords?: { lat: number; lon: number }
}

// ── Styled components ─────────────────────────────────────────────────────────
const slide = keyframes`
  from { transform: translateX(100%); }
  to   { transform: translateX(-100%); }
`

const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
`

const MapHeader = styled.div<{ $mobile: boolean }>`
  padding: 10px ${({ $mobile }) => ($mobile ? '10px' : '16px')};
  border-bottom: 1px solid ${({ theme }) => theme.colors.gray[200]};
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
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

const MapArea = styled.div`
  flex: 1;
  position: relative;
  min-height: 0;
`

const MapWrapper = styled.div`
  position: absolute;
  inset: 0;
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

const SidebarPanel = styled.div<{ $open: boolean }>`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 260px;
  background: ${({ theme }) => theme.colors.gray[50]};
  border-left: 1px solid ${({ theme }) => theme.colors.gray[200]};
  z-index: 1000;
  overflow-y: auto;
  transform: translateX(${({ $open }) => ($open ? '0' : '100%')});
  transition: transform 0.25s ease;
  display: flex;
  flex-direction: column;
`

const SidebarHeader = styled.div`
  padding: 12px 14px 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.gray[200]};
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`

const SidebarSection = styled.div`
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.gray[100]};
`

const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.gray[500]};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0 14px 4px;
`

const LocationRow = styled.button`
  width: 100%;
  text-align: right;
  background: none;
  border: none;
  padding: 6px 14px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.gray[800]};
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: background 0.1s;

  &:hover {
    background: ${({ theme }) => theme.colors.gray[100]};
  }
`

const LocationSub = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.gray[500]};
`

const AiPanel = styled.div<{ $visible: boolean }>`
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 999;
  background: ${({ theme }) => theme.colors.gray[50]};
  border: 1px solid ${({ theme }) => theme.colors.gray[200]};
  border-radius: 12px;
  padding: 12px;
  max-width: 280px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  display: ${({ $visible }) => ($visible ? 'block' : 'none')};
`

// ── Helpers ───────────────────────────────────────────────────────────────────
function hotelIcon(name: string) {
  return L.divIcon({
    className: '',
    html: `<div class="myk-marker myk-marker-hotel">🏨 ${escHtml(name)}</div>`,
    iconAnchor: [0, 24],
  })
}

function eventIcon(title: string) {
  return L.divIcon({
    className: '',
    html: `<div class="myk-marker myk-marker-event">📅 ${escHtml(title)}</div>`,
    iconAnchor: [0, 24],
  })
}

function aiIcon(name: string) {
  return L.divIcon({
    className: '',
    html: `<div class="myk-marker myk-marker-ai">✨ ${escHtml(name)}</div>`,
    iconAnchor: [0, 24],
  })
}

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function parseAiJson(text: string): AiSuggestion[] {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try { return JSON.parse(match[0]) as AiSuggestion[] } catch { return [] }
}

function fmt(date: string) {
  return date ? date.slice(5).replace('-', '.') : ''
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Map() {
  const { id } = useParams<{ id: string }>()
  const trip = useTripStore(s => s.trips.find(t => t.id === id))
  const setCoords = useTripStore(s => s.setCoords)
  const aiStore = useAiStore()

  const { isMobile } = useBreakpoint()
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [visibleLayers, setVisibleLayers] = useState({ hotels: true, events: true, ai: true })
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([])
  const [aiError, setAiError] = useState<string | null>(null)

  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const initRef = useRef(false)

  // Layer groups
  const layersRef = useRef<{ hotels: L.LayerGroup; events: L.LayerGroup; ai: L.LayerGroup } | null>(null)

  // Marker refs for sidebar fly-to
  const hotelMarkersRef = useRef<Record<string, L.Marker>>({})
  const eventMarkersRef = useRef<Record<string, L.Marker>>({})
  const aiMarkersRef = useRef<Record<string, L.Marker>>({})

  const missingAddress = trip?.accommodations.filter(a => !a.address).length ?? 0
  const hasAiKey = aiStore.provider === 'openai' ? !!aiStore.openaiApiKey : true

  // ── Toggle layer visibility
  function toggleLayer(layer: keyof typeof visibleLayers) {
    if (!layersRef.current || !mapRef.current) return
    const map = mapRef.current
    const group = layersRef.current[layer]
    const next = !visibleLayers[layer]
    if (next) group.addTo(map)
    else group.remove()
    setVisibleLayers(v => ({ ...v, [layer]: next }))
  }

  // ── AI suggestions
  async function handleAiSuggest() {
    if (!trip || !hasAiKey || aiLoading) return
    setAiError(null)
    setAiLoading(true)

    const childCount = trip.family.filter(m => m.emoji && ['👦','👧','🧒','👶'].includes(m.emoji)).length
    const familyNote = childCount > 0 ? `משפחה עם ${childCount} ילדים` : 'קבוצה משפחתית'

    const prompt = `הצע לי 5 מקומות מעניינים לבקר ב-${trip.destination} המתאימים ל${familyNote}.
ענה אך ורק ב-JSON תקין (ללא markdown, ללא הסברים לפני או אחרי) בפורמט:
[{"name":"...","address":"כתובת מלאה כולל עיר","type":"מוזיאון/מסעדה/פארק/אטרקציה","description":"משפט קצר"}]`

    try {
      const reply = await sendAiMessage(
        [{ id: 'q', role: 'user', content: prompt, timestamp: new Date().toISOString() }],
        trip,
        aiStore
      )
      const suggestions = parseAiJson(reply)
      if (!suggestions.length) { setAiError('לא הצלחתי לקבל המלצות. נסה שוב.'); return }

      const results: AiSuggestion[] = []
      for (const s of suggestions) {
        const coords = await geocodeDestination(s.address || `${s.name}, ${trip.destination}`)
        results.push({ ...s, coords: coords ?? undefined })
        if (coords && layersRef.current) {
          const marker = L.marker([coords.lat, coords.lon], { icon: aiIcon(s.name) })
            .bindPopup(`<div style="direction:rtl;min-width:140px"><b>✨ ${escHtml(s.name)}</b><br/><i>${escHtml(s.type)}</i><br/>${escHtml(s.description)}</div>`)
          layersRef.current.ai.addLayer(marker)
          aiMarkersRef.current[s.name] = marker
        }
      }
      setAiSuggestions(results)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'שגיאה')
    } finally {
      setAiLoading(false)
    }
  }

  // ── Map init
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

      const map = L.map(containerRef.current, { zoomControl: true }).setView([coords.lat, coords.lon], 12)
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Destination marker
      L.marker([coords.lat, coords.lon])
        .addTo(map)
        .bindPopup(`<b>📍 ${trip.destination}</b>`)
        .openPopup()

      // Layer groups
      const hotelLayer = L.layerGroup().addTo(map)
      const eventLayer = L.layerGroup().addTo(map)
      const aiLayer = L.layerGroup().addTo(map)
      layersRef.current = { hotels: hotelLayer, events: eventLayer, ai: aiLayer }

      if (!cancelled) setStatus('ready')

      // Hotels
      for (const acc of trip.accommodations) {
        if (cancelled || !acc.address) continue
        const ac = await geocodeDestination(acc.address)
        if (cancelled || !ac) continue
        const popup = `<div style="direction:rtl;min-width:160px">
          <b>🏨 ${escHtml(acc.name)}</b><br/>
          📅 ${fmt(acc.checkIn)} → ${fmt(acc.checkOut)}<br/>
          💰 ${acc.cost} ${acc.currency}
          ${acc.rating ? `<br/>⭐ ${acc.rating}` : ''}
        </div>`
        const marker = L.marker([ac.lat, ac.lon], { icon: hotelIcon(acc.name) })
          .bindPopup(popup)
        hotelLayer.addLayer(marker)
        hotelMarkersRef.current[acc.id] = marker
      }

      // Events
      for (const day of trip.days) {
        for (const event of day.events) {
          if (cancelled || !event.location) continue
          const ec = await geocodeDestination(event.location)
          if (cancelled || !ec) continue
          const popup = `<div style="direction:rtl"><b>📅 ${escHtml(event.title)}</b><br/>🕐 ${event.startTime}<br/>📍 ${escHtml(event.location)}</div>`
          const marker = L.marker([ec.lat, ec.lon], { icon: eventIcon(event.title) })
            .bindPopup(popup)
          eventLayer.addLayer(marker)
          eventMarkersRef.current[event.id] = marker
        }
      }
    }

    init()

    return () => {
      cancelled = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      layersRef.current = null
      hotelMarkersRef.current = {}
      eventMarkersRef.current = {}
      aiMarkersRef.current = {}
      initRef.current = false
    }
  }, [trip?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!trip) return null

  const eventsWithLocation = trip.days.flatMap(d => d.events.filter(e => e.location))

  return (
    <PageWrapper>
      <MapHeader $mobile={isMobile}>
        <Stack direction="row" align="center" spacing="sm" style={{ flexWrap: 'wrap', gap: 6 }}>
          <Typography variant="h5" style={{ margin: 0 }}>🗺️ מפה</Typography>
          <Badge variant="info" size="sm">{trip.destination}</Badge>

          {/* Missing address warning */}
          {missingAddress > 0 && (
            <Badge variant="warning" size="sm">⚠️ {missingAddress} לינות ללא כתובת</Badge>
          )}

          {/* Layer toggles */}
          {trip.accommodations.length > 0 && (
            <Button
              size="sm"
              variant={visibleLayers.hotels ? 'primary' : 'ghost'}
              onClick={() => toggleLayer('hotels')}
              title="הצג/הסתר לינות"
            >
              🏨 לינות
            </Button>
          )}
          {eventsWithLocation.length > 0 && (
            <Button
              size="sm"
              variant={visibleLayers.events ? 'primary' : 'ghost'}
              onClick={() => toggleLayer('events')}
              title="הצג/הסתר אירועים"
            >
              📅 אירועים
            </Button>
          )}
          {aiSuggestions.length > 0 && (
            <Button
              size="sm"
              variant={visibleLayers.ai ? 'primary' : 'ghost'}
              onClick={() => toggleLayer('ai')}
              title="הצג/הסתר הצעות AI"
            >
              ✨ AI
            </Button>
          )}

          {/* Sidebar toggle */}
          <Button size="sm" variant="ghost" onClick={() => setSidebarOpen(o => !o)} title="רשימת מקומות">
            <List size={16} />
          </Button>

          {/* AI suggest button */}
          {hasAiKey ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAiSuggest}
              disabled={aiLoading}
              startIcon={aiLoading ? <Spinner size="sm" /> : <Sparkles size={14} />}
            >
              {aiLoading ? 'טוען...' : 'AI מציע מקומות'}
            </Button>
          ) : (
            <Badge size="sm">🤖 הגדר AI בפרופיל</Badge>
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
        <MapArea>
          <MapWrapper>
            <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
          </MapWrapper>

          {/* Sidebar */}
          <SidebarPanel $open={sidebarOpen}>
            <SidebarHeader>
              <Typography variant="body2" style={{ fontWeight: 700 }}>📍 מקומות</Typography>
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={16} />
              </button>
            </SidebarHeader>

            {trip.accommodations.some(a => a.address) && (
              <SidebarSection>
                <SectionLabel>🏨 לינות</SectionLabel>
                {trip.accommodations.filter(a => a.address).map(acc => (
                  <LocationRow
                    key={acc.id}
                    onClick={() => {
                      const m = hotelMarkersRef.current[acc.id]
                      if (m && mapRef.current) {
                        const ll = m.getLatLng()
                        mapRef.current.flyTo(ll, 16)
                        m.openPopup()
                      }
                    }}
                  >
                    <span>{acc.name}</span>
                    <LocationSub>{fmt(acc.checkIn)} → {fmt(acc.checkOut)}</LocationSub>
                  </LocationRow>
                ))}
              </SidebarSection>
            )}

            {eventsWithLocation.length > 0 && (
              <SidebarSection>
                <SectionLabel>📅 אירועים</SectionLabel>
                {trip.days.flatMap(d => d.events.filter(e => e.location).map(ev => (
                  <LocationRow
                    key={ev.id}
                    onClick={() => {
                      const m = eventMarkersRef.current[ev.id]
                      if (m && mapRef.current) {
                        mapRef.current.flyTo(m.getLatLng(), 16)
                        m.openPopup()
                      }
                    }}
                  >
                    <span>{ev.title}</span>
                    <LocationSub>{d.date.slice(5).replace('-','.')} {ev.startTime}</LocationSub>
                  </LocationRow>
                )))}
              </SidebarSection>
            )}

            {aiSuggestions.length > 0 && (
              <SidebarSection>
                <SectionLabel>✨ הצעות AI</SectionLabel>
                {aiSuggestions.filter(s => s.coords).map(s => (
                  <LocationRow
                    key={s.name}
                    onClick={() => {
                      const m = aiMarkersRef.current[s.name]
                      if (m && mapRef.current) {
                        mapRef.current.flyTo(m.getLatLng(), 16)
                        m.openPopup()
                      }
                    }}
                  >
                    <span>{s.name}</span>
                    <LocationSub>{s.type} — {s.description}</LocationSub>
                  </LocationRow>
                ))}
              </SidebarSection>
            )}
          </SidebarPanel>

          {/* AI error panel */}
          {aiError && (
            <AiPanel $visible>
              <Typography variant="body2" style={{ color: '#ef4444', fontSize: 13 }}>
                ⚠️ {aiError}
              </Typography>
            </AiPanel>
          )}
        </MapArea>
      )}
    </PageWrapper>
  )
}
