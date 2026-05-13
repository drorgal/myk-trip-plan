import { useState } from 'react'
import { Stack, ActionIcon } from 'myk-library'
import styled from 'styled-components'
import { Pencil, Trash2 } from 'lucide-react'
import { useTripStore } from '@/stores/tripStore'
import type { TravelLeg, TravelMode } from '@/types/route-framework'
import type { RouteStop } from '@/types/route-framework'
import TravelLegFormModal from './TravelLegFormModal'

const MODE_LABELS: Record<TravelMode, string> = {
  plane: '✈️ טיסה',
  train: '🚂 רכבת',
  car: '🚗 נסיעה',
  bus: '🚌 אוטובוס',
  boat: '⛵ ספינה',
  other: '🚀 נסיעה',
}

const LegRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 16px;
`

const Line = styled.div`
  width: 2px;
  height: 20px;
  background: #f59e0b;
  border-radius: 1px;
  opacity: 0.5;
  margin: 0 13px;
`

const LegPill = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${({ theme }) => theme.colors.gray[100]};
  border: 1px solid ${({ theme }) => theme.colors.gray[200]};
  border-radius: 20px;
  padding: 5px 12px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.gray[700]};
`

const Duration = styled.span`
  color: ${({ theme }) => theme.colors.gray[500]};
  font-size: 12px;
`

const Notes = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.gray[400]};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100px;
`

function formatDuration(minutes?: number): string {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} דקות`
  if (m === 0) return h === 1 ? 'שעה' : `${h} שעות`
  return `${h}:${String(m).padStart(2, '0')} שע'`
}

interface Props {
  leg: TravelLeg
  tripId: string
  stops: RouteStop[]
  isLast: boolean
}

export default function TravelLegCard({ leg, tripId, stops, isLast }: Props) {
  const removeTravelLeg = useTripStore(s => s.removeTravelLeg)
  const [editing, setEditing] = useState(false)

  const fromStop = stops.find(s => s.id === leg.fromStopId)
  const toStop = stops.find(s => s.id === leg.toStopId)

  return (
    <>
      <div>
        <Line />
        <LegRow>
          <LegPill>
            <span>{MODE_LABELS[leg.mode]}</span>
            {leg.durationMinutes && <Duration>{formatDuration(leg.durationMinutes)}</Duration>}
            {leg.notes && <Notes title={leg.notes}>· {leg.notes}</Notes>}
          </LegPill>
          <Stack direction="row" spacing="xs">
            <ActionIcon size="sm" variant="subtle" onClick={() => setEditing(true)}>
              <Pencil size={12} />
            </ActionIcon>
            <ActionIcon size="sm" variant="subtle" onClick={() => removeTravelLeg(tripId, leg.id)}>
              <Trash2 size={12} />
            </ActionIcon>
          </Stack>
        </LegRow>
        {!isLast && <Line />}
      </div>

      {fromStop && toStop && (
        <TravelLegFormModal
          open={editing}
          onClose={() => setEditing(false)}
          tripId={tripId}
          fromStopId={leg.fromStopId}
          toStopId={leg.toStopId}
          fromStopName={fromStop.name}
          toStopName={toStop.name}
          editLeg={leg}
        />
      )}
    </>
  )
}
