import { useState } from 'react'
import { Button, Stack } from 'myk-library'
import styled from 'styled-components'
import { Plus } from 'lucide-react'
import { useTripStore } from '@/stores/tripStore'
import type { RouteFramework, RouteStop, TravelLeg } from '@/types/route-framework'
import RouteStopCard from './RouteStopCard'
import TravelLegCard from './TravelLegCard'
import RouteStopFormModal from './RouteStopFormModal'
import TravelLegFormModal from './TravelLegFormModal'

const Panel = styled.div`
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`

const TimelineScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
`

const AddLegButton = styled.button`
  background: none;
  border: 1px dashed ${({ theme }) => theme.colors.gray[300]};
  border-radius: 16px;
  padding: 4px 14px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.gray[500]};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 2px auto;

  &:hover {
    background: ${({ theme }) => theme.colors.gray[100]};
    color: ${({ theme }) => theme.colors.gray[700]};
  }
`

const SummaryBar = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.gray[200]};
  padding: 10px 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.gray[600]};
  flex-shrink: 0;
`

const SummaryItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.gray[700]};
`

function totalTravelMinutes(legs: TravelLeg[]): string {
  const total = legs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0)
  if (!total) return ''
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')} שע'` : `${m} דקות`
}

interface Props {
  framework: RouteFramework
  tripId: string
}

export default function RouteTimeline({ framework, tripId }: Props) {
  const reorderRouteStops = useTripStore(s => s.reorderRouteStops)
  const [addingStop, setAddingStop] = useState(false)
  const [addingLeg, setAddingLeg] = useState<{ fromStop: RouteStop; toStop: RouteStop } | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const stops = [...framework.stops].sort((a, b) => a.order - b.order)
  const legs = framework.legs

  const getLegBetween = (fromId: string, toId: string) =>
    legs.find(l => l.fromStopId === fromId && l.toStopId === toId)

  const handleDragStart = (id: string) => { setDraggingId(id) }
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault() }
  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return
    const ids = stops.map(s => s.id)
    const fromIdx = ids.indexOf(draggingId)
    const toIdx = ids.indexOf(targetId)
    ids.splice(fromIdx, 1)
    ids.splice(toIdx, 0, draggingId)
    reorderRouteStops(tripId, ids)
    setDraggingId(null)
  }

  const totalDays = stops.reduce((s, st) => s + st.daysCount, 0)
  const travelTime = totalTravelMinutes(legs)

  return (
    <Panel>
      <TimelineScroll>
        {stops.map((stop, i) => {
          const nextStop = stops[i + 1]
          const leg = nextStop ? getLegBetween(stop.id, nextStop.id) : undefined

          return (
            <div key={stop.id}>
              <RouteStopCard
                stop={stop}
                index={i}
                tripId={tripId}
                dragging={draggingId === stop.id}
                onDragStart={() => handleDragStart(stop.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stop.id)}
              />

              {nextStop && (
                leg ? (
                  <TravelLegCard
                    leg={leg}
                    tripId={tripId}
                    stops={stops}
                    isLast={i === stops.length - 2}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '4px 0' }}>
                    <div style={{ width: 2, height: 14, background: '#f59e0b', opacity: 0.3, borderRadius: 1 }} />
                    <AddLegButton onClick={() => setAddingLeg({ fromStop: stop, toStop: nextStop })}>
                      <Plus size={11} /> הוסף תחבורה
                    </AddLegButton>
                    <div style={{ width: 2, height: 14, background: '#f59e0b', opacity: 0.3, borderRadius: 1 }} />
                  </div>
                )
              )}
            </div>
          )
        })}

        <Stack direction="row" justify="center" style={{ marginTop: 12 }}>
          <Button variant="ghost" size="sm" onClick={() => setAddingStop(true)}>
            <Plus size={14} /> הוסף עצירה
          </Button>
        </Stack>
      </TimelineScroll>

      <SummaryBar>
        <SummaryItem>📅 {totalDays} ימים סה"כ</SummaryItem>
        <SummaryItem>📍 {stops.length} עצירות</SummaryItem>
        {travelTime && <SummaryItem>🚗 נסיעות: {travelTime}</SummaryItem>}
      </SummaryBar>

      <RouteStopFormModal
        open={addingStop}
        onClose={() => setAddingStop(false)}
        tripId={tripId}
      />

      {addingLeg && (
        <TravelLegFormModal
          open={true}
          onClose={() => setAddingLeg(null)}
          tripId={tripId}
          fromStopId={addingLeg.fromStop.id}
          toStopId={addingLeg.toStop.id}
          fromStopName={addingLeg.fromStop.name}
          toStopName={addingLeg.toStop.name}
        />
      )}
    </Panel>
  )
}
