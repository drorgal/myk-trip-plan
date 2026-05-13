import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Stack, Typography, Spinner } from 'myk-library'
import styled, { keyframes } from 'styled-components'
import { useTripStore } from '@/stores/tripStore'
import { useAiStore } from '@/stores/aiStore'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { Plus, Route, Sparkles } from 'lucide-react'
import L from 'leaflet'
import type { RouteStop, TravelLeg, TravelMode } from '@/types/route-framework'
import { sendAiMessage } from '@/services/aiService'
import { geocodeDestination } from '@/services/weatherService'
import { generateId } from '@/utils/id'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

import RouteTimeline from '@/components/route/RouteTimeline'
import RouteStopFormModal from '@/components/route/RouteStopFormModal'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

// ── Marker styles ─────────────────────────────────────────────────────────────
const ROUTE_STYLES = `
.myk-stop-marker {
  width: 44px; height: 44px; border-radius: 50%;
  background: #1c2130; border: 3px solid #f59e0b;
  display: flex; align-items: center; justify-content: center;
  color: #f59e0b; font-weight: 800; font-size: 15px;
  box-shadow: 0 2px 12px rgba(245,158,11,0.5);
}
.myk-stop-label {
  background: rgba(28,33,48,0.85); color: #f59e0b;
  border-radius: 6px; padding: 2px 8px;
  font-size: 11px; font-weight: 700; white-space: nowrap;
  margin-top: 3px; text-align: center; pointer-events: none;
}
.myk-leg-label {
  background: rgba(28,33,48,0.85); color: #cdd9e5;
  border-radius: 10px; padding: 2px 8px;
  font-size: 11px; white-space: nowrap;
  border: 1px solid #30363d; pointer-events: none;
}
`
if (typeof document !== 'undefined' && !document.getElementById('myk-route-styles')) {
  const style = document.createElement('style')
  style.id = 'myk-route-styles'
  style.textContent = ROUTE_STYLES
  document.head.appendChild(style)
}

const MODE_EMOJI: Record<TravelMode, string> = {
  plane: '✈️', train: '🚂', car: '🚗', bus: '🚌', boat: '⛵', other: '🚀',
}

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatDurationShort(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m}ד'`
}

// ── AI response type ──────────────────────────────────────────────────────────
interface AiRouteStop {
  name: string
  daysCount: number
  travelToNext?: {
    mode: TravelMode
    durationMinutes: number
  }
}

function parseAiRoute(text: string): AiRouteStop[] {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try { return JSON.parse(match[0]) as AiRouteStop[] } catch { return [] }
}

// Returns the ISO date string (YYYY-MM-DD) when a leg starts,
// based on trip start date + cumulative days of prior stops.
function legStartDate(tripStartDate: string, stops: AiRouteStop[], legIndex: number): string {
  const daysOffset = stops.slice(0, legIndex + 1).reduce((s, st) => s + st.daysCount, 0)
  const d = new Date(tripStartDate)
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().slice(0, 10)
}

interface CarRentalSlim { company: string; pickupDate: string; dropoffDate: string }

// Returns true if any rental is active (pickup ≤ date ≤ dropoff)
function hasCarOnDate(rentals: CarRentalSlim[], date: string): boolean {
  return rentals.some(r => r.pickupDate <= date && date <= r.dropoffDate)
}

function buildCarRentalContext(rentals: CarRentalSlim[]): string {
  if (!rentals.length) return ''
  const lines = rentals.map(r =>
    `  - ${r.company}: ${r.pickupDate} עד ${r.dropoffDate}`
  ).join('\n')
  return `\n\nהשכרות רכב בטיול:\n${lines}\nאם רגל נסיעה בין עצירות חל בתאריך שיש בו רכב שכור — השתמש ב-mode: "car". אחרת השתמש בתחבורה ציבורית (train, bus) או טיסה לפי ההגיון.`
}

interface FlightSlim { direction: 'outbound' | 'return'; arrivalAirport: string; departureAirport: string }

function buildFlightContext(flights: FlightSlim[]): string {
  const outbound = flights.find(f => f.direction === 'outbound')
  const ret = flights.find(f => f.direction === 'return')
  if (!outbound && !ret) return ''

  const arrivalCity = outbound?.arrivalAirport ?? ''
  const returnFrom = ret?.departureAirport ?? ''

  if (arrivalCity && returnFrom && arrivalCity === returnFrom) {
    return `\n\nטיסות: מגיעים ויוצאים מאותו שדה תעופה (${arrivalCity}). המסלול חייב להיות מעגלי — העצירה האחרונה חייבת לאפשר נסיעה חזרה ל-${arrivalCity} ביום האחרון.`
  }
  if (arrivalCity && returnFrom && arrivalCity !== returnFrom) {
    return `\n\nטיסות: מגיעים ל-${arrivalCity}, יוצאים מ-${returnFrom}. המסלול הוא לינארי — מתחיל ליד ${arrivalCity} ומסתיים ליד ${returnFrom}.`
  }
  if (arrivalCity) {
    return `\n\nנחיתה ב-${arrivalCity} — התחל את המסלול באזור זה.`
  }
  return ''
}

interface FamilyMemberSlim { name: string; isChild: boolean }

function buildFamilyContext(family: FamilyMemberSlim[]): string {
  if (!family.length) return ''
  const children = family.filter(m => m.isChild)
  const adults = family.filter(m => !m.isChild)
  if (!children.length) return ''
  return `\n\nמבנה המשפחה: ${adults.length} מבוגרים + ${children.length} ילדים (${children.map(c => c.name).join(', ')}).
לכן: הצע אזורים ומקומות המתאימים למשפחה עם ילדים — נמנע ממקומות נידחים, טיפוסים מאתגרים, או יעדים שאינם ידידותיים לילדים. העדף ערים עם פארקים, חופים, מוזיאוני ילדים, ומרחקי נסיעה סבירים בין עצירות.`
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

const Header = styled.div<{ $mobile: boolean }>`
  padding: 10px ${({ $mobile }) => ($mobile ? '10px' : '16px')};
  border-bottom: 1px solid ${({ theme }) => theme.colors.gray[200]};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
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
    background: #f59e0b;
    animation: ${slide} 1.2s ease-in-out infinite;
  }
`

const Content = styled.div<{ $mobile: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: ${({ $mobile }) => ($mobile ? 'column' : 'row')};
  min-height: 0;
`

const MapArea = styled.div<{ $mobile: boolean }>`
  flex: ${({ $mobile }) => ($mobile ? '0 0 45%' : '1')};
  position: relative;
  min-height: 0;
  .leaflet-container { height: 100%; width: 100%; background: #e8e8e8; }
`

const TimelineArea = styled.div<{ $mobile: boolean }>`
  flex: ${({ $mobile }) => ($mobile ? '1' : '0 0 340px')};
  border-${({ $mobile }) => ($mobile ? 'top' : 'right')}: 1px solid ${({ theme }) => theme.colors.gray[200]};
  min-height: 0;
  overflow: hidden;
`

const EmptyPanel = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 28px 20px;
  text-align: center;
`

const AiProgressBox = styled.div`
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 1000;
  background: #1c2130;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  color: #cdd9e5;
  font-size: 13px;
  max-width: 280px;
`

const AiErrorBox = styled(AiProgressBox)`
  border-color: #dc2626;
  color: #fca5a5;
`

// ── Component ─────────────────────────────────────────────────────────────────
export default function RouteFramework() {
  const { id } = useParams<{ id: string }>()
  const trip = useTripStore(s => s.trips.find(t => t.id === id))
  const addRouteStop = useTripStore(s => s.addRouteStop)
  const aiStore = useAiStore()
  const { isMobile } = useBreakpoint()

  const [mapStatus, setMapStatus] = useState<'loading' | 'ready'>('loading')
  const [addingStop, setAddingStop] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiProgress, setAiProgress] = useState('')
  const [aiError, setAiError] = useState<string | null>(null)

  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const initRef = useRef(false)
  const routeLayerRef = useRef<L.LayerGroup | null>(null)

  const framework = trip?.routeFramework
  const stops: RouteStop[] = framework ? [...framework.stops].sort((a, b) => a.order - b.order) : []
  const legs: TravelLeg[] = framework?.legs ?? []
  const hasStops = stops.length > 0
  const hasAiKey = aiStore.provider === 'openai' ? !!aiStore.openaiApiKey : true

  // ── Initialize map (always, regardless of stops)
  useEffect(() => {
    if (initRef.current || !containerRef.current || !trip) return
    initRef.current = true

    const center: [number, number] = trip.coords
      ? [trip.coords.lat, trip.coords.lon]
      : [20, 0]
    const zoom = trip.coords ? 6 : 2

    const map = L.map(containerRef.current, { zoomControl: true }).setView(center, zoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    mapRef.current = map
    routeLayerRef.current = L.layerGroup().addTo(map)
    setMapStatus('ready')

    return () => {
      map.remove()
      mapRef.current = null
      initRef.current = false
    }
  }, [trip?.id])

  // ── Redraw route layer whenever stops/legs change
  useEffect(() => {
    const map = mapRef.current
    const layer = routeLayerRef.current
    if (!map || !layer) return

    layer.clearLayers()

    const geocodedStops = stops.filter(s => s.coords)
    const bounds: L.LatLngTuple[] = []

    stops.forEach((stop, i) => {
      if (!stop.coords) return
      const { lat, lon } = stop.coords
      bounds.push([lat, lon])

      L.marker([lat, lon], {
        icon: L.divIcon({
          className: '',
          html: `<div style="display:flex;flex-direction:column;align-items:center">
            <div class="myk-stop-marker">${i + 1}</div>
            <div class="myk-stop-label">${escHtml(stop.name)}<br/>${stop.daysCount} ימים</div>
          </div>`,
          iconAnchor: [22, 22],
          iconSize: [44, 70],
        }),
      })
        .bindPopup(`<div style="direction:rtl;min-width:120px"><b>${escHtml(stop.name)}</b><br/>${stop.daysCount} ימים</div>`)
        .addTo(layer)
    })

    for (let i = 0; i < geocodedStops.length - 1; i++) {
      const from = geocodedStops[i].coords!
      const to = geocodedStops[i + 1].coords!

      L.polyline([[from.lat, from.lon], [to.lat, to.lon]], {
        color: '#f59e0b', weight: 3, dashArray: '8 6', opacity: 0.8,
      }).addTo(layer)

      const leg = legs.find(
        l => l.fromStopId === geocodedStops[i].id && l.toStopId === geocodedStops[i + 1].id
      )
      if (leg) {
        const midLat = (from.lat + to.lat) / 2
        const midLon = (from.lon + to.lon) / 2
        const emoji = MODE_EMOJI[leg.mode]
        const dur = leg.durationMinutes ? ` ${formatDurationShort(leg.durationMinutes)}` : ''

        L.marker([midLat, midLon], {
          icon: L.divIcon({
            className: '',
            html: `<div class="myk-leg-label">${emoji}${dur}</div>`,
            iconAnchor: [30, 12],
          }),
          interactive: false,
        }).addTo(layer)
      }
    }

    if (bounds.length > 1) map.fitBounds(bounds, { padding: [50, 50] })
    else if (bounds.length === 1) map.setView(bounds[0], 9)
  }, [stops, legs])

  // ── AI route suggestion
  async function handleAiSuggest() {
    if (!trip || !hasAiKey || aiLoading) return
    setAiError(null)
    setAiLoading(true)

    const totalDays = trip.days.length
    const rentals: CarRentalSlim[] = (trip.carRentals ?? []).map(r => ({
      company: r.company,
      pickupDate: r.pickupDate,
      dropoffDate: r.dropoffDate,
    }))
    const carContext = buildCarRentalContext(rentals)
    const familyContext = buildFamilyContext(trip.family ?? [])
    const flightContext = buildFlightContext(trip.flights ?? [])

    const prompt = `אתה מומחה תיירות. המשתמש מטייל ב-${trip.destination} למשך ${totalDays} ימים.
הצע מסלול טיול מומלץ עם 3-5 עצירות עיקריות (אזורים, ערים, אזורי טבע).${flightContext}${carContext}${familyContext}

ענה אך ורק ב-JSON תקין בלי markdown, בלי הסברים לפני או אחרי:
[
  {"name": "שם העצירה באנגלית", "daysCount": 3, "travelToNext": {"mode": "train", "durationMinutes": 90}},
  {"name": "שם העצירה באנגלית", "daysCount": 2, "travelToNext": {"mode": "car", "durationMinutes": 45}},
  {"name": "עצירה אחרונה באנגלית", "daysCount": 2}
]

mode יכול להיות: plane, train, car, bus, boat, other.
שם העצירה חייב להיות באנגלית (לצורך מיקום על מפה).
סכום הימים צריך להיות ${totalDays}.`

    try {
      setAiProgress('✨ מבקש המלצות...')
      const reply = await sendAiMessage(
        [{ id: generateId(), role: 'user', content: prompt, timestamp: new Date().toISOString() }],
        trip,
        aiStore
      )

      const parsed = parseAiRoute(reply)
      if (!parsed.length) {
        setAiError('לא הצלחתי לפרסר את תשובת ה-AI. נסה שוב.')
        return
      }

      // Geocode and add each stop
      const countBefore = useTripStore.getState().trips.find(t => t.id === trip.id)
        ?.routeFramework?.stops.length ?? 0

      for (let i = 0; i < parsed.length; i++) {
        const aiStop = parsed[i]
        setAiProgress(`📍 ממקם ${aiStop.name}... (${i + 1}/${parsed.length})`)
        const coords = await geocodeDestination(aiStop.name)
        addRouteStop(trip.id, {
          name: aiStop.name,
          daysCount: aiStop.daysCount,
          coords: coords ?? undefined,
        })
      }

      // Read freshly-added stop IDs from store
      setAiProgress('🔗 מחבר את העצירות...')
      const addTravelLeg = useTripStore.getState().addTravelLeg
      const freshStops = (useTripStore.getState().trips.find(t => t.id === trip.id)
        ?.routeFramework?.stops ?? [])
        .sort((a, b) => a.order - b.order)
        .slice(countBefore)

      for (let i = 0; i < parsed.length - 1; i++) {
        const aiStop = parsed[i]
        if (!freshStops[i] || !freshStops[i + 1]) continue

        // Override mode to "car" if there's a rental active on the leg's estimated date
        const estimatedDate = legStartDate(trip.startDate, parsed, i)
        const aiMode = aiStop.travelToNext?.mode ?? 'car'
        const resolvedMode: TravelMode = hasCarOnDate(rentals, estimatedDate) ? 'car' : aiMode

        addTravelLeg(trip.id, {
          fromStopId: freshStops[i].id,
          toStopId: freshStops[i + 1].id,
          mode: resolvedMode,
          durationMinutes: aiStop.travelToNext?.durationMinutes,
        })
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'שגיאה בקשר ל-AI')
    } finally {
      setAiLoading(false)
      setAiProgress('')
    }
  }

  if (!trip) return null

  return (
    <PageWrapper>
      <Header $mobile={isMobile}>
        <Route size={18} color="#f59e0b" />
        <Typography variant="h6" style={{ fontWeight: 700 }}>מסלול הטיול</Typography>
        <Stack direction="row" spacing="sm" style={{ marginRight: 'auto' }}>
          {hasAiKey && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAiSuggest}
              disabled={aiLoading}
              title="AI ימליץ על מסלול לפי היעד"
            >
              {aiLoading ? <Spinner size="sm" /> : <Sparkles size={14} />}
              {aiLoading ? 'מייצר...' : 'AI: הצע מסלול'}
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => setAddingStop(true)}>
            <Plus size={14} /> הוסף עצירה
          </Button>
        </Stack>
      </Header>

      {mapStatus === 'loading' && <LoadingBar />}

      {/* Always render split-pane so map mounts once and stays mounted */}
      <Content $mobile={isMobile}>
        <MapArea $mobile={isMobile}>
          <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

          {aiLoading && aiProgress && (
            <AiProgressBox>
              <Spinner size="sm" />
              <span>{aiProgress}</span>
            </AiProgressBox>
          )}
          {aiError && (
            <AiErrorBox onClick={() => setAiError(null)} style={{ cursor: 'pointer' }}>
              ⚠️ {aiError}
            </AiErrorBox>
          )}
        </MapArea>

        <TimelineArea $mobile={isMobile}>
          {!hasStops ? (
            <EmptyPanel>
              <div style={{ fontSize: 48 }}>🗺️</div>
              <Typography variant="h6" style={{ fontWeight: 700 }}>
                תכנן את מסלול הטיול
              </Typography>
              <Typography variant="body2" style={{ color: '#888', maxWidth: 260 }}>
                סמן אזורים מרכזיים, כמה ימים בכל מקום, וזמני נסיעה ביניהם
              </Typography>
              <Stack direction="column" spacing="sm" style={{ width: '100%', maxWidth: 220 }}>
                {hasAiKey && (
                  <Button variant="primary" onClick={handleAiSuggest} disabled={aiLoading} style={{ width: '100%' }}>
                    <Sparkles size={14} /> AI: הצע מסלול אוטומטי
                  </Button>
                )}
                <Button variant={hasAiKey ? 'ghost' : 'primary'} onClick={() => setAddingStop(true)} style={{ width: '100%' }}>
                  <Plus size={14} /> הוסף עצירה ידנית
                </Button>
              </Stack>
              {!hasAiKey && (
                <Typography variant="caption" style={{ color: '#888', maxWidth: 260 }}>
                  להצעות AI — הגדר מפתח API בהגדרות
                </Typography>
              )}
            </EmptyPanel>
          ) : (
            <RouteTimeline framework={framework!} tripId={trip.id} />
          )}
        </TimelineArea>
      </Content>

      <RouteStopFormModal
        open={addingStop}
        onClose={() => setAddingStop(false)}
        tripId={trip.id}
      />
    </PageWrapper>
  )
}
