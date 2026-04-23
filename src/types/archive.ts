import type { BudgetCategory } from './budget'
import type { PackingCategory } from './packing'

export interface ArchiveRatings {
  food: number
  accommodation: number
  activities: number
  overall: number
}

export interface ArchivedPackingItem {
  title: string
  category: PackingCategory
  wasUseful: boolean | null
}

export interface ArchivedTrip {
  id: string
  name: string
  destination: string
  coverEmoji: string
  startDate: string
  endDate: string
  familySize: number
  adultsCount: number
  childrenCount: number

  budgetPlanned: number
  budgetActual: number
  currency: string
  categoryBreakdown: Partial<Record<BudgetCategory, { planned: number; actual: number }>>

  ratings: ArchiveRatings
  whatWentWell: string
  whatCouldImprove: string
  highlights: string[]

  packingItems: ArchivedPackingItem[]

  archivedAt: string
}
