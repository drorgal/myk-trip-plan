import type { ID } from './family'
import type { TripCoords } from './trip-plan'

export type TravelMode = 'plane' | 'train' | 'car' | 'bus' | 'boat' | 'other'

export interface RouteStop {
  id: ID
  order: number
  name: string
  daysCount: number
  notes?: string
  coords?: TripCoords
}

export interface TravelLeg {
  id: ID
  fromStopId: ID
  toStopId: ID
  mode: TravelMode
  durationMinutes?: number
  notes?: string
}

export interface RouteFramework {
  stops: RouteStop[]
  legs: TravelLeg[]
}
