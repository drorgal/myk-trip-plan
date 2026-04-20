import { useState } from 'react'
import { Modal, Button, Input, Select, Textarea, Stack, Slider } from 'myk-library'
import { useTripStore } from '@/stores/tripStore'
import { formatDateISO } from '@/utils/date'
import { CURRENCY_OPTIONS } from '@/utils/currency'
import type { Accommodation, AccommodationType } from '@/types/accommodation'

const TYPE_OPTIONS = [
  { value: 'hotel', label: '🏨 מלון' },
  { value: 'airbnb', label: '🏠 Airbnb' },
  { value: 'hostel', label: '🛏️ הוסטל' },
  { value: 'villa', label: '🏡 וילה' },
  { value: 'other', label: '🏢 אחר' },
]

interface Props {
  open: boolean
  onClose: () => void
  tripId: string
  editAcc?: Accommodation
}

export default function AccommodationFormModal({ open, onClose, tripId, editAcc }: Props) {
  const addAccommodation = useTripStore(s => s.addAccommodation)
  const updateAccommodation = useTripStore(s => s.updateAccommodation)

  const today = formatDateISO(new Date())
  const [name, setName] = useState(editAcc?.name ?? '')
  const [type, setType] = useState<AccommodationType>(editAcc?.type ?? 'hotel')
  const [address, setAddress] = useState(editAcc?.address ?? '')
  const [checkIn, setCheckIn] = useState(editAcc?.checkIn ?? today)
  const [checkOut, setCheckOut] = useState(editAcc?.checkOut ?? today)
  const [cost, setCost] = useState(String(editAcc?.cost ?? 0))
  const [currency, setCurrency] = useState(editAcc?.currency ?? 'ILS')
  const [confirmationNumber, setConfirmationNumber] = useState(editAcc?.confirmationNumber ?? '')
  const [rating, setRating] = useState(editAcc?.rating ?? 3)
  const [notes, setNotes] = useState(editAcc?.notes ?? '')

  const handleSave = () => {
    if (!name.trim()) return
    const data = {
      name, type, address: address || undefined, checkIn, checkOut,
      cost: Number(cost), currency, confirmationNumber: confirmationNumber || undefined,
      rating, notes: notes || undefined,
    }
    if (editAcc) {
      updateAccommodation(tripId, editAcc.id, data)
    } else {
      addAccommodation(tripId, data)
    }
    onClose()
  }

  return (
    <Modal isOpen={open} onClose={onClose} size="lg" title={editAcc ? 'עריכת לינה' : 'הוספת לינה'}>
      <Stack direction="column" spacing="md">
        <Stack direction="row" spacing="md">
          <Input label="שם המקום" value={name} onChange={e => setName(e.target.value)} placeholder="מלון רומא" style={{ flex: 2 }} />
          <Select label="סוג" value={type} onChange={e => setType(e.target.value as AccommodationType)} style={{ flex: 1 }}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Stack>
        <Input label="כתובת" value={address} onChange={e => setAddress(e.target.value)} placeholder="Via Roma 1, Roma" />
        <Stack direction="row" spacing="md">
          <Input type="date" label="צ'ק-אין" value={checkIn} onChange={e => setCheckIn(e.target.value)} style={{ flex: 1 }} />
          <Input type="date" label="צ'ק-אאוט" value={checkOut} onChange={e => setCheckOut(e.target.value)} style={{ flex: 1 }} />
        </Stack>
        <Stack direction="row" spacing="md">
          <Input label="עלות" value={cost} onChange={e => setCost(e.target.value)} type="number" min="0" style={{ flex: 1 }} />
          <Select label="מטבע" value={currency} onChange={e => setCurrency(e.target.value)} style={{ flex: 1 }}>
            {CURRENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Stack>
        <Input label="מספר אישור" value={confirmationNumber} onChange={e => setConfirmationNumber(e.target.value)} placeholder="BK123456" />
        <Stack direction="column" spacing="xs">
          <span style={{ fontSize: 14, fontWeight: 500 }}>דירוג: {rating}/5 {'⭐'.repeat(rating)}</span>
          <Slider value={rating} onChange={v => setRating(v)} min={1} max={5} step={1} />
        </Stack>
        <Textarea label="הערות" value={notes} onChange={e => setNotes(e.target.value)} resize="vertical" />
        <Stack direction="row" justify="end" spacing="sm">
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
          <Button variant="primary" onClick={handleSave} disabled={!name.trim()}>שמור</Button>
        </Stack>
      </Stack>
    </Modal>
  )
}
