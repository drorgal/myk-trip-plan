import { useState } from 'react'
import { Stack, ActionIcon, Badge } from 'myk-library'
import styled from 'styled-components'
import { Pencil, Trash2, GripVertical, RefreshCw } from 'lucide-react'
import { useTripStore } from '@/stores/tripStore'
import { geocodeDestination } from '@/services/weatherService'
import type { RouteStop } from '@/types/route-framework'
import RouteStopFormModal from './RouteStopFormModal'

const Card = styled.div<{ $dragging?: boolean }>`
  background: ${({ theme }) => theme.colors.gray[50]};
  border: 1px solid ${({ theme }) => theme.colors.gray[200]};
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  opacity: ${({ $dragging }) => ($dragging ? 0.4 : 1)};
  cursor: grab;
`

const Number = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #1c2130;
  border: 2px solid #f59e0b;
  color: #f59e0b;
  font-weight: 800;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const StopName = styled.div`
  font-weight: 700;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.gray[900]};
`

const Notes = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.gray[500]};
  margin-top: 2px;
`

const GeoStatus = styled.div<{ $ok: boolean }>`
  font-size: 11px;
  color: ${({ $ok }) => ($ok ? '#22c55e' : '#f59e0b')};
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 4px;
`

interface Props {
  stop: RouteStop
  index: number
  tripId: string
  dragging: boolean
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
}

export default function RouteStopCard({ stop, index, tripId, dragging, onDragStart, onDragOver, onDrop }: Props) {
  const updateRouteStop = useTripStore(s => s.updateRouteStop)
  const removeRouteStop = useTripStore(s => s.removeRouteStop)
  const [editing, setEditing] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const handleRetryGeocode = async () => {
    setRetrying(true)
    const result = await geocodeDestination(stop.name)
    setRetrying(false)
    if (result) updateRouteStop(tripId, stop.id, { coords: result })
  }

  return (
    <>
      <Card
        $dragging={dragging}
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <GripVertical size={16} style={{ color: '#aaa', marginTop: 6, cursor: 'grab', flexShrink: 0 }} />
        <Number>{index + 1}</Number>
        <div style={{ flex: 1, minWidth: 0 }}>
          <StopName>{stop.name}</StopName>
          {stop.notes && <Notes>{stop.notes}</Notes>}
          <GeoStatus $ok={!!stop.coords}>
            {stop.coords ? '📍 על המפה' : '⚠️ לא נמצא על המפה'}
            {!stop.coords && (
              <button
                onClick={handleRetryGeocode}
                disabled={retrying}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#f59e0b', display: 'flex' }}
              >
                <RefreshCw size={11} style={{ animation: retrying ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            )}
          </GeoStatus>
        </div>
        <Stack direction="row" spacing="xs" align="center" style={{ flexShrink: 0 }}>
          <Badge variant="warning" size="sm">{stop.daysCount} ימים</Badge>
          <ActionIcon size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil size={13} />
          </ActionIcon>
          <ActionIcon size="sm" variant="ghost" onClick={() => removeRouteStop(tripId, stop.id)}>
            <Trash2 size={13} />
          </ActionIcon>
        </Stack>
      </Card>

      <RouteStopFormModal
        open={editing}
        onClose={() => setEditing(false)}
        tripId={tripId}
        editStop={stop}
      />
    </>
  )
}
