import { useState, useCallback, useRef, useEffect } from 'react'
import { Stack, Typography, Button, Input, Select, Skeleton, SegmentedControl, Snackbar } from 'myk-library'
import type { ChangeEvent } from 'react'
import { Search, ExternalLink } from 'lucide-react'
import { useAiStore } from '@/stores/aiStore'
import { buildCarLink } from '@/services/deepLinkService'
import { useTripStore } from '@/stores/tripStore'
import {
  searchCarRentalLocations,
  searchCarRentals,
  type CarRentalOffer,
  type CarRentalLocation,
  type CarRentalSearchParams,
} from '@/services/carRentalSearchService'
import { getCarRentalRecommendation, type AICarRecommendation } from '@/services/carRentalAIService'
import CarRentalResultCard from './CarRentalResultCard'
import CarRentalAIPanel from './CarRentalAIPanel'
import { CURRENCY_OPTIONS } from '@/utils/currency'
import { formatDateISO } from '@/utils/date'
import { geocodeCity } from '@/utils/geocode'
import styled from 'styled-components'
import type { CarCategory } from '@/types/accommodation'

const CATEGORY_OPTIONS = [
  { value: '', label: 'כל הקטגוריות' },
  { value: 'economy', label: '🚗 קטנה' },
  { value: 'compact', label: '🚗 קומפקט' },
  { value: 'midsize', label: '🚙 בינונית' },
  { value: 'full-size', label: '🚙 גדולה' },
  { value: 'suv', label: '🚐 SUV' },
  { value: 'van', label: '🚌 ואן' },
  { value: 'luxury', label: '🏎️ יוקרה' },
]

const SORT_OPTIONS = [
  { value: 'price', label: 'מחיר' },
  { value: 'rating', label: 'דירוג' },
  { value: 'insurance', label: 'כולל ביטוח' },
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
  box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  max-height: 200px;
  overflow-y: auto;
`

const LocationItem = styled.li`
  padding: 8px 14px;
  cursor: pointer;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.gray[800]};
  &:hover { background: ${({ theme }) => theme.colors.gray[100]}; }
`

const InputWrap = styled.div`
  position: relative;
  flex: 1;
`

interface Props {
  tripId: string
}

export default function CarRentalSearchTab({ tripId }: Props) {
  const { rapidApiKey, openaiApiKey, openaiModel } = useAiStore()
  const addCarRental = useTripStore(s => s.addCarRental)
  const trip = useTripStore(s => s.trips.find(t => t.id === tripId))

  const today = formatDateISO(new Date())

  const [pickupQuery, setPickupQuery] = useState(trip?.destination ?? '')
  const [pickupLocation, setPickupLocation] = useState<CarRentalLocation | null>(null)
  const [pickupSuggestions, setPickupSuggestions] = useState<CarRentalLocation[]>([])

  const [pickupDate, setPickupDate] = useState(trip?.startDate ?? today)
  const [dropoffDate, setDropoffDate] = useState(trip?.endDate ?? today)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [currency, setCurrency] = useState('USD')

  const [offers, setOffers] = useState<CarRentalOffer[]>([])
  const [sortBy, setSortBy] = useState('price')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [aiRec, setAiRec] = useState<AICarRecommendation | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const [toast, setToast] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!trip?.destination || !rapidApiKey || pickupLocation) return
    searchCarRentalLocations(trip.destination, rapidApiKey)
      .then(results => {
        if (results[0]) {
          setPickupLocation(results[0])
          setPickupQuery(results[0].displayName)
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rapidApiKey])

  const handlePickupInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setPickupQuery(val)
    setPickupLocation(null)
    setSearchError(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.length < 2) { setPickupSuggestions([]); return }

    if (/[֐-׿]/.test(val)) return

    debounceRef.current = setTimeout(async () => {
      if (!rapidApiKey) return
      try {
        const results = await searchCarRentalLocations(val, rapidApiKey)
        setPickupSuggestions(results)
      } catch {
        // silently ignore autocomplete errors
      }
    }, 400)
  }, [rapidApiKey])

  const handleSearch = async () => {
    if (!rapidApiKey) {
      const url = buildCarLink({ destination: pickupQuery.trim() || (trip?.destination ?? ''), pickupDate, dropoffDate })
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    if (!pickupQuery.trim()) {
      setSearchError('הכנס מיקום איסוף')
      return
    }
    if (/[֐-׿]/.test(pickupQuery)) {
      setSearchError('נא לכתוב שם העיר באנגלית — לדוגמה: Vienna, Rome, Tel Aviv')
      return
    }

    let resolvedLocation = pickupLocation
    if (!resolvedLocation) {
      try {
        const results = await searchCarRentalLocations(pickupQuery, rapidApiKey)
        if (results.length > 0) {
          resolvedLocation = results[0]
          setPickupLocation(results[0])
          setPickupQuery(results[0].displayName)
        } else {
          const geo = await geocodeCity(pickupQuery)
          resolvedLocation = {
            displayName: geo.displayName,
            city: geo.displayName,
            country: '',
            lat: geo.lat,
            lng: geo.lng,
          }
          setPickupLocation(resolvedLocation)
        }
      } catch {
        setSearchError('לא נמצא מיקום — נסה שם עיר אחר באנגלית')
        return
      }
    }

    setSearchError(null)
    setSearching(true)
    setOffers([])
    setAiRec(null)
    setAiError(null)

    const params: CarRentalSearchParams = {
      pickupLat: resolvedLocation.lat,
      pickupLng: resolvedLocation.lng,
      pickupDate,
      dropoffDate,
      currency,
    }

    try {
      const results = await searchCarRentals(params, rapidApiKey)
      const filtered = categoryFilter
        ? results.filter(o => o.carCategory === categoryFilter)
        : results
      setOffers(filtered)

      if (filtered.length > 0 && openaiApiKey) {
        setAiLoading(true)
        try {
          const rec = await getCarRentalRecommendation(filtered.slice(0, 20), trip ?? null, openaiApiKey, openaiModel)
          setAiRec(rec)
        } catch (err) {
          setAiError(err instanceof Error ? err.message : 'שגיאת AI')
        } finally {
          setAiLoading(false)
        }
      }
    } catch {
      // Booking.com15 car rental API unavailable — fallback to Kayak
      const url = buildCarLink({ destination: pickupQuery.trim(), pickupDate, dropoffDate })
      window.open(url, '_blank', 'noopener,noreferrer')
      setSearchError('חיפוש in-app נכשל — פתחנו Kayak בטאב חדש עם הנתונים שהזנת')
    } finally {
      setSearching(false)
    }
  }

  const sortedOffers = [...offers].sort((a, b) => {
    if (sortBy === 'price') return a.totalPrice - b.totalPrice
    if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0)
    if (sortBy === 'insurance') return (b.includesInsurance ? 1 : 0) - (a.includesInsurance ? 1 : 0)
    return 0
  })

  const handleSave = (offer: CarRentalOffer) => {
    addCarRental(tripId, {
      company: offer.company,
      carModel: offer.carModel,
      carCategory: offer.carCategory as CarCategory,
      pickupLocation: pickupLocation?.displayName ?? pickupQuery,
      pickupDate,
      dropoffDate,
      cost: offer.totalPrice,
      currency: offer.currency,
      includesInsurance: offer.includesInsurance,
      notes: `מחיר יומי: ${offer.pricePerDay} ${offer.currency} | ${offer.fuelPolicy}`,
    })
    setToast(`${offer.company} — ${offer.carModel} נשמר לטיול ✓`)
  }

  return (
    <Stack direction="column" spacing="md" style={{ paddingTop: 16 }}>
      <Typography variant="h6" style={{ margin: 0 }}>🚗 חיפוש השכרת רכב</Typography>

      <Stack direction="row" spacing="md" style={{ flexWrap: 'wrap' }}>
        <InputWrap>
          <Input
            label="מיקום איסוף (באנגלית)"
            value={pickupQuery}
            onChange={handlePickupInput}
            placeholder="Vienna, Rome, Tel Aviv..."
            style={{ width: '100%' }}
          />
          {pickupSuggestions.length > 0 && !pickupLocation && (
            <LocationSuggestions>
              {pickupSuggestions.map(loc => (
                <LocationItem
                  key={`${loc.lat},${loc.lng}`}
                  onClick={() => {
                    setPickupLocation(loc)
                    setPickupQuery(loc.displayName)
                    setPickupSuggestions([])
                  }}
                >
                  {loc.displayName}
                </LocationItem>
              ))}
            </LocationSuggestions>
          )}
        </InputWrap>

        <Input
          type="date"
          label="איסוף"
          value={pickupDate}
          onChange={e => setPickupDate(e.target.value)}
          style={{ flex: '0 0 140px' }}
        />
        <Input
          type="date"
          label="החזרה"
          value={dropoffDate}
          onChange={e => setDropoffDate(e.target.value)}
          style={{ flex: '0 0 140px' }}
        />

        <Select
          label="קטגוריה"
          value={categoryFilter}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategoryFilter(e.target.value)}
          style={{ flex: '0 0 150px' }}
        >
          {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
            disabled={searching}
            style={{ whiteSpace: 'nowrap' }}
          >
            <Stack direction="row" spacing="xs" align="center">
              {!rapidApiKey ? <ExternalLink size={14} /> : <Search size={14} />}
              <span>{searching ? 'מחפש...' : rapidApiKey ? 'חפש רכבים' : 'חפש ב-Kayak'}</span>
            </Stack>
          </Button>
        </Stack>
      </Stack>

      {!rapidApiKey && (
        <Typography variant="body2" style={{ color: '#9ca3af', fontSize: 13 }}>
          🔗 יפתח Kayak בטאב חדש עם הנתונים שהזנת — הוסף RapidAPI Key לחיפוש in-app עם מחירים ו-AI
        </Typography>
      )}

      {searchError && (
        <Typography variant="body2" style={{ color: '#ef4444' }}>❌ {searchError}</Typography>
      )}

      {searching && (
        <Stack direction="column" spacing="md">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} height={120} />
          ))}
        </Stack>
      )}

      {!searching && offers.length > 0 && (
        <Stack direction="column" spacing="md">
          <Stack direction="row" justify="between" align="center">
            <Typography variant="body2" style={{ color: '#9ca3af' }}>
              {offers.length} הצעות נמצאו
            </Typography>
            <SegmentedControl
              value={sortBy}
              onChange={setSortBy}
              data={SORT_OPTIONS}
              size="sm"
            />
          </Stack>

          <CarRentalAIPanel recommendation={aiRec} loading={aiLoading} error={aiError} />

          <Stack direction="column" spacing="sm">
            {sortedOffers.map(offer => (
              <CarRentalResultCard
                key={offer.offerId}
                offer={offer}
                tripId={tripId}
                isTopPick={aiRec?.topPickId === offer.offerId}
                isBestValue={aiRec?.bestValueId === offer.offerId}
                isPremium={aiRec?.premiumPickId === offer.offerId}
                onSave={handleSave}
              />
            ))}
          </Stack>
        </Stack>
      )}

      {!searching && offers.length === 0 && pickupLocation && !searchError && (
        <Typography variant="body2" style={{ color: '#9ca3af', textAlign: 'center', paddingTop: 24 }}>
          לחץ "חפש רכבים" כדי לראות הצעות
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
