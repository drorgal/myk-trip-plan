import { Card, Stack, Typography, Badge, Chip, Button } from 'myk-library'
import styled from 'styled-components'
import { ExternalLink, BookmarkPlus, Users, Fuel, Shield } from 'lucide-react'
import type { CarRentalOffer } from '@/services/carRentalSearchService'
import { formatCurrency } from '@/utils/currency'

const CAR_CATEGORY_LABEL: Record<string, string> = {
  economy: '🚗 קטנה', compact: '🚗 קומפקט', midsize: '🚙 בינונית',
  'full-size': '🚙 גדולה', suv: '🚐 SUV', van: '🚌 ואן', luxury: '🏎️ יוקרה',
}

const CompanyLogo = styled.img`
  height: 28px;
  width: auto;
  object-fit: contain;
`

const CarImage = styled.img`
  width: 100%;
  max-width: 180px;
  height: 100px;
  object-fit: contain;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.gray[100]};
`

const PriceBlock = styled.div`
  text-align: left;
  min-width: 100px;
`

const AiBadge = styled.div`
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #0f1117;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  margin-bottom: 4px;
`

interface Props {
  offer: CarRentalOffer
  tripId: string
  isTopPick?: boolean
  isBestValue?: boolean
  isPremium?: boolean
  onSave: (offer: CarRentalOffer) => void
}

export default function CarRentalResultCard({ offer, isTopPick, isBestValue, isPremium, onSave }: Props) {
  return (
    <Card
      variant={isTopPick ? 'elevated' : 'outlined'}
      padding="md"
      style={{ border: isTopPick ? '2px solid #f59e0b' : undefined }}
    >
      <Stack direction="column" spacing="sm">
        {(isTopPick || isBestValue || isPremium) && (
          <Stack direction="row" spacing="xs">
            {isTopPick && <AiBadge>⭐ המלצת AI</AiBadge>}
            {isBestValue && !isTopPick && <AiBadge>💰 הכי שווה</AiBadge>}
            {isPremium && <AiBadge>✨ פרמיום</AiBadge>}
          </Stack>
        )}

        <Stack direction="row" justify="between" align="start" spacing="md">
          <Stack direction="column" spacing="xs" style={{ flex: 1 }}>
            <Stack direction="row" spacing="sm" align="center">
              {offer.companyLogo ? (
                <CompanyLogo src={offer.companyLogo} alt={offer.company} />
              ) : (
                <Typography variant="body1" style={{ fontWeight: 700 }}>{offer.company}</Typography>
              )}
              {offer.companyLogo && (
                <Typography variant="body2" style={{ fontWeight: 600 }}>{offer.company}</Typography>
              )}
            </Stack>

            <Stack direction="row" spacing="sm" align="center">
              <Typography variant="body1" style={{ fontWeight: 600 }}>{offer.carModel}</Typography>
              <Badge size="sm" variant="info">{CAR_CATEGORY_LABEL[offer.carCategory] ?? offer.carCategory}</Badge>
            </Stack>

            <Stack direction="row" spacing="md">
              <Stack direction="row" spacing="xs" align="center">
                <Users size={13} />
                <Typography variant="body2">{offer.seats}</Typography>
              </Stack>
              <Typography variant="body2">
                {offer.transmission === 'automatic' ? '⚙️ אוטומט' : '🔧 ידני'}
              </Typography>
              <Stack direction="row" spacing="xs" align="center">
                <Fuel size={13} />
                <Typography variant="body2" style={{ fontSize: 12 }}>{offer.fuelPolicy}</Typography>
              </Stack>
            </Stack>

            <Stack direction="row" spacing="sm">
              {offer.includesInsurance && (
                <Chip size="sm" variant="success">
                  <Stack direction="row" spacing="xs" align="center">
                    <Shield size={11} /><span>ביטוח כלול</span>
                  </Stack>
                </Chip>
              )}
              {offer.rating != null && (
                <Chip size="sm">⭐ {offer.rating.toFixed(1)}{offer.reviewCount ? ` (${offer.reviewCount.toLocaleString()})` : ''}</Chip>
              )}
            </Stack>
          </Stack>

          {offer.imageUrl && (
            <CarImage src={offer.imageUrl} alt={offer.carModel} />
          )}

          <Stack direction="column" align="end" spacing="sm">
            <PriceBlock>
              <Typography variant="body2" style={{ color: '#6b7280', fontSize: 11, textAlign: 'left' }}>סה"כ</Typography>
              <Typography variant="h5" style={{ margin: 0, color: '#059669', textAlign: 'left' }}>
                {formatCurrency(offer.totalPrice, offer.currency)}
              </Typography>
              <Typography variant="body2" style={{ color: '#6b7280', fontSize: 12, textAlign: 'left' }}>
                {formatCurrency(offer.pricePerDay, offer.currency)} / יום
              </Typography>
            </PriceBlock>

            <Stack direction="column" spacing="xs">
              <Button
                size="sm"
                variant="primary"
                onClick={() => window.open(offer.bookingUrl, '_blank', 'noopener')}
              >
                <Stack direction="row" spacing="xs" align="center">
                  <ExternalLink size={13} /><span>להזמנה</span>
                </Stack>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onSave(offer)}>
                <Stack direction="row" spacing="xs" align="center">
                  <BookmarkPlus size={13} /><span>שמור לטיול</span>
                </Stack>
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </Card>
  )
}
