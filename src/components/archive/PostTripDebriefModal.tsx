import { useState } from 'react'
import {
  Modal, Button, Stack, Typography, Textarea, Input, Badge,
} from 'myk-library'
import styled from 'styled-components'
import { Star, Plus, X } from 'lucide-react'
import type { TripPlan } from '@/types/trip-plan'
import type { ArchivedTrip, ArchiveRatings, ArchivedPackingItem } from '@/types/archive'
import { useArchiveStore } from '@/stores/archiveStore'
import { useDestinationCacheStore } from '@/stores/destinationCacheStore'
import { getBudgetByCategory, getTotalPlanned, getTotalSpent } from '@/stores/tripStore'
import { formatDateShort, getTripDuration } from '@/utils/date'

const StarRow = styled.div`
  display: flex;
  gap: 4px;
`

const StarBtn = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 24px;
  color: ${({ $active }) => ($active ? '#f59e0b' : '#d1d5db')};
  padding: 2px;
  transition: color 0.15s;
  &:hover { color: #f59e0b; }
`

const RatingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
`

const PackingItemRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.gray[50]};
  margin-bottom: 4px;
`

const UsefulBtns = styled.div`
  display: flex;
  gap: 6px;
`

const UsefulBtn = styled.button<{ $active: boolean; $type: 'yes' | 'no' }>`
  padding: 4px 10px;
  border-radius: 6px;
  border: 1.5px solid ${({ $active, $type }) =>
    $active ? ($type === 'yes' ? '#10b981' : '#ef4444') : '#e5e7eb'};
  background: ${({ $active, $type }) =>
    $active ? ($type === 'yes' ? '#d1fae5' : '#fee2e2') : 'transparent'};
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $active, $type }) =>
    $active ? ($type === 'yes' ? '#065f46' : '#991b1b') : '#9ca3af'};
`

const SectionTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.gray[500]};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 16px 0 8px;
`

const HighlightChip = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fef3c7;
  border: 1.5px solid #f59e0b;
  border-radius: 20px;
  padding: 4px 10px;
  font-size: 13px;
`

interface Props {
  open: boolean
  onClose: () => void
  trip: TripPlan
}

const RATING_LABELS: Record<keyof ArchiveRatings, string> = {
  food: '🍽️ אוכל',
  accommodation: '🏨 לינה',
  activities: '🎯 פעילויות',
  overall: '⭐ כולל',
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <StarRow>
      {[1, 2, 3, 4, 5].map(n => (
        <StarBtn key={n} $active={n <= value} onClick={() => onChange(n)} type="button">
          <Star size={20} fill={n <= value ? '#f59e0b' : 'none'} stroke={n <= value ? '#f59e0b' : '#d1d5db'} />
        </StarBtn>
      ))}
    </StarRow>
  )
}

export default function PostTripDebriefModal({ open, onClose, trip }: Props) {
  const addArchivedTrip = useArchiveStore(s => s.addArchivedTrip)
  const upsertDestination = useDestinationCacheStore(s => s.upsertFromArchive)

  const [ratings, setRatings] = useState<ArchiveRatings>({ food: 0, accommodation: 0, activities: 0, overall: 0 })
  const [whatWentWell, setWhatWentWell] = useState('')
  const [whatCouldImprove, setWhatCouldImprove] = useState('')
  const [highlights, setHighlights] = useState<string[]>([])
  const [newHighlight, setNewHighlight] = useState('')
  const [packingReview, setPackingReview] = useState<Record<string, boolean | null>>(
    () => Object.fromEntries((trip.packingItems ?? []).map(i => [i.id, null]))
  )

  const totalPlanned = getTotalPlanned(trip)
  const totalActual = getTotalSpent(trip)
  const categoryBreakdown = getBudgetByCategory(trip)
  const duration = getTripDuration(trip.startDate, trip.endDate)

  const addHighlight = () => {
    if (!newHighlight.trim()) return
    setHighlights(h => [...h, newHighlight.trim()])
    setNewHighlight('')
  }

  const handleSave = () => {
    const packingItems: ArchivedPackingItem[] = (trip.packingItems ?? []).map(item => ({
      title: item.title,
      category: item.category,
      wasUseful: packingReview[item.id] ?? null,
    }))

    const archived: ArchivedTrip = {
      id: trip.id,
      name: trip.name,
      destination: trip.destination,
      coverEmoji: trip.coverEmoji,
      startDate: trip.startDate,
      endDate: trip.endDate,
      familySize: trip.family.length,
      adultsCount: trip.family.filter(m => !m.isChild).length,
      childrenCount: trip.family.filter(m => m.isChild).length,
      budgetPlanned: totalPlanned,
      budgetActual: totalActual,
      currency: trip.budget.currency,
      categoryBreakdown,
      ratings,
      whatWentWell,
      whatCouldImprove,
      highlights,
      packingItems,
      archivedAt: new Date().toISOString(),
    }

    addArchivedTrip(archived)
    upsertDestination(archived)
    onClose()
  }

  return (
    <Modal isOpen={open} onClose={onClose} size="lg" title={`סיים טיול — ${trip.name}`}>
      <Stack direction="column" spacing="md">

        {/* Trip summary */}
        <Stack direction="row" spacing="sm" align="center" style={{ padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
          <span style={{ fontSize: 32 }}>{trip.coverEmoji}</span>
          <Stack direction="column" spacing="xs">
            <Typography variant="h6" style={{ margin: 0 }}>{trip.name}</Typography>
            <Stack direction="row" spacing="sm">
              <Badge variant="info" size="sm">{trip.destination}</Badge>
              <Badge variant="default" size="sm">{duration} ימים</Badge>
              <Badge variant="default" size="sm">
                {formatDateShort(trip.startDate)} – {formatDateShort(trip.endDate)}
              </Badge>
            </Stack>
          </Stack>
        </Stack>

        {/* Budget summary */}
        {(totalPlanned > 0 || totalActual > 0) && (
          <Stack direction="row" spacing="md" style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 14px' }}>
            <Stack direction="column" spacing="xs" style={{ flex: 1 }}>
              <Typography variant="body2" style={{ color: '#6b7280', fontSize: 11 }}>מתוכנן</Typography>
              <Typography variant="body1" style={{ fontWeight: 700 }}>
                {totalPlanned.toLocaleString('he-IL')} {trip.budget.currency}
              </Typography>
            </Stack>
            <Stack direction="column" spacing="xs" style={{ flex: 1 }}>
              <Typography variant="body2" style={{ color: '#6b7280', fontSize: 11 }}>בפועל</Typography>
              <Typography variant="body1" style={{ fontWeight: 700, color: totalActual > totalPlanned ? '#ef4444' : '#10b981' }}>
                {totalActual.toLocaleString('he-IL')} {trip.budget.currency}
              </Typography>
            </Stack>
            {totalPlanned > 0 && (
              <Stack direction="column" spacing="xs" style={{ flex: 1 }}>
                <Typography variant="body2" style={{ color: '#6b7280', fontSize: 11 }}>דיוק</Typography>
                <Typography variant="body1" style={{ fontWeight: 700 }}>
                  {Math.round((totalActual / totalPlanned) * 100)}%
                </Typography>
              </Stack>
            )}
          </Stack>
        )}

        {/* Ratings */}
        <SectionTitle>דירוג</SectionTitle>
        {(Object.keys(RATING_LABELS) as (keyof ArchiveRatings)[]).map(key => (
          <RatingRow key={key}>
            <Typography variant="body2" style={{ fontWeight: 600, minWidth: 110 }}>
              {RATING_LABELS[key]}
            </Typography>
            <StarRating
              value={ratings[key]}
              onChange={v => setRatings(r => ({ ...r, [key]: v }))}
            />
          </RatingRow>
        ))}

        {/* Free text */}
        <SectionTitle>תובנות</SectionTitle>
        <Textarea
          label="מה הלך טוב?"
          value={whatWentWell}
          onChange={e => setWhatWentWell(e.target.value)}
          placeholder="הדברים שאהבנו הכי הרבה..."
          rows={2}
        />
        <Textarea
          label="מה אפשר לשפר?"
          value={whatCouldImprove}
          onChange={e => setWhatCouldImprove(e.target.value)}
          placeholder="מה היינו עושים אחרת..."
          rows={2}
        />

        {/* Highlights */}
        <SectionTitle>הייליטים</SectionTitle>
        <Stack direction="row" spacing="sm" align="end">
          <Input
            value={newHighlight}
            onChange={e => setNewHighlight(e.target.value)}
            placeholder="הוסף רגע שלא נשכח..."
            style={{ flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && addHighlight()}
          />
          <Button variant="ghost" onClick={addHighlight} style={{ paddingTop: 0 }}>
            <Plus size={16} />
          </Button>
        </Stack>
        {highlights.length > 0 && (
          <Stack direction="row" spacing="xs" style={{ flexWrap: 'wrap' }}>
            {highlights.map((h, i) => (
              <HighlightChip key={i}>
                <span>{h}</span>
                <button
                  onClick={() => setHighlights(hs => hs.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}
                >
                  <X size={12} />
                </button>
              </HighlightChip>
            ))}
          </Stack>
        )}

        {/* Packing review */}
        {(trip.packingItems ?? []).length > 0 && (
          <>
            <SectionTitle>ציוד — מה שימש?</SectionTitle>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {(trip.packingItems ?? []).map(item => (
                <PackingItemRow key={item.id}>
                  <Typography variant="body2">{item.title}</Typography>
                  <UsefulBtns>
                    <UsefulBtn
                      $active={packingReview[item.id] === true}
                      $type="yes"
                      onClick={() => setPackingReview(r => ({ ...r, [item.id]: r[item.id] === true ? null : true }))}
                    >
                      ✓ שימש
                    </UsefulBtn>
                    <UsefulBtn
                      $active={packingReview[item.id] === false}
                      $type="no"
                      onClick={() => setPackingReview(r => ({ ...r, [item.id]: r[item.id] === false ? null : false }))}
                    >
                      ✗ לא
                    </UsefulBtn>
                  </UsefulBtns>
                </PackingItemRow>
              ))}
            </div>
          </>
        )}

        {/* Actions */}
        <Stack direction="row" justify="between" style={{ marginTop: 8 }}>
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
          <Button variant="primary" onClick={handleSave}>
            שמור זיכרונות 💾
          </Button>
        </Stack>
      </Stack>
    </Modal>
  )
}
