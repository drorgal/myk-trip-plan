import { useState } from 'react'
import { Stack, Typography, Button, Input, Select, Skeleton, SegmentedControl, Snackbar } from 'myk-library'
import type { ChangeEvent } from 'react'
import { Search, ExternalLink } from 'lucide-react'
import { useTripStore } from '@/stores/tripStore'
import { useAiStore } from '@/stores/aiStore'
import { fetchFlightPrices } from '@/services/priceComparisonService'
import { buildFlightLink } from '@/services/deepLinkService'
import type { PriceResult, FlightSearchParams } from '@/types/price-comparison'
import type { CabinClass } from '@/types/accommodation'
import PriceResultCard from './PriceComparison/PriceResultCard'
import { CURRENCY_OPTIONS } from '@/utils/currency'

const CABIN_OPTIONS = [
  { value: 'economy', label: '💺 תיירות' },
  { value: 'business', label: '🛋️ עסקים' },
  { value: 'first', label: '✨ ראשונה' },
]

const PASSENGER_OPTIONS = [1, 2, 3, 4, 5, 6].map(n => ({ value: String(n), label: `${n} נוסעים` }))

const SORT_OPTIONS = [
  { value: 'price', label: 'מחיר' },
  { value: 'duration', label: 'משך' },
]

interface Props {
  tripId: string
}

export default function FlightSearchTab({ tripId }: Props) {
  const trip = useTripStore(s => s.trips.find(t => t.id === tripId))
  const addFlight = useTripStore(s => s.addFlight)
  const { rapidApiKey } = useAiStore()

  const today = new Date().toISOString().slice(0, 10)

  const outboundFlight = trip?.flights?.find(f => f.direction === 'outbound')
  const [origin, setOrigin] = useState(outboundFlight?.departureAirport ?? 'TLV')
  const [destination, setDestination] = useState(trip?.destination ?? '')
  const [departureDate, setDepartureDate] = useState(trip?.startDate ?? today)
  const [returnDate, setReturnDate] = useState(trip?.endDate ?? today)
  const [cabinClass, setCabinClass] = useState<CabinClass>('economy')
  const [passengers, setPassengers] = useState(String(Math.max(1, trip?.family?.length ?? 1)))
  const [currency, setCurrency] = useState('USD')

  const [results, setResults] = useState<PriceResult[]>([])
  const [sortBy, setSortBy] = useState('price')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!rapidApiKey) {
      const url = buildFlightLink({ origin, destination, departureDate, returnDate, passengers: parseInt(passengers, 10) || 1 })
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    if (!destination.trim()) {
      setSearchError('הכנס יעד')
      return
    }
    if (/[֐-׿]/.test(destination)) {
      setSearchError('נא לכתוב שם העיר באנגלית — לדוגמה: Vienna, Rome, Paris')
      return
    }
    setSearchError(null)
    setSearching(true)
    setResults([])
    try {
      const params: FlightSearchParams = {
        origin: origin.trim() || 'TLV',
        destination: destination.trim(),
        departureDate,
        returnDate,
        cabinClass,
        passengers: parseInt(passengers, 10) || 1,
        currency,
      }
      const data = await fetchFlightPrices(params, rapidApiKey)
      setResults(data)
    } catch {
      setSearchError('שגיאה בחיפוש טיסות')
    } finally {
      setSearching(false)
    }
  }

  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === 'price') return a.price - b.price
    if (sortBy === 'duration') return Number(a.metadata?.durationMinutes ?? 0) - Number(b.metadata?.durationMinutes ?? 0)
    return 0
  })

  const handleSave = (result: PriceResult) => {
    const meta = result.metadata ?? {}
    addFlight(tripId, {
      airline: String(meta.airline ?? result.label),
      flightNumber: String(meta.flightNumber ?? 'N/A'),
      departureAirport: origin.trim() || 'TLV',
      arrivalAirport: destination.trim(),
      departureTime: `${departureDate}T${String(meta.departureTime ?? '10:00')}:00`,
      arrivalTime: `${departureDate}T${String(meta.arrivalTime ?? '14:00')}:00`,
      cost: result.price,
      currency: result.currency,
      direction: 'outbound',
      cabinClass: (meta.cabinClass as CabinClass) ?? 'economy',
    })
    setToast(`${String(meta.airline ?? '')} נשמרה לטיול ✓`)
  }

  return (
    <Stack direction="column" spacing="md" style={{ paddingTop: 16 }}>
      <Typography variant="h6" style={{ margin: 0 }}>✈️ חיפוש טיסות</Typography>

      <Stack direction="row" spacing="md" style={{ flexWrap: 'wrap' }}>
        <Input
          label="מוצא"
          value={origin}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setOrigin(e.target.value)}
          placeholder="TLV"
          style={{ flex: '0 0 100px' }}
        />
        <Input
          label="יעד (באנגלית)"
          value={destination}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setDestination(e.target.value)}
          placeholder="Vienna, Rome, Paris..."
          style={{ flex: 1, minWidth: 140 }}
        />
        <Input
          type="date"
          label="יציאה"
          value={departureDate}
          onChange={e => setDepartureDate(e.target.value)}
          style={{ flex: '0 0 140px' }}
        />
        <Input
          type="date"
          label="חזרה"
          value={returnDate}
          onChange={e => setReturnDate(e.target.value)}
          style={{ flex: '0 0 140px' }}
        />
        <Select
          label="מחלקה"
          value={cabinClass}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setCabinClass(e.target.value as CabinClass)}
          style={{ flex: '0 0 150px' }}
        >
          {CABIN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Select
          label="נוסעים"
          value={passengers}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setPassengers(e.target.value)}
          style={{ flex: '0 0 130px' }}
        >
          {PASSENGER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Select
          label="מטבע"
          value={currency}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setCurrency(e.target.value)}
          style={{ flex: '0 0 100px' }}
        >
          {CURRENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Stack direction="column" justify="end" style={{ flex: '0 0 auto', paddingBottom: 1 }}>
          <Button
            variant="primary"
            onClick={handleSearch}
            disabled={searching || (!rapidApiKey ? !destination.trim() : !destination.trim())}
            style={{ whiteSpace: 'nowrap' }}
          >
            <Stack direction="row" spacing="xs" align="center">
              {!rapidApiKey ? <ExternalLink size={14} /> : <Search size={14} />}
              <span>{searching ? 'מחפש...' : rapidApiKey ? 'חפש טיסות' : 'חפש ב-Google Flights'}</span>
            </Stack>
          </Button>
        </Stack>
      </Stack>

      {!rapidApiKey && (
        <Typography variant="body2" style={{ color: '#9ca3af', fontSize: 13 }}>
          🔗 יפתח Google Flights בטאב חדש — הוסף RapidAPI Key לחיפוש in-app עם מחירים
        </Typography>
      )}

      {searchError && (
        <Typography variant="body2" style={{ color: '#ef4444' }}>❌ {searchError}</Typography>
      )}

      {searching && (
        <Stack direction="column" spacing="md">
          {[1, 2, 3].map(i => <Skeleton key={i} height={120} />)}
        </Stack>
      )}

      {!searching && results.length > 0 && (
        <Stack direction="column" spacing="md">
          <Stack direction="row" justify="between" align="center">
            <Typography variant="body2" style={{ color: '#9ca3af' }}>
              {results.length} הצעות נמצאו
            </Typography>
            <SegmentedControl value={sortBy} onChange={setSortBy} data={SORT_OPTIONS} size="sm" />
          </Stack>
          <Stack direction="column" spacing="sm">
            {sortedResults.map(r => (
              <PriceResultCard key={r.id} result={r} onSave={handleSave} />
            ))}
          </Stack>
        </Stack>
      )}

      {!searching && results.length === 0 && destination.trim() && !searchError && (
        <Typography variant="body2" style={{ color: '#9ca3af', textAlign: 'center', paddingTop: 24 }}>
          לחץ "חפש טיסות" כדי לראות הצעות
        </Typography>
      )}

      {toast && (
        <Snackbar
          message={toast}
          variant="success"
          isOpen={!!toast}
          onClose={() => setToast(null)}
          duration={3000}
        />
      )}
    </Stack>
  )
}
