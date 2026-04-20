import { useState } from 'react'
import { Modal, Button, Input, Select, Textarea, NumberInput, Stack } from 'myk-library'
import { useTripStore } from '@/stores/tripStore'
import type { TripEvent, TripEventCategory } from '@/types/trip'

const CATEGORY_OPTIONS = [
  { value: 'activity', label: '🎯 פעילות' },
  { value: 'meal', label: '🍽️ ארוחה' },
  { value: 'transport', label: '🚌 תחבורה' },
  { value: 'tour', label: '🗺️ סיור' },
  { value: 'rest', label: '😴 מנוחה' },
]

interface Props {
  open: boolean
  onClose: () => void
  tripId: string
  dayDate: string
  editEvent?: TripEvent
}

export default function EventFormModal({ open, onClose, tripId, dayDate, editEvent }: Props) {
  const addEvent = useTripStore(s => s.addEvent)
  const updateEvent = useTripStore(s => s.updateEvent)

  const [title, setTitle] = useState(editEvent?.title ?? '')
  const [startTime, setStartTime] = useState(editEvent?.startTime ?? '09:00')
  const [endTime, setEndTime] = useState(editEvent?.endTime ?? '')
  const [category, setCategory] = useState<TripEventCategory>(editEvent?.category ?? 'activity')
  const [location, setLocation] = useState(editEvent?.location ?? '')
  const [description, setDescription] = useState(editEvent?.description ?? '')
  const [cost, setCost] = useState<number | undefined>(editEvent?.cost)

  const handleSave = () => {
    if (!title.trim()) return
    const data = { title, startTime, endTime: endTime || undefined, category, location: location || undefined, description: description || undefined, cost }
    if (editEvent) {
      updateEvent(tripId, editEvent.id, data)
    } else {
      addEvent(tripId, dayDate, data)
    }
    handleClose()
  }

  const handleClose = () => {
    setTitle('')
    setStartTime('09:00')
    setEndTime('')
    setCategory('activity')
    setLocation('')
    setDescription('')
    setCost(undefined)
    onClose()
  }

  return (
    <Modal isOpen={open} onClose={handleClose} size="md" title={editEvent ? 'עריכת אירוע' : 'הוספת אירוע'}>
      <Stack direction="column" spacing="md">
        <Input label="כותרת" value={title} onChange={e => setTitle(e.target.value)} placeholder="ביקור במוזיאון" autoFocus />
        <Select label="קטגוריה" value={category} onChange={e => setCategory(e.target.value as TripEventCategory)}>
          {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Stack direction="row" spacing="md">
          <Input type="time" label="שעת התחלה" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ flex: 1 }} />
          <Input type="time" label="שעת סיום" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ flex: 1 }} />
        </Stack>
        <Input label="מיקום" value={location} onChange={e => setLocation(e.target.value)} placeholder="כתובת או שם מקום" />
        <NumberInput label="עלות (אופציונלי)" value={cost} onChange={val => setCost(val ?? undefined)} min={0} />
        <Textarea label="פרטים" value={description} onChange={e => setDescription(e.target.value)} placeholder="פרטים נוספים..." resize="vertical" />
        <Stack direction="row" justify="end" spacing="sm">
          <Button variant="ghost" onClick={handleClose}>ביטול</Button>
          <Button variant="primary" onClick={handleSave} disabled={!title.trim()}>שמור</Button>
        </Stack>
      </Stack>
    </Modal>
  )
}
