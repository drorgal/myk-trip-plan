import { Card, Stack, Typography, Badge, Chip, Button } from 'myk-library'
import styled from 'styled-components'
import { ExternalLink, BookmarkPlus, Plane, Hotel, Star } from 'lucide-react'
import type { PriceResult } from '@/types/price-comparison'
import { formatCurrency } from '@/utils/currency'

const ProviderBadge = styled.div<{ $provider: string }>`
  background: ${({ theme }) => theme.colors.gray[100]};
  color: ${({ theme }) => theme.colors.gray[700]};
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
`

const PriceBlock = styled.div`
  text-align: left;
  min-width: 110px;
`

const SubLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.gray[500]};
`

const HotelImage = styled.img`
  width: 100%;
  height: 130px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 10px;
  display: block;
`

const HotelName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.gray[800]};
  margin-bottom: 4px;
`

function FlightMeta({ meta, currency }: { meta: Record<string, string | number | boolean>; currency: string }) {
  const stops = Number(meta.stops ?? 0)
  const dur = Number(meta.durationMinutes ?? 0)
  const h = Math.floor(dur / 60)
  const m = dur % 60
  return (
    <Stack direction="column" spacing="xs">
      <Stack direction="row" spacing="sm" align="center">
        <Typography variant="body1" style={{ fontWeight: 700 }}>{String(meta.airline ?? '')}</Typography>
        <Badge size="sm" variant="info">{String(meta.flightNumber ?? '')}</Badge>
        <Badge size="sm" variant={stops === 0 ? 'success' : 'warning'}>
          {stops === 0 ? 'ישיר' : `${stops} עצירה`}
        </Badge>
      </Stack>
      <Stack direction="row" spacing="md">
        <Typography variant="body2">🕐 {String(meta.departureTime ?? '')}–{String(meta.arrivalTime ?? '')}</Typography>
        <Typography variant="body2">⏱ {h}ש{m > 0 ? `${m}ד` : ''}</Typography>
        <Typography variant="body2">💺 {meta.cabinClass === 'business' ? 'עסקים' : meta.cabinClass === 'first' ? 'ראשונה' : 'תיירות'}</Typography>
      </Stack>
      {meta.pricePerPerson && (
        <SubLabel>{formatCurrency(Number(meta.pricePerPerson), currency)} לנוסע</SubLabel>
      )}
    </Stack>
  )
}

function HotelMeta({ meta, currency }: { meta: Record<string, string | number | boolean>; currency: string }) {
  const stars = Number(meta.stars ?? 3)
  return (
    <Stack direction="column" spacing="xs">
      <Stack direction="row" spacing="sm" align="center">
        <Typography variant="body2" style={{ fontWeight: 600 }}>{'⭐'.repeat(Math.min(stars, 5))}</Typography>
        <Chip size="sm">{String(meta.neighborhood ?? '')}</Chip>
      </Stack>
      <Stack direction="row" spacing="sm">
        <SubLabel>{formatCurrency(Number(meta.pricePerNight ?? 0), currency)} / לילה · {meta.nights} לילות</SubLabel>
      </Stack>
      {meta.breakfastIncluded && (
        <Chip size="sm" variant="success">🍳 ארוחת בוקר כלולה</Chip>
      )}
    </Stack>
  )
}

interface Props {
  result: PriceResult
  onSave: (result: PriceResult) => void
}

export default function PriceResultCard({ result, onSave }: Props) {
  const meta = result.metadata ?? {}

  const hotelName = result.category === 'hotel' ? result.label.split(' · ')[0] : null

  return (
    <Card variant="outlined" padding="md">
      {result.category === 'hotel' && result.imageUrl && (
        <HotelImage src={result.imageUrl} alt={hotelName ?? ''} loading="lazy" />
      )}
      {hotelName && <HotelName>{hotelName}</HotelName>}
      <Stack direction="row" justify="between" align="start" spacing="md">
        <Stack direction="column" spacing="sm" style={{ flex: 1 }}>
          <Stack direction="row" spacing="sm" align="center">
            {result.category === 'flight' ? <Plane size={14} /> : <Hotel size={14} />}
            <ProviderBadge $provider={result.provider}>{result.provider}</ProviderBadge>
            {result.rating != null && (
              <Stack direction="row" spacing="xs" align="center">
                <Star size={12} fill="#f59e0b" color="#f59e0b" />
                <Typography variant="body2" style={{ fontSize: 12 }}>
                  {result.rating.toFixed(1)}
                  {result.reviewCount ? ` (${result.reviewCount.toLocaleString()})` : ''}
                </Typography>
              </Stack>
            )}
          </Stack>

          {result.category === 'flight' && Object.keys(meta).length > 0 && (
            <FlightMeta meta={meta} currency={result.currency} />
          )}
          {result.category === 'hotel' && Object.keys(meta).length > 0 && (
            <HotelMeta meta={meta} currency={result.currency} />
          )}

          {Object.keys(meta).length === 0 && (
            <Typography variant="body2">{result.label}</Typography>
          )}
        </Stack>

        <Stack direction="column" align="end" spacing="sm">
          <PriceBlock>
            <Typography variant="body2" style={{ color: '#6b7280', fontSize: 11, textAlign: 'left' }}>סה"כ</Typography>
            <Typography variant="h5" style={{ margin: 0, color: '#059669', textAlign: 'left' }}>
              {formatCurrency(result.price, result.currency)}
            </Typography>
          </PriceBlock>

          <Stack direction="column" spacing="xs">
            <Button
              size="sm"
              variant="primary"
              onClick={() => window.open(result.deepLink, '_blank', 'noopener')}
            >
              <Stack direction="row" spacing="xs" align="center">
                <ExternalLink size={13} /><span>להזמנה</span>
              </Stack>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onSave(result)}>
              <Stack direction="row" spacing="xs" align="center">
                <BookmarkPlus size={13} /><span>שמור לטיול</span>
              </Stack>
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Card>
  )
}
