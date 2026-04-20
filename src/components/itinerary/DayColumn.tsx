import { useState } from 'react'
import { Card, Timeline, Badge, Stack, ActionIcon, Button, Typography } from 'myk-library'
import type { TimelineItem } from 'myk-library'
import { useTripStore } from '@/stores/tripStore'
import { formatDateHe } from '@/utils/date'
import type { TripDay, TripEvent } from '@/types/trip'
import EventFormModal from './EventFormModal'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import styled from 'styled-components'

const CATEGORY_COLORS: Record<string, string> = {
  activity: '#f59e0b',
  meal: '#10b981',
  transport: '#3b82f6',
  tour: '#8b5cf6',
  rest: '#6b7280',
}

const CATEGORY_LABEL: Record<string, string> = {
  activity: '🎯 פעילות',
  meal: '🍽️ ארוחה',
  transport: '🚌 תחבורה',
  tour: '🗺️ סיור',
  rest: '😴 מנוחה',
}

const DayWrapper = styled.div`
  width: 100%;
`

interface Props {
  day: TripDay
  tripId: string
  dayIndex: number
}

export default function DayColumn({ day, tripId, dayIndex }: Props) {
  const removeEvent = useTripStore(s => s.removeEvent)
  const [showAdd, setShowAdd] = useState(false)
  const [editEvent, setEditEvent] = useState<TripEvent | undefined>()

  const sortedEvents = [...day.events].sort((a, b) => a.startTime.localeCompare(b.startTime))

  const timelineItems: TimelineItem[] = sortedEvents.map(event => ({
    key: event.id,
    label: event.startTime + (event.endTime ? ` – ${event.endTime}` : ''),
    color: CATEGORY_COLORS[event.category],
    children: (
      <Stack direction="column" spacing="xs">
        <Stack direction="row" align="center" justify="between">
          <Typography variant="body1" style={{ fontWeight: 500 }}>{event.title}</Typography>
          <Stack direction="row" spacing="xs">
            <ActionIcon size="sm" variant="subtle" onClick={() => setEditEvent(event)}>
              <Pencil size={12} />
            </ActionIcon>
            <ActionIcon size="sm" variant="subtle" onClick={() => removeEvent(tripId, event.id)}>
              <Trash2 size={12} />
            </ActionIcon>
          </Stack>
        </Stack>
        <Badge size="sm" variant="default">{CATEGORY_LABEL[event.category]}</Badge>
        {event.location && (
          <Typography variant="body2" style={{ color: '#6b7280' }}>📍 {event.location}</Typography>
        )}
        {event.cost !== undefined && (
          <Typography variant="body2" style={{ color: '#059669' }}>₪{event.cost.toLocaleString()}</Typography>
        )}
      </Stack>
    ),
  }))

  return (
    <DayWrapper>
      <Card variant="outlined" padding="md">
        <Stack direction="column" spacing="md">
          <Stack direction="column" spacing="xs">
            <Typography variant="body2" style={{ color: '#6b7280', fontSize: 12, fontWeight: 600 }}>יום {dayIndex + 1}</Typography>
            <Typography variant="body1" style={{ fontWeight: 600 }}>{formatDateHe(day.date)}</Typography>
          </Stack>

          {timelineItems.length > 0 ? (
            <Timeline items={timelineItems} mode="right" />
          ) : (
            <Typography variant="body2" style={{ color: '#9ca3af', textAlign: 'center', padding: '24px 0' }}>
              אין אירועים מתוכננים
            </Typography>
          )}

          <Button variant="ghost" size="sm" onClick={() => setShowAdd(true)} style={{ width: '100%' }}>
            <Stack direction="row" spacing="xs" align="center" justify="center">
              <Plus size={14} />
              <span>הוסף אירוע</span>
            </Stack>
          </Button>
        </Stack>
      </Card>

      <EventFormModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        tripId={tripId}
        dayDate={day.date}
      />
      {editEvent && (
        <EventFormModal
          open={!!editEvent}
          onClose={() => setEditEvent(undefined)}
          tripId={tripId}
          dayDate={day.date}
          editEvent={editEvent}
        />
      )}
    </DayWrapper>
  )
}
