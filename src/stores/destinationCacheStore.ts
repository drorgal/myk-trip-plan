import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ArchivedTrip } from '@/types/archive'

export interface DestinationMemory {
  destination: string
  visits: Array<{
    tripId: string
    tripName: string
    coverEmoji: string
    startDate: string
    endDate: string
    highlights: string[]
    whatWentWell: string
    overallRating: number
    avgDailyPerPerson: number
    currency: string
  }>
}

interface DestinationCacheStore {
  cache: Record<string, DestinationMemory>
  upsertFromArchive: (trip: ArchivedTrip) => void
  getDestination: (destination: string) => DestinationMemory | null
}

function normalizeDestination(dest: string): string {
  return dest.trim().toLowerCase().replace(/\s+/g, '_')
}

export const useDestinationCacheStore = create<DestinationCacheStore>()(
  persist(
    (set, get) => ({
      cache: {},

      upsertFromArchive: (trip) => {
        const key = normalizeDestination(trip.destination)
        const days = Math.max(1, Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000) + 1)
        const avgDailyPerPerson = trip.familySize > 0 && trip.budgetActual > 0
          ? Math.round(trip.budgetActual / days / trip.familySize)
          : 0

        const visit = {
          tripId: trip.id,
          tripName: trip.name,
          coverEmoji: trip.coverEmoji,
          startDate: trip.startDate,
          endDate: trip.endDate,
          highlights: trip.highlights ?? [],
          whatWentWell: trip.whatWentWell ?? '',
          overallRating: trip.ratings?.overall ?? 0,
          avgDailyPerPerson,
          currency: trip.currency,
        }

        set(state => {
          const existing = state.cache[key] ?? { destination: trip.destination, visits: [] }
          const visits = [
            ...existing.visits.filter(v => v.tripId !== trip.id),
            visit,
          ]
          return { cache: { ...state.cache, [key]: { ...existing, visits } } }
        })
      },

      getDestination: (destination) => {
        const key = normalizeDestination(destination)
        return get().cache[key] ?? null
      },
    }),
    {
      name: 'myk-destination-cache',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
