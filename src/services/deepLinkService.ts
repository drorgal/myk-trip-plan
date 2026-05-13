export interface FlightLinkParams {
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  passengers?: number
}

export interface HotelLinkParams {
  destination: string
  checkIn: string
  checkOut: string
  guests?: number
}

export interface CarLinkParams {
  destination: string
  pickupDate: string
  dropoffDate: string
}

export function buildFlightLink({ origin, destination, departureDate, returnDate, passengers = 1 }: FlightLinkParams): string {
  const q = [
    `flights from ${origin || 'TLV'} to ${destination}`,
    `on ${departureDate}`,
    returnDate ? `return ${returnDate}` : '',
    `${passengers} passenger${passengers > 1 ? 's' : ''}`,
  ].filter(Boolean).join(' ')
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`
}

export function buildHotelLink({ destination, checkIn, checkOut, guests = 2 }: HotelLinkParams): string {
  const qs = new URLSearchParams({
    ss: destination,
    checkin: checkIn,
    checkout: checkOut,
    group_adults: String(guests),
    no_rooms: '1',
  })
  return `https://www.booking.com/searchresults.html?${qs}`
}

export function buildCarLink({ destination, pickupDate, dropoffDate }: CarLinkParams): string {
  // Kayak: /cars/{city}/{YYYY-MM-DD}-10h00/{YYYY-MM-DD}-10h00
  const loc = encodeURIComponent(destination.trim())
  return `https://www.kayak.com/cars/${loc}/${pickupDate}-10h00/${dropoffDate}-10h00`
}
