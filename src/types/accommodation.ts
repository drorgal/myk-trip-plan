import type { ID } from './family'

export type AccommodationType = 'hotel' | 'airbnb' | 'hostel' | 'villa' | 'other'
export type CabinClass = 'economy' | 'business' | 'first'

export interface Accommodation {
  id: ID
  name: string
  type: AccommodationType
  address?: string
  checkIn: string
  checkOut: string
  cost: number
  currency: string
  confirmationNumber?: string
  notes?: string
  rating?: number
}

export interface Flight {
  id: ID
  airline: string
  flightNumber: string
  departureAirport: string
  arrivalAirport: string
  departureTime: string
  arrivalTime: string
  cost: number
  currency: string
  direction: 'outbound' | 'return'
  cabinClass: CabinClass
  confirmationNumber?: string
  baggageIncluded?: boolean
}
