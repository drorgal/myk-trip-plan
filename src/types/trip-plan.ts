import type { TripDay } from './trip'
import type { Budget } from './budget'
import type { Accommodation, Flight } from './accommodation'
import type { FamilyMember, ID } from './family'

export interface TripPlan {
  id: ID
  name: string
  destination: string
  startDate: string
  endDate: string
  coverEmoji: string
  family: FamilyMember[]
  days: TripDay[]
  budget: Budget
  accommodations: Accommodation[]
  flights: Flight[]
  createdAt: string
  updatedAt: string
}
