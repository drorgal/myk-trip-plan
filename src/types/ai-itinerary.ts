import type { TripEventCategory } from './trip'

export interface AiSuggestedEvent {
  title: string
  startTime: string
  endTime?: string
  category: TripEventCategory
  location?: string
  lat?: number
  lng?: number
  description?: string
  cost?: number
}

export interface AiSuggestedDay {
  date: string
  dayLabel?: string
  events: AiSuggestedEvent[]
}

export interface AiItinerarySuggestion {
  days: AiSuggestedDay[]
  totalEstimatedCost?: number
  notes?: string
}

export type EventApprovalStatus = 'approved' | 'rejected'

export interface AiItineraryEventState extends AiSuggestedEvent {
  _status: EventApprovalStatus
}

export interface AiItineraryDayState {
  date: string
  dayLabel?: string
  events: AiItineraryEventState[]
}

export type ItineraryBuilderStep = 'idle' | 'constraints' | 'loading' | 'review' | 'done' | 'error'
