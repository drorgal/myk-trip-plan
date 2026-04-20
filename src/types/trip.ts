import type { ID } from './family'

export type TripEventCategory = 'activity' | 'meal' | 'transport' | 'rest' | 'tour'

export interface TripEvent {
  id: ID
  dayId: ID
  startTime: string
  endTime?: string
  title: string
  description?: string
  location?: string
  category: TripEventCategory
  cost?: number
}

export interface TripDay {
  id: ID
  date: string
  label?: string
  events: TripEvent[]
}
