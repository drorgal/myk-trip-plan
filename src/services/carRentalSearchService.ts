import type { CarCategory } from '@/types/accommodation'

export interface CarRentalSearchParams {
  pickupLat: number
  pickupLng: number
  dropoffLat?: number
  dropoffLng?: number
  pickupDate: string      // YYYY-MM-DD
  pickupTime?: string     // HH:MM
  dropoffDate: string
  dropoffTime?: string    // HH:MM
  driverAge?: number      // default 30
  currency?: string       // USD | EUR | ILS
}

export interface CarRentalLocation {
  displayName: string
  city: string
  country: string
  lat: number
  lng: number
}

export interface CarRentalOffer {
  offerId: string
  company: string
  companyLogo?: string
  carModel: string
  carCategory: CarCategory
  transmission: 'manual' | 'automatic'
  seats: number
  pricePerDay: number
  totalPrice: number
  currency: string
  includesInsurance: boolean
  fuelPolicy: string
  bookingUrl: string
  rating?: number
  reviewCount?: number
  imageUrl?: string
}

const RAPIDAPI_HOST = 'booking-com15.p.rapidapi.com'
const BASE_URL = `https://${RAPIDAPI_HOST}/api/v1/cars`

function makeHeaders(rapidApiKey: string) {
  return {
    'x-rapidapi-key': rapidApiKey,
    'x-rapidapi-host': RAPIDAPI_HOST,
    'Content-Type': 'application/json',
  }
}

function resolveCarCategory(categoryName: string): CarCategory {
  const name = (categoryName ?? '').toLowerCase()
  if (name.includes('luxury') || name.includes('premium') || name.includes('elite')) return 'luxury'
  if (name.includes('van') || name.includes('minivan')) return 'van'
  if (name.includes('suv') || name.includes('crossover') || name.includes('4x4')) return 'suv'
  if (name.includes('full') || name.includes('standard') || name.includes('large')) return 'full-size'
  if (name.includes('mid') || name.includes('intermediate') || name.includes('medium')) return 'midsize'
  if (name.includes('compact')) return 'compact'
  return 'economy'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOffer(raw: any): CarRentalOffer {
  const vehicle = raw.vehicle_info ?? raw.vehicle ?? raw
  const pricing = raw.pricing_info ?? raw.price_info ?? raw.pricing ?? raw.price ?? {}
  const supplier = raw.supplier_info ?? raw.supplier ?? {}

  const totalPrice =
    pricing.price ?? pricing.total_price ?? pricing.amount ?? raw.total_price ?? 0
  const pricePerDay =
    pricing.price_per_day ?? pricing.daily_price ?? pricing.base_price ?? totalPrice

  return {
    offerId: raw.vehicle_id ?? raw.offer_id ?? raw.id ?? String(Math.random()),
    company: supplier.name ?? raw.supplier_name ?? raw.company ?? 'Unknown',
    companyLogo: supplier.logo ?? supplier.image_url ?? raw.supplier_logo,
    carModel: vehicle.v_name ?? vehicle.name ?? vehicle.model ?? raw.vehicle_name ?? 'רכב',
    carCategory: resolveCarCategory(
      vehicle.group ?? vehicle.category?.name ?? vehicle.vehicle_category ?? raw.category ?? ''
    ),
    transmission: (vehicle.transmission === 'automatic' || vehicle.automaticTransmission || raw.automatic)
      ? 'automatic'
      : 'manual',
    seats: vehicle.seats ?? vehicle.passenger_capacity ?? raw.seats ?? 5,
    pricePerDay: Number(pricePerDay),
    totalPrice: Number(totalPrice),
    currency: pricing.currency ?? pricing.currency_code ?? raw.currency ?? 'USD',
    includesInsurance:
      raw.included_insurance ?? raw.insurance_included ?? pricing.insurance_included ?? false,
    fuelPolicy: raw.fuel_policy ?? vehicle.fuel_policy ?? 'full-to-full',
    bookingUrl: raw.deeplink ?? raw.booking_url ?? raw.url ?? '#',
    rating: raw.content?.rating ?? raw.rating ?? raw.score,
    reviewCount: raw.content?.review_count ?? raw.review_count ?? raw.reviews_count,
    imageUrl: vehicle.image_url ?? vehicle.imageUrl ?? raw.image,
  }
}

export async function searchCarRentalLocations(
  query: string,
  rapidApiKey: string
): Promise<CarRentalLocation[]> {
  const url = `${BASE_URL}/searchDestination?query=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: makeHeaders(rapidApiKey) })
  if (!res.ok) throw new Error(`Location search failed: ${res.status}`)

  const data = await res.json()
  if (!data.status) throw new Error(data.message ?? 'Location search error')

  const list: CarRentalLocation[] = []
  const items = Array.isArray(data.data) ? data.data : []

  for (const item of items) {
    const lat = item.coordinates?.latitude ?? item.latitude ?? item.lat
    const lng = item.coordinates?.longitude ?? item.longitude ?? item.lng
    if (lat == null || lng == null) continue
    list.push({
      displayName: item.label ?? item.name ?? item.city ?? '',
      city: item.city ?? item.name ?? '',
      country: item.country ?? item.country_code ?? '',
      lat: Number(lat),
      lng: Number(lng),
    })
  }
  return list
}

export async function searchCarRentals(
  params: CarRentalSearchParams,
  rapidApiKey: string
): Promise<CarRentalOffer[]> {
  const dropLat = params.dropoffLat ?? params.pickupLat
  const dropLng = params.dropoffLng ?? params.pickupLng

  const qs = new URLSearchParams({
    pick_up_latitude: String(params.pickupLat),
    pick_up_longitude: String(params.pickupLng),
    drop_off_latitude: String(dropLat),
    drop_off_longitude: String(dropLng),
    pick_up_date: params.pickupDate,
    drop_off_date: params.dropoffDate,
    pick_up_time: params.pickupTime ?? '10:00',
    drop_off_time: params.dropoffTime ?? '10:00',
    driver_age: String(params.driverAge ?? 30),
    currency_code: params.currency ?? 'USD',
  })

  const url = `${BASE_URL}/searchCarRentals?${qs.toString()}`
  const res = await fetch(url, { headers: makeHeaders(rapidApiKey) })
  if (!res.ok) throw new Error(`Car rental search failed: ${res.status}`)

  const data = await res.json()
  if (!data.status) throw new Error(data.message ?? 'Car rental search error')

  const list =
    data.data?.search_results ??
    data.data?.results ??
    data.data?.vehicles ??
    (Array.isArray(data.data) ? data.data : [])

  return list.map(mapOffer)
}