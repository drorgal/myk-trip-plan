import { generateId } from '@/utils/id'
import type { PriceResult, FlightSearchParams, HotelSearchParams, HotelDestination } from '@/types/price-comparison'

const RAPIDAPI_HOST = 'booking-com15.p.rapidapi.com'
const BASE = `https://${RAPIDAPI_HOST}/api/v1`

function makeHeaders(rapidApiKey: string) {
  return {
    'x-rapidapi-key': rapidApiKey,
    'x-rapidapi-host': RAPIDAPI_HOST,
  }
}

// ── Flight destination resolver ───────────────────────────────────────────────

async function resolveFlightDestination(query: string, rapidApiKey: string): Promise<string> {
  const url = `${BASE}/flights/searchDestination?query=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: makeHeaders(rapidApiKey) })
  if (!res.ok) throw new Error(`Flight destination search failed: ${res.status}`)
  const data = await res.json()
  const items: unknown[] = Array.isArray(data.data) ? data.data : []
  if (items.length === 0) throw new Error(`לא נמצא יעד עבור "${query}" — כתוב שם העיר באנגלית (לדוגמה: Vienna, Rome)`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const first = items[0] as any
  return first.id ?? first.code ?? query
}

// ── Flight mapper ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFlightOffer(raw: any, currency: string): PriceResult {
  const seg = raw.segments?.[0] ?? {}
  const leg = seg.legs?.[0] ?? {}
  const carrier = leg.carriersData?.[0] ?? {}
  const depTime: string = leg.departureTime ?? seg.departureTime ?? ''
  const arrTime: string = leg.arrivalTime ?? seg.arrivalTime ?? ''

  const priceInfo = raw.priceBreakdown ?? raw.price ?? {}
  const total = priceInfo.total ?? priceInfo.grossPrice ?? priceInfo ?? {}
  const units: number = total.units ?? total.value ?? total.amount ?? 0
  const nanos: number = total.nanos ?? 0
  const price = units + nanos / 1_000_000_000

  const stops: number = raw.segments?.length > 1
    ? raw.segments.length - 1
    : (raw.totalStops ?? seg.totalTime > 300 ? 1 : 0)

  const durationMin: number = Math.round((seg.totalTime ?? 0) / 60)
  const airline: string = carrier.name ?? carrier.code ?? 'Unknown'
  const flightNum: string = `${carrier.code ?? ''}${leg.flightInfo?.flightNumber ?? leg.flightNumber ?? ''}`

  return {
    id: raw.token ?? raw.offerId ?? generateId(),
    provider: 'booking.com',
    category: 'flight',
    label: `${airline} · ${stops === 0 ? 'ישיר' : `${stops} עצירה`}`,
    price: Math.round(price),
    currency: total.currencyCode ?? currency,
    deepLink: raw.deeplink ?? raw.bookingLink ?? '#',
    rating: raw.score ?? raw.reviewScore,
    metadata: {
      airline,
      flightNumber: flightNum,
      stops,
      durationMinutes: durationMin,
      departureTime: depTime ? depTime.slice(11, 16) : '',
      arrivalTime: arrTime ? arrTime.slice(11, 16) : '',
      cabinClass: raw.travelClass ?? 'economy',
      pricePerPerson: Math.round(price / Math.max(1, raw.adults ?? 1)),
    },
  }
}

// ── Hotel mapper ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapHotelOffer(raw: any, nights: number, currency: string): PriceResult {
  const hotel = raw.property ?? raw.hotel ?? raw
  const priceInfo = hotel.priceBreakdown ?? raw.priceBreakdown ?? raw.price ?? {}
  const gross = priceInfo.grossPrice ?? priceInfo.total ?? priceInfo
  const totalPrice: number = gross.value ?? gross.amount ?? gross.units ?? 0
  const pricePerNight = nights > 0 ? Math.round(totalPrice / nights) : totalPrice

  // qualityClass is the actual star category; propertyClass is often 0
  const stars: number = hotel.qualityClass || hotel.accuratePropertyClass || hotel.propertyClass || 3
  const neighborhood: string = hotel.wishlistName ?? hotel.countryCode ?? ''

  const hotelId = raw.hotel_id ?? hotel.id ?? hotel.hotelId
  const deepLink = raw.deeplink ?? raw.url ??
    (hotel.countryCode && hotelId
      ? `https://www.booking.com/hotel/${hotel.countryCode}/${hotelId}.html`
      : '#')

  return {
    id: String(hotelId ?? generateId()),
    provider: 'booking.com',
    category: 'hotel',
    label: `${hotel.name ?? 'מלון'} · ${'⭐'.repeat(Math.min(Math.round(stars), 5))}`,
    price: Math.round(totalPrice),
    currency: gross.currency ?? gross.currencyCode ?? currency,
    deepLink,
    rating: hotel.reviewScore != null ? Number(hotel.reviewScore) : undefined,
    reviewCount: hotel.reviewCount ?? hotel.reviewsCount,
    imageUrl: hotel.photoUrls?.[0] ?? hotel.mainPhoto?.lowResUrl,
    metadata: {
      stars: Math.round(stars),
      neighborhood,
      pricePerNight,
      nights,
      breakfastIncluded: raw.breakfastIncluded ?? raw.is_breakfast_included ?? raw.breakfast_included ?? false,
      hotelType: 'hotel',
    },
  }
}

// ── Public: flights ───────────────────────────────────────────────────────────

export async function fetchFlightPrices(
  params: FlightSearchParams,
  rapidApiKey: string,
): Promise<PriceResult[]> {
  const [fromId, toId] = await Promise.all([
    resolveFlightDestination(params.origin, rapidApiKey),
    resolveFlightDestination(params.destination, rapidApiKey),
  ])

  const qs = new URLSearchParams({
    fromId,
    toId,
    departDate: params.departureDate,
    adults: String(params.passengers),
    currency_code: params.currency,
  })
  if (params.cabinClass !== 'economy') qs.set('cabinClass', params.cabinClass.toUpperCase())
  if (params.returnDate) qs.set('returnDate', params.returnDate)

  const url = `${BASE}/flights/searchFlights?${qs}`
  const res = await fetch(url, { headers: makeHeaders(rapidApiKey) })
  if (!res.ok) throw new Error(`Flight search failed: ${res.status}`)

  const data = await res.json()
  if (!data.status) throw new Error(data.message ?? 'שגיאה בחיפוש טיסות')

  const offers: unknown[] =
    data.data?.flightOffers ??
    data.data?.offers ??
    (Array.isArray(data.data) ? data.data : [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (offers as any[]).slice(0, 8).map(o => mapFlightOffer(o, params.currency))
}

// ── Public: hotels ────────────────────────────────────────────────────────────

export async function searchHotelDestinations(
  query: string,
  rapidApiKey: string,
): Promise<HotelDestination[]> {
  const url = `${BASE}/hotels/searchDestination?query=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: makeHeaders(rapidApiKey) })
  if (!res.ok) return []
  const data = await res.json()
  if (!data.status || !Array.isArray(data.data)) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.data as any[]).slice(0, 6).map(item => ({
    dest_id: String(item.dest_id ?? item.id ?? ''),
    search_type: item.search_type ?? item.dest_type ?? 'CITY',
    displayName: item.city_name ?? item.label ?? item.name ?? String(item.dest_id ?? ''),
    country: item.country ?? item.country_name ?? '',
  }))
}

async function resolveHotelDestination(
  query: string,
  rapidApiKey: string,
): Promise<{ dest_id: string; search_type: string }> {
  const results = await searchHotelDestinations(query, rapidApiKey)
  if (results.length === 0) throw new Error(`לא נמצא יעד עבור "${query}" — כתוב שם העיר באנגלית (לדוגמה: Vienna, Rome)`)
  return { dest_id: results[0].dest_id, search_type: results[0].search_type }
}

function calcNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(1, Math.round(diff / 86_400_000))
}

export async function fetchHotelPrices(
  params: HotelSearchParams,
  rapidApiKey: string,
): Promise<PriceResult[]> {
  const { dest_id, search_type } = params.destId
    ? { dest_id: params.destId, search_type: params.searchType ?? 'CITY' }
    : await resolveHotelDestination(params.destination, rapidApiKey)
  const nights = calcNights(params.checkIn, params.checkOut)

  const qs = new URLSearchParams({
    dest_id,
    search_type,
    arrival_date: params.checkIn,
    departure_date: params.checkOut,
    adults: String(params.guests),
    currency_code: params.currency,
    room_qty: '1',
  })

  const url = `${BASE}/hotels/searchHotels?${qs}`
  const res = await fetch(url, { headers: makeHeaders(rapidApiKey) })
  if (!res.ok) throw new Error(`Hotel search failed: ${res.status}`)

  const data = await res.json()
  if (!data.status) throw new Error(data.message ?? 'שגיאה בחיפוש מלונות')

  const hotels: unknown[] =
    data.data?.hotels ??
    data.data?.result ??
    (Array.isArray(data.data) ? data.data : [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (hotels as any[]).slice(0, 20).map(h => mapHotelOffer(h, nights, params.currency))
}
