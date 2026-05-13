import { Card, Stack, Typography, Badge, Chip, Button } from 'myk-library'
import styled from 'styled-components'
import { Clock, MapPin, ChevronRight } from 'lucide-react'
import type { Attraction } from '@/types/discovery'

const CATEGORY_EMOJI: Record<string, string> = {
  museum: '🏛️',
  park: '🌳',
  restaurant: '🍽️',
  landmark: '🗺️',
  beach: '🏖️',
  shopping: '🛍️',
  entertainment: '🎭',
}

const PRICE_LABEL: Record<number, string> = { 1: 'חינם/זול', 2: 'בינוני', 3: 'יקר', 4: 'יוקרה' }

const CardImg = styled.img`
  width: 100%;
  height: 110px;
  object-fit: cover;
  border-radius: 8px 8px 0 0;
`

interface Props {
  attraction: Attraction
  onExpand: (attraction: Attraction) => void
}

export default function AttractionCard({ attraction, onExpand }: Props) {
  const emoji = CATEGORY_EMOJI[attraction.category] ?? '📍'

  return (
    <Card variant="outlined" padding="none" style={{ overflow: 'hidden', cursor: 'default' }}>
      {attraction.media[0] && (
        <CardImg src={attraction.media[0].url} alt={attraction.name} loading="lazy" />
      )}
      <Stack direction="column" spacing="sm" style={{ padding: '12px' }}>
        <Stack direction="row" spacing="xs" align="center">
          <span style={{ fontSize: 16 }}>{emoji}</span>
          <Typography variant="body1" style={{ fontWeight: 600, flex: 1, fontSize: 14 }}>
            {attraction.name}
          </Typography>
        </Stack>

        <Stack direction="row" spacing="xs" style={{ flexWrap: 'wrap' }}>
          <Badge size="sm" variant="default">{attraction.category === 'museum' ? 'מוזיאון' : attraction.category === 'park' ? 'פארק' : attraction.category === 'restaurant' ? 'מסעדה' : attraction.category === 'landmark' ? 'אטרקציה' : attraction.category === 'beach' ? 'חוף' : attraction.category === 'shopping' ? 'קניות' : 'בידור'}</Badge>
          {attraction.rating != null && (
            <Chip size="sm">⭐ {attraction.rating.toFixed(1)}</Chip>
          )}
          {attraction.priceLevel != null && (
            <Chip size="sm" variant="success">{PRICE_LABEL[attraction.priceLevel]}</Chip>
          )}
        </Stack>

        <Stack direction="row" spacing="md">
          {attraction.estimatedDuration && (
            <Stack direction="row" spacing="xs" align="center">
              <Clock size={12} style={{ color: '#9ca3af' }} />
              <Typography variant="body2" style={{ fontSize: 11, color: '#9ca3af' }}>
                {attraction.estimatedDuration >= 60
                  ? `${Math.floor(attraction.estimatedDuration / 60)}ש${attraction.estimatedDuration % 60 > 0 ? `${attraction.estimatedDuration % 60}ד` : ''}`
                  : `${attraction.estimatedDuration}ד`}
              </Typography>
            </Stack>
          )}
          {attraction.location && (
            <Stack direction="row" spacing="xs" align="center">
              <MapPin size={12} style={{ color: '#9ca3af' }} />
              <Typography variant="body2" style={{ fontSize: 11, color: '#9ca3af' }}>
                {attraction.location}
              </Typography>
            </Stack>
          )}
        </Stack>

        <Button size="sm" variant="ghost" onClick={() => onExpand(attraction)} style={{ width: '100%' }}>
          <Stack direction="row" spacing="xs" align="center" justify="center">
            <span>הוסף ליום</span>
            <ChevronRight size={13} />
          </Stack>
        </Button>
      </Stack>
    </Card>
  )
}
