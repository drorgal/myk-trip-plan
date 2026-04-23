import type { ArchivedTrip } from '@/types/archive'
import type { BudgetCategory } from '@/types/budget'

export interface FamilyTravelProfile {
  totalTrips: number
  totalDays: number
  destinations: string[]

  avgDurationDays: number
  avgFamilySize: number
  avgDailyBudgetPerPerson: number

  budgetAccuracyPct: number
  avgOverspendPct: number

  topCategories: Array<{ category: BudgetCategory; avgSpend: number }>
  categoryAccuracy: Partial<Record<BudgetCategory, number>>

  avgRatings: {
    food: number
    accommodation: number
    activities: number
    overall: number
  }

  packingWinRate: number
  alwaysPackItems: string[]
  neverPackItems: string[]

  familyType: string
  familyBadge: string
}

export interface BudgetPrediction {
  suggested: number
  basedOnTrips: number
  avgDailyPerPerson: number
  confidence: 'high' | 'medium' | 'low'
}

function avg(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((s, n) => s + n, 0) / nums.length
}

function classifyFamilyType(profile: Omit<FamilyTravelProfile, 'familyType' | 'familyBadge'>): { type: string; badge: string } {
  const { avgRatings, avgDurationDays, avgDailyBudgetPerPerson, budgetAccuracyPct } = profile

  if (avgRatings.activities >= 4 && avgDurationDays >= 10) return { type: 'הרפתקנים', badge: '🏔️ Adventure Seekers' }
  if (avgRatings.food >= 4.5) return { type: 'גורמה', badge: '🍽️ Food Explorers' }
  if (avgRatings.accommodation >= 4.5) return { type: 'מפנקים עצמם', badge: '🏨 Comfort First' }
  if (budgetAccuracyPct <= 110 && avgDailyBudgetPerPerson < 200) return { type: 'חכמי תקציב', badge: '💡 Smart Travelers' }
  if (avgDurationDays <= 5) return { type: 'בורחים לסופ"ש', badge: '⚡ Quick Escape' }
  if (avgDailyBudgetPerPerson >= 400) return { type: 'לוקסוס', badge: '✨ Premium Family' }
  return { type: 'מטיילים משפחתיים', badge: '👨‍👩‍👧‍👦 Family Travelers' }
}

export function computeFamilyProfile(trips: ArchivedTrip[]): FamilyTravelProfile | null {
  if (!trips.length) return null

  const totalTrips = trips.length
  const totalDays = trips.reduce((s, t) => {
    const days = Math.max(1, Math.round((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / 86400000) + 1)
    return s + days
  }, 0)
  const avgDurationDays = Math.round(totalDays / totalTrips)
  const avgFamilySize = Math.round(avg(trips.map(t => t.familySize || 1)))
  const destinations = [...new Set(trips.map(t => t.destination))]

  // Budget analysis
  const tripsWithBudget = trips.filter(t => t.budgetPlanned > 0 && t.budgetActual > 0)
  const budgetAccuracies = tripsWithBudget.map(t => (t.budgetActual / t.budgetPlanned) * 100)
  const budgetAccuracyPct = Math.round(avg(budgetAccuracies))
  const avgOverspendPct = Math.round(avg(budgetAccuracies.map(p => Math.max(0, p - 100))))

  const dailyBudgetsPerPerson = trips
    .filter(t => t.budgetActual > 0 && t.familySize > 0)
    .map(t => {
      const days = Math.max(1, Math.round((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / 86400000) + 1)
      return t.budgetActual / days / t.familySize
    })
  const avgDailyBudgetPerPerson = Math.round(avg(dailyBudgetsPerPerson))

  // Category analysis
  const categoryTotals: Partial<Record<BudgetCategory, number[]>> = {}
  const categoryPlanned: Partial<Record<BudgetCategory, number[]>> = {}
  for (const trip of trips) {
    for (const [cat, vals] of Object.entries(trip.categoryBreakdown ?? {})) {
      const c = cat as BudgetCategory
      if (!categoryTotals[c]) categoryTotals[c] = []
      if (!categoryPlanned[c]) categoryPlanned[c] = []
      categoryTotals[c]!.push(vals.actual)
      categoryPlanned[c]!.push(vals.planned)
    }
  }
  const topCategories = (Object.entries(categoryTotals) as [BudgetCategory, number[]][])
    .map(([category, vals]) => ({ category, avgSpend: Math.round(avg(vals)) }))
    .filter(c => c.avgSpend > 0)
    .sort((a, b) => b.avgSpend - a.avgSpend)
    .slice(0, 4)

  const categoryAccuracy: Partial<Record<BudgetCategory, number>> = {}
  for (const [cat, actuals] of Object.entries(categoryTotals) as [BudgetCategory, number[]][]) {
    const planned = categoryPlanned[cat] ?? []
    if (planned.length && actuals.length) {
      const pairs = actuals.map((a, i) => planned[i] > 0 ? (a / planned[i]) * 100 : null).filter(Boolean) as number[]
      if (pairs.length) categoryAccuracy[cat] = Math.round(avg(pairs))
    }
  }

  // Ratings
  const avgRatings = {
    food: parseFloat(avg(trips.map(t => t.ratings?.food ?? 0).filter(Boolean)).toFixed(1)),
    accommodation: parseFloat(avg(trips.map(t => t.ratings?.accommodation ?? 0).filter(Boolean)).toFixed(1)),
    activities: parseFloat(avg(trips.map(t => t.ratings?.activities ?? 0).filter(Boolean)).toFixed(1)),
    overall: parseFloat(avg(trips.map(t => t.ratings?.overall ?? 0).filter(Boolean)).toFixed(1)),
  }

  // Packing intelligence
  const itemStats: Record<string, { useful: number; total: number }> = {}
  for (const trip of trips) {
    for (const item of trip.packingItems ?? []) {
      if (item.wasUseful === null) continue
      if (!itemStats[item.title]) itemStats[item.title] = { useful: 0, total: 0 }
      itemStats[item.title].total++
      if (item.wasUseful) itemStats[item.title].useful++
    }
  }
  const reviewed = Object.entries(itemStats).filter(([, s]) => s.total >= 2)
  const alwaysPackItems = reviewed.filter(([, s]) => s.useful / s.total >= 0.8).map(([title]) => title)
  const neverPackItems = reviewed.filter(([, s]) => s.useful / s.total <= 0.2).map(([title]) => title)
  const allReviewed = Object.values(itemStats)
  const packingWinRate = allReviewed.length
    ? Math.round((allReviewed.reduce((s, v) => s + v.useful, 0) / allReviewed.reduce((s, v) => s + v.total, 0)) * 100)
    : 0

  const base: Omit<FamilyTravelProfile, 'familyType' | 'familyBadge'> = {
    totalTrips, totalDays, destinations,
    avgDurationDays, avgFamilySize, avgDailyBudgetPerPerson,
    budgetAccuracyPct, avgOverspendPct,
    topCategories, categoryAccuracy,
    avgRatings,
    packingWinRate, alwaysPackItems, neverPackItems,
  }

  const { type, badge } = classifyFamilyType(base)
  return { ...base, familyType: type, familyBadge: badge }
}

export function predictBudget(
  trips: ArchivedTrip[],
  days: number,
  familySize: number
): BudgetPrediction | null {
  const relevant = trips.filter(t => t.budgetActual > 0 && t.familySize > 0)
  if (!relevant.length) return null

  const dailyPerPerson = relevant.map(t => {
    const d = Math.max(1, Math.round((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / 86400000) + 1)
    return t.budgetActual / d / t.familySize
  })
  const avgDaily = avg(dailyPerPerson)
  const suggested = Math.round(avgDaily * days * familySize)

  return {
    suggested,
    basedOnTrips: relevant.length,
    avgDailyPerPerson: Math.round(avgDaily),
    confidence: relevant.length >= 3 ? 'high' : relevant.length === 2 ? 'medium' : 'low',
  }
}
