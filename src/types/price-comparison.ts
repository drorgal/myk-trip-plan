export type PriceProvider =
  | 'skyscanner'
  | 'kayak'
  | 'expedia'
  | 'kiwi.com'
  | 'momondo'
  | 'booking.com'
  | 'hotels.com'
  | 'airbnb'
  | 'agoda'
  | 'rentalcars'

export type PriceCategory = 'flight' | 'hotel' | 'car'

export interface PriceResult {
  id: string
  provider: PriceProvider
  category: PriceCategory
  label: string
  price: number
  currency: string
  deepLink: string
  rating?: number
  reviewCount?: number
  imageUrl?: string
  metadata?: Record<string, string | number | boolean>
}

export interface FlightSearchParams {
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  cabinClass: 'economy' | 'business' | 'first'
  passengers: number
  currency: string
}

export interface HotelSearchParams {
  destination: string
  checkIn: string
  checkOut: string
  guests: number
  currency: string
  destId?: string
  searchType?: string
}

export interface HotelDestination {
  dest_id: string
  search_type: string
  displayName: string
  country?: string
}
