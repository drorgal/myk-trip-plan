import type { TripPlan } from '@/types/trip-plan'

export function exportTripAsJSON(trip: TripPlan): void {
  const json = JSON.stringify(trip, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${trip.name.replace(/\s+/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importTripFromFile(): Promise<TripPlan> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return reject(new Error('No file selected'))
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const trip = JSON.parse(e.target?.result as string) as TripPlan
          if (!trip.id || !trip.name || !trip.days) throw new Error('Invalid trip JSON')
          resolve(trip)
        } catch (err) {
          reject(err)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  })
}
