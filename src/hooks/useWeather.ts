import { useEffect, useState } from 'react'
import { useTripStore } from '@/stores/tripStore'
import { geocodeDestination, fetchWeatherForecast } from '@/services/weatherService'
import type { DayWeather } from '@/services/weatherService'

interface UseWeatherResult {
  weather: Record<string, DayWeather>
  loading: boolean
}

const CACHE_KEY_PREFIX = 'myk-weather-'
const CACHE_TTL_MS = 3 * 60 * 60 * 1000 // 3 hours

function getCached(key: string): Record<string, DayWeather> | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL_MS) return null
    return data
  } catch {
    return null
  }
}

function setCache(key: string, data: Record<string, DayWeather>) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }))
  } catch {
    // storage quota — ignore
  }
}

export function useWeather(tripId: string): UseWeatherResult {
  const trip = useTripStore(s => s.trips.find(t => t.id === tripId))
  const setCoords = useTripStore(s => s.setCoords)
  const [weather, setWeather] = useState<Record<string, DayWeather>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!trip) return

    const cacheKey = `${CACHE_KEY_PREFIX}${tripId}`
    const cached = getCached(cacheKey)
    if (cached) {
      setWeather(cached)
      return
    }

    let cancelled = false

    async function load() {
      if (!trip) return
      setLoading(true)
      try {
        let coords = trip.coords ?? null
        if (!coords) {
          coords = await geocodeDestination(trip.destination)
          if (coords && !cancelled) setCoords(tripId, coords)
        }
        if (!coords || cancelled) return

        const days = await fetchWeatherForecast(coords, trip.startDate, trip.endDate)
        if (cancelled) return

        const map: Record<string, DayWeather> = {}
        days.forEach(d => { map[d.date] = d })
        setWeather(map)
        setCache(cacheKey, map)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [tripId, trip?.destination, trip?.startDate, trip?.endDate]) // eslint-disable-line react-hooks/exhaustive-deps

  return { weather, loading }
}
