import { useState, useEffect } from 'react'
import { Stack, Typography, Button, Skeleton, SegmentedControl } from 'myk-library'
import styled from 'styled-components'
import { ChevronDown, ChevronUp, Compass } from 'lucide-react'
import type { Attraction, AttractionCategory } from '@/types/discovery'
import type { TripDay } from '@/types/trip'
import { fetchAttractions } from '@/services/discoveryService'
import { useAiStore } from '@/stores/aiStore'
import AttractionCard from './AttractionCard'
import AttractionDrawer from './AttractionDrawer'

const PanelWrapper = styled.div`
  margin: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.gray[200]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.gray[200]};
  background: ${({ theme }) => theme.colors.gray[50]};
`

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  cursor: pointer;
  user-select: none;
  &:hover { background: ${({ theme }) => theme.colors.gray[100]}; }
`

const PanelBody = styled.div`
  padding: 16px 24px 20px;
`

const AttractionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
`

const CATEGORY_OPTIONS = [
  { value: '', label: 'הכל' },
  { value: 'landmark', label: '🗺️ אטרקציות' },
  { value: 'museum', label: '🏛️ מוזיאונים' },
  { value: 'restaurant', label: '🍽️ מסעדות' },
  { value: 'park', label: '🌳 פארקים' },
  { value: 'entertainment', label: '🎭 בידור' },
  { value: 'shopping', label: '🛍️ קניות' },
  { value: 'beach', label: '🏖️ חופים' },
]

interface Props {
  tripId: string
  destination: string
  days: TripDay[]
}

export default function DiscoveryPanel({ tripId, destination, days }: Props) {
  const { rapidApiKey } = useAiStore()
  const [open, setOpen] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [attractions, setAttractions] = useState<Attraction[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setAttractions([])
    setFetchError(null)
    fetchAttractions(destination, rapidApiKey, categoryFilter ? categoryFilter as AttractionCategory : undefined)
      .then(setAttractions)
      .catch(e => setFetchError(e instanceof Error ? e.message : 'שגיאה בטעינת אטרקציות'))
      .finally(() => setLoading(false))
  }, [destination, categoryFilter, open, rapidApiKey])

  return (
    <>
      <PanelWrapper>
        <PanelHeader onClick={() => setOpen(o => !o)}>
          <Stack direction="row" spacing="sm" align="center">
            <Compass size={16} style={{ color: '#f59e0b' }} />
            <Typography variant="body1" style={{ fontWeight: 600, margin: 0 }}>
              גלה אטרקציות ב-{destination}
            </Typography>
            {!loading && attractions.length > 0 && (
              <Typography variant="body2" style={{ color: '#9ca3af', fontSize: 12 }}>
                ({attractions.length} מקומות)
              </Typography>
            )}
          </Stack>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </PanelHeader>

        {open && (
          <PanelBody>
            <Stack direction="column" spacing="md">
                {!rapidApiKey && (
                <Typography variant="body2" style={{ color: '#9ca3af', fontSize: 12 }}>
                  🗺️ מציג מקומות מ-OpenStreetMap — הוסף RapidAPI Key לתוצאות מ-Booking.com
                </Typography>
              )}

              <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
                <SegmentedControl
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  data={CATEGORY_OPTIONS}
                  size="sm"
                />
              </div>

              {fetchError && (
                <Typography variant="body2" style={{ color: '#ef4444', fontSize: 13 }}>❌ {fetchError}</Typography>
              )}

              {loading && (
                <AttractionsGrid>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <Skeleton key={i} height={220} />
                  ))}
                </AttractionsGrid>
              )}

              {!loading && attractions.length > 0 && (
                <AttractionsGrid>
                  {attractions.map(a => (
                    <AttractionCard
                      key={a.id}
                      attraction={a}
                      onExpand={setSelectedAttraction}
                    />
                  ))}
                </AttractionsGrid>
              )}

              {!loading && attractions.length === 0 && !fetchError && (
                <Typography variant="body2" style={{ color: '#9ca3af', textAlign: 'center', padding: '24px 0' }}>
                  לא נמצאו אטרקציות
                </Typography>
              )}

              {!loading && attractions.length > 0 && (
                <Stack direction="row" justify="center">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setCategoryFilter('')
                      setOpen(false)
                    }}
                  >
                    סגור פאנל
                  </Button>
                </Stack>
              )}
            </Stack>
          </PanelBody>
        )}
      </PanelWrapper>

      <AttractionDrawer
        attraction={selectedAttraction}
        days={days}
        tripId={tripId}
        open={!!selectedAttraction}
        onClose={() => setSelectedAttraction(null)}
      />
    </>
  )
}
