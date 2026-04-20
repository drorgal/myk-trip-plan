import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTripStore } from '@/stores/tripStore'
import DayColumn from '@/components/itinerary/DayColumn'
import GmailSyncModal from '@/components/gmail/GmailSyncModal'
import { Stack, Typography, Badge, Button } from 'myk-library'
import { getTripDuration } from '@/utils/date'
import { formatDateShort } from '@/utils/date'
import { Mail } from 'lucide-react'
import styled from 'styled-components'

const ScrollContainer = styled.div`
  display: flex;
  flex-direction: row-reverse;
  gap: 16px;
  overflow-x: auto;
  padding: 24px;
  min-height: calc(100vh - 120px);
  align-items: flex-start;

  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
`

const PageHeader = styled.div`
  padding: 20px 24px 0;
`

export default function Itinerary() {
  const { id } = useParams<{ id: string }>()
  const trip = useTripStore(s => s.trips.find(t => t.id === id))
  const [showGmail, setShowGmail] = useState(false)

  if (!trip) return null

  const duration = getTripDuration(trip.startDate, trip.endDate)

  return (
    <div>
      <PageHeader>
        <Stack direction="row" align="center" justify="between" spacing="md">
          <Stack direction="row" align="center" spacing="md">
            <Typography variant="h5" style={{ margin: 0 }}>📅 לוח זמנים</Typography>
            <Badge variant="default">{duration} ימים</Badge>
            <Typography variant="body2" style={{ color: '#6b7280' }}>
              {formatDateShort(trip.startDate)} – {formatDateShort(trip.endDate)}
            </Typography>
          </Stack>
          <Button size="sm" variant="ghost" onClick={() => setShowGmail(true)}>
            <Stack direction="row" spacing="xs" align="center">
              <Mail size={14} /><span>סנכרן מ-Gmail</span>
            </Stack>
          </Button>
        </Stack>
      </PageHeader>
      {showGmail && <GmailSyncModal open={showGmail} onClose={() => setShowGmail(false)} tripId={trip.id} />}

      <ScrollContainer>
        {trip.days.map((day, index) => (
          <DayColumn key={day.id} day={day} tripId={trip.id} dayIndex={index} />
        ))}
      </ScrollContainer>
    </div>
  )
}
