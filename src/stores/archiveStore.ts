import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ArchivedTrip } from '@/types/archive'

interface ArchiveStore {
  archivedTrips: ArchivedTrip[]
  addArchivedTrip: (trip: ArchivedTrip) => void
  removeArchivedTrip: (id: string) => void
}

export const useArchiveStore = create<ArchiveStore>()(
  persist(
    (set) => ({
      archivedTrips: [],

      addArchivedTrip: (trip) =>
        set(state => ({
          archivedTrips: [
            ...state.archivedTrips.filter(t => t.id !== trip.id),
            trip,
          ],
        })),

      removeArchivedTrip: (id) =>
        set(state => ({
          archivedTrips: state.archivedTrips.filter(t => t.id !== id),
        })),
    }),
    {
      name: 'myk-trip-archive',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
