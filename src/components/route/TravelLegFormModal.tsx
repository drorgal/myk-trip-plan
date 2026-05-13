import { useState } from 'react'
import { Modal, Button, Select, Input, Textarea, Stack } from 'myk-library'
import { useTripStore } from '@/stores/tripStore'
import type { TravelLeg, TravelMode } from '@/types/route-framework'

const MODE_OPTIONS: { value: TravelMode; label: string }[] = [
  { value: 'car', label: '🚗 נסיעה' },
  { value: 'train', label: '🚂 רכבת' },
  { value: 'plane', label: '✈️ טיסה' },
  { value: 'bus', label: '🚌 אוטובוס' },
  { value: 'boat', label: '⛵ ספינה' },
  { value: 'other', label: '🚀 אחר' },
]

interface Props {
  open: boolean
  onClose: () => void
  tripId: string
  fromStopName: string
  toStopName: string
  fromStopId: string
  toStopId: string
  editLeg?: TravelLeg
}

export default function TravelLegFormModal({
  open, onClose, tripId,
  fromStopName, toStopName,
  fromStopId, toStopId,
  editLeg,
}: Props) {
  const addTravelLeg = useTripStore(s => s.addTravelLeg)
  const updateTravelLeg = useTripStore(s => s.updateTravelLeg)

  const initMinutes = editLeg?.durationMinutes ?? 0
  const [mode, setMode] = useState<TravelMode>(editLeg?.mode ?? 'car')
  const [hours, setHours] = useState(String(Math.floor(initMinutes / 60)))
  const [minutes, setMinutes] = useState(String(initMinutes % 60))
  const [notes, setNotes] = useState(editLeg?.notes ?? '')

  const handleSave = () => {
    const h = parseInt(hours) || 0
    const m = parseInt(minutes) || 0
    const durationMinutes = h * 60 + m || undefined

    if (editLeg) {
      updateTravelLeg(tripId, editLeg.id, { mode, durationMinutes, notes: notes.trim() || undefined })
    } else {
      addTravelLeg(tripId, { fromStopId, toStopId, mode, durationMinutes, notes: notes.trim() || undefined })
    }
    handleClose()
  }

  const handleClose = () => {
    setMode(editLeg?.mode ?? 'car')
    setHours(String(Math.floor(initMinutes / 60)))
    setMinutes(String(initMinutes % 60))
    setNotes(editLeg?.notes ?? '')
    onClose()
  }

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      size="md"
      title={editLeg ? 'עריכת נסיעה' : 'הוספת נסיעה'}
    >
      <Stack direction="column" spacing="md">
        <div style={{ fontSize: 13, color: '#888', background: '#f5f5f5', borderRadius: 8, padding: '8px 12px' }}>
          {fromStopName} → {toStopName}
        </div>

        <Select
          label="אמצעי תחבורה"
          value={mode}
          onChange={e => setMode(e.target.value as TravelMode)}
        >
          {MODE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>

        <Stack direction="row" spacing="sm" align="end">
          <Input
            type="number"
            label="שעות"
            value={hours}
            onChange={e => setHours(e.target.value)}
            min={0}
            max={48}
            style={{ flex: 1 }}
            placeholder="0"
          />
          <Input
            type="number"
            label="דקות"
            value={minutes}
            onChange={e => setMinutes(e.target.value)}
            min={0}
            max={59}
            style={{ flex: 1 }}
            placeholder="0"
          />
        </Stack>

        <Textarea
          label="הערות (אופציונלי)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          resize="vertical"
          placeholder='למשל: FrecciaRossa, הזמן כרטיסים מראש'
        />

        <Stack direction="row" justify="end" spacing="sm">
          <Button variant="ghost" onClick={handleClose}>ביטול</Button>
          <Button variant="primary" onClick={handleSave}>שמור</Button>
        </Stack>
      </Stack>
    </Modal>
  )
}
