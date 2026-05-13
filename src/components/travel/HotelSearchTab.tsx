import { useState, useCallback, useRef } from 'react'
import { Stack, Typography, Button, Input, Select, Skeleton, SegmentedControl, Snackbar } from 'myk-library'
import type { ChangeEvent } from 'react'
import { Search, ExternalLink } from 'lucide-react'
import { useTripStore } from '@/stores/tripStore'
import { useAiStore } from '@/stores/aiStore'
import { fetchHotelPrices, searchHotelDestinations } from '@/services/priceComparisonService'
import { buildHotelLink } from '@/services/deepLinkService'
import type { PriceResult, HotelDestination } from '@/types/price-comparison'
import PriceResultCard from './PriceComparison/PriceResultCard'
import { CURRENCY_OPTIONS } from '@/utils/currency'
import styled from 'styled-components'

const GUEST_OPTIONS = [1, 2, 3, 4, 5, 6].map(n => ({ value: String(n), label: `${n} אורחים` }))

const SORT_OPTIONS = [
  { value: 'price', label: 'מחיר' },
  { value: 'rating', label: 'דירוג' },
]

const STAR_OPTIONS = [
  { value: '', label: 'כל ⭐' },
  { value: '3', label: '⭐⭐⭐+' },
  { value: '4', label: '⭐⭐⭐⭐+' },
  { value: '5', label: '⭐⭐⭐⭐⭐' },
]

const RATING_OPTIONS = [
  { value: '', label: 'כל דירוג' },
  { value: '7', label: '7.0+' },
  { value: '8', label: '8.0+' },
  { value: '9', label: '9.0+' },
]

const LocationSuggestions = styled.ul`
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  z-index: 100;
  background: ${({ theme }) => theme.colors.white};
  border: 1px solid ${({ theme }) => theme.colors.gray[200]};
  border-radius: 8px;
  list-style: none;
  margin: 4px 0 0;
  padding: 4px 0;
  box-shadow: 0 4px 16px rgba(0,0,0,0.22);
  max-height: 220px;
  overflow-y: auto;
`

const LocationItem = styled.li`
  padding: 10px 14px;
  cursor: pointer;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.gray[800]};
  &:hover { background: ${({ theme }) => theme.colors.gray[100]}; }
`

const InputWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 180px;
`

const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`

interface Props {
  tripId: string
}

export default function HotelSearchTab({ tripId }: Props) {
  const trip = useTripStore(s => s.trips.find(t => t.id === tripId))
  const addAccommodation = useTripStore(s => s.addAccommodation)
  const { rapidApiKey } = useAiStore()

  const today = new Date().toISOString().slice(0, 10)

  const [destQuery, setDestQuery] = useState(trip?.destination ?? '')
  const [selectedDest, setSelectedDest] = useState<HotelDestination | null>(null)
  const [suggestions, setSuggestions] = useState<HotelDestination[]>([])
  const [checkIn, setCheckIn] = useState(trip?.startDate ?? today)
  const [checkOut, setCheckOut] = useState(trip?.endDate ?? today)
  const [guests, setGuests] = useState(String(Math.max(1, trip?.family?.length ?? 1)))
  const [currency, setCurrency] = useState('USD')

  const [results, setResults] = useState<PriceResult[]>([])
  const [sortBy, setSortBy] = useState('price')
  const [starFilter, setStarFilter] = useState('')
  const [ratingFilter, setRatingFilter] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDestInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setDestQuery(val)
    setSelectedDest(null)
    setSearchError(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.length < 2) { setSuggestions([]); return }
    if (/[֐-׿]/.test(val)) { setSuggestions([]); return }

    debounceRef.current = setTimeout(async () => {
      if (!rapidApiKey) return
      try {
        const res = await searchHotelDestinations(val, rapidApiKey)
        setSuggestions(res)
      } catch {
        // silently ignore autocomplete errors
      }
    }, 400)
  }, [rapidApiKey])

  const handleSearch = async () => {
    if (!rapidApiKey) {
      const url = buildHotelLink({ destination: destQuery.trim(), checkIn, checkOut, guests: parseInt(guests, 10) || 2 })
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    if (!destQuery.trim()) { setSearchError('הכנס יעד'); return }
    if (/[֐-׿]/.test(destQuery)) {
      setSearchError('נא לכתוב שם העיר באנגלית — לדוגמה: Rome, Paris, New York')
      return
    }

    setSearchError(null)
    setSearching(true)
    setResults([])
    try {
      const data = await fetchHotelPrices({
        destination: destQuery.trim(),
        checkIn,
        checkOut,
        guests: parseInt(guests, 10) || 1,
        currency,
        destId: selectedDest?.dest_id,
        searchType: selectedDest?.search_type,
      }, rapidApiKey)
      setResults(data)
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'שגיאה בחיפוש מלונות')
    } finally {
      setSearching(false)
    }
  }

  // Client-side filtering + sorting
  const filtered = results.filter(r => {
    const stars = Number(r.metadata?.stars ?? 0)
    const rating = Number(r.rating ?? 0)
    if (starFilter === '3' && stars < 3) return false
    if (starFilter === '4' && stars < 4) return false
    if (starFilter === '5' && stars < 5) return false
    if (ratingFilter && rating < Number(ratingFilter)) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'price') return a.price - b.price
    if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0)
    return 0
  })

  const handleSave = (result: PriceResult) => {
    const meta = result.metadata ?? {}
    addAccommodation(tripId, {
      name: result.label.split(' · ')[0],
      type: 'hotel',
      checkIn,
      checkOut,
      cost: result.price,
      currency: result.currency,
      rating: result.rating,
      notes: [
        meta.neighborhood ? `שכונה: ${meta.neighborhood}` : '',
        meta.breakfastIncluded ? 'ארוחת בוקר כלולה' : '',
      ].filter(Boolean).join(' · ') || undefined,
    })
    setToast(`${result.label.split(' · ')[0]} נשמר לטיול ✓`)
  }

  return (
    <Stack direction="column" spacing="md" style={{ paddingTop: 16 }}>
      <Typography variant="h6" style={{ margin: 0 }}>🏨 חיפוש מלונות</Typography>

      <Stack direction="row" spacing="md" style={{ flexWrap: 'wrap' }}>
        <InputWrap>
          <Input
            label="יעד"
            value={destQuery}
            onChange={handleDestInput}
            placeholder="Rome, Paris, New York..."
            style={{ width: '100%' }}
          />
          {suggestions.length > 0 && !selectedDest && (
            <LocationSuggestions>
              {suggestions.map(s => (
                <LocationItem
                  key={s.dest_id}
                  onClick={() => {
                    setSelectedDest(s)
                    setDestQuery(s.displayName + (s.country ? `, ${s.country}` : ''))
                    setSuggestions([])
                  }}
                >
                  <Stack direction="row" justify="between" align="center">
                    <span>{s.displayName}</span>
                    {s.country && <span style={{ fontSize: 12, opacity: 0.6 }}>{s.country}</span>}
                  </Stack>
                </LocationItem>
              ))}
            </LocationSuggestions>
          )}
        </InputWrap>

        <Input
          type="date"
          label="צ'ק-אין"
          value={checkIn}
          onChange={e => setCheckIn(e.target.value)}
          style={{ flex: '0 0 140px' }}
        />
        <Input
          type="date"
          label="צ'ק-אאוט"
          value={checkOut}
          onChange={e => setCheckOut(e.target.value)}
          style={{ flex: '0 0 140px' }}
        />
        <Select
          label="אורחים"
          value={guests}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setGuests(e.target.value)}
          style={{ flex: '0 0 130px' }}
        >
          {GUEST_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
            disabled={searching || !destQuery.trim()}
            style={{ whiteSpace: 'nowrap' }}
          >
            <Stack direction="row" spacing="xs" align="center">
              {!rapidApiKey ? <ExternalLink size={14} /> : <Search size={14} />}
              <span>{searching ? 'מחפש...' : rapidApiKey ? 'חפש מלונות' : 'חפש ב-Booking.com'}</span>
            </Stack>
          </Button>
        </Stack>
      </Stack>

      {!rapidApiKey && (
        <Typography variant="body2" style={{ color: '#9ca3af', fontSize: 13 }}>
          🔗 יפתח Booking.com בטאב חדש — הוסף RapidAPI Key לחיפוש in-app עם מחירים
        </Typography>
      )}

      {searchError && (
        <Typography variant="body2" style={{ color: '#ef4444' }}>❌ {searchError}</Typography>
      )}

      {searching && (
        <Stack direction="column" spacing="md">
          {[1, 2, 3].map(i => <Skeleton key={i} height={140} />)}
        </Stack>
      )}

      {!searching && results.length > 0 && (
        <Stack direction="column" spacing="md">
          <FilterRow>
            <Typography variant="body2" style={{ color: '#9ca3af', fontSize: 12 }}>
              {filtered.length}/{results.length} מלונות
            </Typography>
            <SegmentedControl value={starFilter} onChange={setStarFilter} data={STAR_OPTIONS} size="sm" />
            <SegmentedControl value={ratingFilter} onChange={setRatingFilter} data={RATING_OPTIONS} size="sm" />
            <SegmentedControl value={sortBy} onChange={setSortBy} data={SORT_OPTIONS} size="sm" />
          </FilterRow>

          {sorted.length === 0 ? (
            <Typography variant="body2" style={{ color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>
              אין מלונות התואמים את הסינון — נסה להרחיב את הקריטריונים
            </Typography>
          ) : (
            <Stack direction="column" spacing="sm">
              {sorted.map(r => <PriceResultCard key={r.id} result={r} onSave={handleSave} />)}
            </Stack>
          )}
        </Stack>
      )}

      {!searching && results.length === 0 && destQuery.trim() && !searchError && (
        <Typography variant="body2" style={{ color: '#9ca3af', textAlign: 'center', paddingTop: 24 }}>
          לחץ "חפש מלונות" כדי לראות הצעות
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
