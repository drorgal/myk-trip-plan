import { useState, useRef } from 'react'
import { Modal, Button, Input, Textarea, Stack, Spinner } from 'myk-library'
import { useTripStore } from '@/stores/tripStore'
import { geocodeDestination } from '@/services/weatherService'
import type { RouteStop } from '@/types/route-framework'
import type { TripCoords } from '@/types/trip-plan'

interface Props {
  open: boolean
  onClose: () => void
  tripId: string
  editStop?: RouteStop
}

export default function RouteStopFormModal({ open, onClose, tripId, editStop }: Props) {
  const addRouteStop = useTripStore(s => s.addRouteStop)
  const updateRouteStop = useTripStore(s => s.updateRouteStop)

  const [name, setName] = useState(editStop?.name ?? '')
  const [daysCount, setDaysCount] = useState(String(editStop?.daysCount ?? 2))
  const [notes, setNotes] = useState(editStop?.notes ?? '')
  const [coords, setCoords] = useState<TripCoords | undefined>(editStop?.coords)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeLabel, setGeocodeLabel] = useState<string | null>(editStop?.coords ? '📍 מיפוי הצליח' : null)
  const lastGeocodedName = useRef<string>('')

  const tryGeocode = async (value: string) => {
    if (!value.trim() || value === lastGeocodedName.current) return
    lastGeocodedName.current = value
    setGeocoding(true)
    setGeocodeLabel(null)
    const result = await geocodeDestination(value)
    setGeocoding(false)
    if (result) {
      setCoords(result)
      setGeocodeLabel('📍 מיפוי הצליח')
    } else {
      setCoords(undefined)
      setGeocodeLabel('⚠️ לא נמצא על המפה')
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return
    const days = Math.max(1, parseInt(daysCount) || 1)

    let finalCoords = coords
    if (!finalCoords) {
      setGeocoding(true)
      finalCoords = (await geocodeDestination(name.trim())) ?? undefined
      setGeocoding(false)
    }

    if (editStop) {
      updateRouteStop(tripId, editStop.id, {
        name: name.trim(),
        daysCount: days,
        notes: notes.trim() || undefined,
        coords: finalCoords,
      })
    } else {
      addRouteStop(tripId, {
        name: name.trim(),
        daysCount: days,
        notes: notes.trim() || undefined,
        coords: finalCoords,
      })
    }
    handleClose()
  }

  const handleClose = () => {
    setName(editStop?.name ?? '')
    setDaysCount(String(editStop?.daysCount ?? 2))
    setNotes(editStop?.notes ?? '')
    setCoords(editStop?.coords)
    setGeocoding(false)
    setGeocodeLabel(editStop?.coords ? '📍 מיפוי הצליח' : null)
    lastGeocodedName.current = ''
    onClose()
  }

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      size="md"
      title={editStop ? 'עריכת עצירה' : 'הוספת עצירה'}
    >
      <Stack direction="column" spacing="md">
        <div>
          <Input
            label="שם האזור"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={e => tryGeocode(e.target.value)}
            placeholder='למשל: רומא, אגם קומו, טוסקנה'
            autoFocus
          />
          {geocoding && (
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888' }}>
              <Spinner size="sm" /> מחפש על המפה...
            </div>
          )}
          {!geocoding && geocodeLabel && (
            <div style={{ marginTop: 4, fontSize: 12, color: geocodeLabel.startsWith('📍') ? '#22c55e' : '#f59e0b' }}>
              {geocodeLabel}
            </div>
          )}
        </div>

        <Input
          type="number"
          label="מספר ימים"
          value={daysCount}
          onChange={e => setDaysCount(e.target.value)}
          min={1}
          max={30}
          style={{ maxWidth: 140 }}
        />

        <Textarea
          label="הערות (אופציונלי)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          resize="vertical"
          placeholder="מידע נוסף, אטרקציות, הערות..."
        />

        <Stack direction="row" justify="end" spacing="sm">
          <Button variant="ghost" onClick={handleClose}>ביטול</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!name.trim() || geocoding}
          >
            {geocoding ? <Spinner size="sm" /> : 'שמור'}
          </Button>
        </Stack>
      </Stack>
    </Modal>
  )
}
