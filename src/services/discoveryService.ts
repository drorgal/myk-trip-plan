import type { Attraction, AttractionCategory } from '@/types/discovery'
import type { TripEventCategory } from '@/types/trip'
import { fetchFreeAttractions } from './freeAttractionService'

const RAPIDAPI_HOST = 'booking-com15.p.rapidapi.com'
const BASE = `https://${RAPIDAPI_HOST}/api/v1/attraction`

function makeHeaders(rapidApiKey: string) {
  return {
    'x-rapidapi-key': rapidApiKey,
    'x-rapidapi-host': RAPIDAPI_HOST,
  }
}

// ── Category inference ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inferCategory(raw: any): AttractionCategory {
  const tags: string[] = (raw.productTagCategories ?? raw.categories ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((t: any) => (t.name ?? t.label ?? t.id ?? '').toLowerCase())
  const name = (raw.name ?? '').toLowerCase()
  const desc = (raw.shortDescription ?? raw.description ?? '').toLowerCase()
  const all = [...tags, name, desc].join(' ')

  if (all.match(/museum|art gallery|gallery|exhibit/)) return 'museum'
  if (all.match(/beach|sea|ocean|coast|swimming/)) return 'beach'
  if (all.match(/park|garden|nature|hiking|trail|forest/)) return 'park'
  if (all.match(/food|restaurant|dining|cooking|cuisine|wine|tasting/)) return 'restaurant'
  if (all.match(/shopping|market|bazaar|outlet|mall/)) return 'shopping'
  if (all.match(/show|theater|theatre|entertainment|concert|circus|amusement/)) return 'entertainment'
  return 'landmark'
}

function inferPriceLevel(amount: number): 1 | 2 | 3 | 4 {
  if (amount <= 0) return 1
  if (amount <= 25) return 1
  if (amount <= 60) return 2
  if (amount <= 120) return 3
  return 4
}

// ── Mapper ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProduct(raw: any): Attraction {
  const photo = raw.primaryPhoto ?? raw.coverPhoto ?? raw.photos?.[0] ?? {}
  const imageUrl: string = photo.medium ?? photo.small ?? photo.large ?? photo.url ?? ''
  const priceInfo = raw.representativePrice ?? raw.price ?? {}
  const priceAmount: number = priceInfo.chargeAmount ?? priceInfo.amount ?? priceInfo.value ?? 0
  const stats = raw.reviewsStats?.combinedNumericStats ?? raw.reviewStats ?? {}

  return {
    id: String(raw.id ?? raw.productId ?? Math.random()),
    name: raw.name ?? raw.title ?? 'אטרקציה',
    category: inferCategory(raw),
    description: raw.shortDescription ?? raw.description,
    location: raw.ufiDetails?.bCityName ?? raw.cityName ?? raw.location ?? '',
    rating: stats.average ?? stats.score ?? raw.reviewScore,
    reviewCount: stats.total ?? stats.count ?? raw.reviewCount,
    priceLevel: inferPriceLevel(priceAmount),
    estimatedDuration: raw.durationInMinutes ?? raw.duration,
    openingHours: raw.openingHours ?? raw.schedule,
    googleMapsUrl: raw.mapUrl ?? (raw.ufiDetails?.url
      ? `https://www.google.com/maps/search/${encodeURIComponent(raw.name ?? '')}`
      : undefined),
    reviews: [],
    media: imageUrl ? [{ url: imageUrl, caption: raw.name, type: 'image' }] : [],
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchAttractions(
  destination: string,
  rapidApiKey: string,
  category?: AttractionCategory,
): Promise<Attraction[]> {
  if (!rapidApiKey) {
    return fetchFreeAttractions(destination, category)
  }

  // Step 1: resolve location ID
  const locUrl = `${BASE}/searchAttractionLocation?query=${encodeURIComponent(destination)}&currency_code=USD`
  const locRes = await fetch(locUrl, { headers: makeHeaders(rapidApiKey) })
  if (!locRes.ok) throw new Error(`Attraction location search failed: ${locRes.status}`)
  const locData = await locRes.json()
  if (!locData.status) throw new Error(locData.message ?? 'שגיאה בחיפוש מיקום')

  const locations: unknown[] = Array.isArray(locData.data) ? locData.data : []
  if (locations.length === 0) throw new Error(`לא נמצא מיקום עבור "${destination}" — כתוב שם העיר באנגלית (לדוגמה: Vienna, Rome)`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const locationId: string = String((locations[0] as any).id ?? '')

  // Step 2: search attractions
  const qs = new URLSearchParams({
    id: locationId,
    currency_code: 'USD',
    languagecode: 'he',
  })
  const url = `${BASE}/searchAttractions?${qs}`
  const res = await fetch(url, { headers: makeHeaders(rapidApiKey) })
  if (!res.ok) throw new Error(`Attraction search failed: ${res.status}`)

  const data = await res.json()
  if (!data.status) throw new Error(data.message ?? 'שגיאה בחיפוש אטרקציות')

  const products: unknown[] =
    data.data?.products ??
    data.data?.attractions ??
    data.data?.results ??
    (Array.isArray(data.data) ? data.data : [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped = (products as any[]).slice(0, 20).map(mapProduct)
  return category ? mapped.filter(a => a.category === category) : mapped
}

// ── Mapping to TripEvent ──────────────────────────────────────────────────────

const CATEGORY_MAP: Record<AttractionCategory, TripEventCategory> = {
  museum: 'activity',
  park: 'activity',
  restaurant: 'meal',
  landmark: 'tour',
  beach: 'activity',
  shopping: 'activity',
  entertainment: 'activity',
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function attractionToEvent(attraction: Attraction) {
  const startTime = '10:00'
  return {
    title: attraction.name,
    description: attraction.description,
    location: attraction.location,
    category: CATEGORY_MAP[attraction.category],
    startTime,
    endTime: attraction.estimatedDuration
      ? addMinutes(startTime, attraction.estimatedDuration)
      : undefined,
    cost: attraction.priceLevel ? attraction.priceLevel * 25 : undefined,
  }
}
