import { useState } from 'react'
import { Drawer, Stack, Typography, Badge, Chip, Button, Select, Snackbar } from 'myk-library'
import type { ChangeEvent } from 'react'
import { MapPin, Clock, ExternalLink } from 'lucide-react'
import styled from 'styled-components'
import type { Attraction } from '@/types/discovery'
import type { TripDay } from '@/types/trip'
import { useTripStore } from '@/stores/tripStore'
import { attractionToEvent } from '@/services/discoveryService'
import { formatDateHe } from '@/utils/date'

const HeroImg = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 10px;
`

const ReviewCard = styled.div`
  background: ${({ theme }) => theme.colors.gray[50]};
  border-radius: 8px;
  padding: 10px 12px;
`

const StarRow = styled.div`
  font-size: 13px;
  color: #f59e0b;
`

interface Props {
  attraction: Attraction | null
  days: TripDay[]
  tripId: string
  open: boolean
  onClose: () => void
}

export default function AttractionDrawer({ attraction, days, tripId, open, onClose }: Props) {
  const addEvent = useTripStore(s => s.addEvent)
  const [selectedDay, setSelectedDay] = useState<string>(days[0]?.date ?? '')
  const [toast, setToast] = useState<string | null>(null)

  if (!attraction) return null

  const handleAdd = () => {
    if (!selectedDay) return
    addEvent(tripId, selectedDay, attractionToEvent(attraction))
    setToast(`${attraction.name} נוסף ליום ✓`)
    setTimeout(onClose, 1600)
  }

  return (
    <>
      <Drawer isOpen={open} onClose={onClose} placement="left" size="md" title={attraction.name}>
        <Stack direction="column" spacing="md">
          {attraction.media[0] && (
            <HeroImg src={attraction.media[0].url} alt={attraction.name} />
          )}

          <Stack direction="row" spacing="sm" style={{ flexWrap: 'wrap' }}>
            <Badge size="sm" variant="info">{attraction.category}</Badge>
            {attraction.rating != null && (
              <Chip size="sm">⭐ {attraction.rating.toFixed(1)} ({attraction.reviewCount?.toLocaleString()})</Chip>
            )}
            {attraction.priceLevel != null && (
              <Chip size="sm" variant="success">{'₪'.repeat(attraction.priceLevel)}</Chip>
            )}
          </Stack>

          <Stack direction="row" spacing="md" style={{ flexWrap: 'wrap' }}>
            {attraction.location && (
              <Stack direction="row" spacing="xs" align="center">
                <MapPin size={14} style={{ color: '#9ca3af' }} />
                <Typography variant="body2" style={{ color: '#9ca3af' }}>{attraction.location}</Typography>
              </Stack>
            )}
            {attraction.estimatedDuration && (
              <Stack direction="row" spacing="xs" align="center">
                <Clock size={14} style={{ color: '#9ca3af' }} />
                <Typography variant="body2" style={{ color: '#9ca3af' }}>
                  {attraction.estimatedDuration >= 60
                    ? `${Math.floor(attraction.estimatedDuration / 60)}ש${attraction.estimatedDuration % 60 > 0 ? `${attraction.estimatedDuration % 60}ד` : ''}`
                    : `${attraction.estimatedDuration}ד`}
                </Typography>
              </Stack>
            )}
            {attraction.openingHours && (
              <Typography variant="body2" style={{ color: '#9ca3af' }}>🕐 {attraction.openingHours}</Typography>
            )}
          </Stack>

          {attraction.description && (
            <Typography variant="body2" style={{ lineHeight: 1.7 }}>{attraction.description}</Typography>
          )}

          {attraction.googleMapsUrl && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(attraction.googleMapsUrl, '_blank', 'noopener')}
              style={{ alignSelf: 'flex-start' }}
            >
              <Stack direction="row" spacing="xs" align="center">
                <ExternalLink size={13} /><span>פתח ב-Google Maps</span>
              </Stack>
            </Button>
          )}

          {attraction.reviews.length > 0 && (
            <Stack direction="column" spacing="sm">
              <Typography variant="body1" style={{ fontWeight: 600 }}>ביקורות</Typography>
              {attraction.reviews.map((review, i) => (
                <ReviewCard key={i}>
                  <Stack direction="row" justify="between" align="center">
                    <Typography variant="body2" style={{ fontWeight: 600, fontSize: 13 }}>{review.author}</Typography>
                    <StarRow>{'⭐'.repeat(review.rating)}</StarRow>
                  </Stack>
                  <Typography variant="body2" style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>
                    {review.text}
                  </Typography>
                </ReviewCard>
              ))}
            </Stack>
          )}

          <Stack direction="column" spacing="sm" style={{ paddingTop: 8 }}>
            <Typography variant="body2" style={{ fontWeight: 600 }}>בחר יום:</Typography>
            <Select
              value={selectedDay}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedDay(e.target.value)}
            >
              {days.map((day, i) => (
                <option key={day.id} value={day.date}>
                  יום {i + 1} — {formatDateHe(day.date)}
                </option>
              ))}
            </Select>
            <Button variant="primary" onClick={handleAdd} disabled={!selectedDay}>
              הוסף לטיול
            </Button>
          </Stack>
        </Stack>
      </Drawer>

      {toast && (
        <Snackbar
          message={toast}
          variant="success"
          isOpen={!!toast}
          onClose={() => setToast(null)}
          duration={1600}
        />
      )}
    </>
  )
}
