import { useState } from 'react'
import { Modal, Button, Input, Select, Textarea, Stack, Checkbox } from 'myk-library'
import { useTripStore } from '@/stores/tripStore'
import { formatDateISO } from '@/utils/date'
import { CURRENCY_OPTIONS } from '@/utils/currency'
import type { CarRental, CarCategory } from '@/types/accommodation'

const CATEGORY_OPTIONS = [
  { value: 'economy', label: '🚗 קטנה' },
  { value: 'compact', label: '🚗 קומפקט' },
  { value: 'midsize', label: '🚙 בינונית' },
  { value: 'full-size', label: '🚙 גדולה' },
  { value: 'suv', label: '🚐 SUV' },
  { value: 'van', label: '🚌 ואן' },
  { value: 'luxury', label: '🏎️ יוקרה' },
]

interface Props {
  open: boolean
  onClose: () => void
  tripId: string
  editRental?: CarRental
}

export default function CarRentalFormModal({ open, onClose, tripId, editRental }: Props) {
  const addCarRental = useTripStore(s => s.addCarRental)
  const updateCarRental = useTripStore(s => s.updateCarRental)

  const today = formatDateISO(new Date())
  const [company, setCompany] = useState(editRental?.company ?? '')
  const [carModel, setCarModel] = useState(editRental?.carModel ?? '')
  const [carCategory, setCarCategory] = useState<CarCategory>(editRental?.carCategory ?? 'economy')
  const [pickupLocation, setPickupLocation] = useState(editRental?.pickupLocation ?? '')
  const [dropoffLocation, setDropoffLocation] = useState(editRental?.dropoffLocation ?? '')
  const [pickupDate, setPickupDate] = useState(editRental?.pickupDate ?? today)
  const [dropoffDate, setDropoffDate] = useState(editRental?.dropoffDate ?? today)
  const [cost, setCost] = useState(String(editRental?.cost ?? 0))
  const [currency, setCurrency] = useState(editRental?.currency ?? 'ILS')
  const [confirmationNumber, setConfirmationNumber] = useState(editRental?.confirmationNumber ?? '')
  const [driverName, setDriverName] = useState(editRental?.driverName ?? '')
  const [includesInsurance, setIncludesInsurance] = useState(editRental?.includesInsurance ?? false)
  const [notes, setNotes] = useState(editRental?.notes ?? '')

  const handleSave = () => {
    if (!company.trim() || !pickupLocation.trim()) return
    const data = {
      company,
      carModel: carModel || undefined,
      carCategory,
      pickupLocation,
      dropoffLocation: dropoffLocation || undefined,
      pickupDate,
      dropoffDate,
      cost: Number(cost),
      currency,
      confirmationNumber: confirmationNumber || undefined,
      driverName: driverName || undefined,
      includesInsurance,
      notes: notes || undefined,
    }
    if (editRental) {
      updateCarRental(tripId, editRental.id, data)
    } else {
      addCarRental(tripId, data)
    }
    onClose()
  }

  return (
    <Modal isOpen={open} onClose={onClose} size="lg" title={editRental ? 'עריכת השכרת רכב' : 'הוספת השכרת רכב'}>
      <Stack direction="column" spacing="md">
        <Stack direction="row" spacing="md">
          <Input label="חברת השכרה" value={company} onChange={e => setCompany(e.target.value)} placeholder="Hertz, Avis, Budget..." style={{ flex: 2 }} />
          <Select label="קטגוריה" value={carCategory} onChange={e => setCarCategory(e.target.value as CarCategory)} style={{ flex: 1 }}>
            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Stack>
        <Input label="דגם רכב" value={carModel} onChange={e => setCarModel(e.target.value)} placeholder="Toyota Corolla, Fiat 500..." />
        <Stack direction="row" spacing="md">
          <Input label="מיקום איסוף" value={pickupLocation} onChange={e => setPickupLocation(e.target.value)} placeholder="שדה התעופה רומא" style={{ flex: 1 }} />
          <Input label="מיקום החזרה" value={dropoffLocation} onChange={e => setDropoffLocation(e.target.value)} placeholder="כמו האיסוף אם ריק" style={{ flex: 1 }} />
        </Stack>
        <Stack direction="row" spacing="md">
          <Input type="date" label="תאריך איסוף" value={pickupDate} onChange={e => setPickupDate(e.target.value)} style={{ flex: 1 }} />
          <Input type="date" label="תאריך החזרה" value={dropoffDate} onChange={e => setDropoffDate(e.target.value)} style={{ flex: 1 }} />
        </Stack>
        <Stack direction="row" spacing="md">
          <Input label="עלות" value={cost} onChange={e => setCost(e.target.value)} type="number" min="0" style={{ flex: 1 }} />
          <Select label="מטבע" value={currency} onChange={e => setCurrency(e.target.value)} style={{ flex: 1 }}>
            {CURRENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Stack>
        <Stack direction="row" spacing="md">
          <Input label="מספר אישור" value={confirmationNumber} onChange={e => setConfirmationNumber(e.target.value)} placeholder="HR123456" style={{ flex: 1 }} />
          <Input label="שם הנהג" value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="ישראל ישראלי" style={{ flex: 1 }} />
        </Stack>
        <Checkbox checked={includesInsurance} onChange={e => setIncludesInsurance(e.target.checked)} label="ביטוח כלול" />
        <Textarea label="הערות" value={notes} onChange={e => setNotes(e.target.value)} resize="vertical" />
        <Stack direction="row" justify="end" spacing="sm">
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
          <Button variant="primary" onClick={handleSave} disabled={!company.trim() || !pickupLocation.trim()}>שמור</Button>
        </Stack>
      </Stack>
    </Modal>
  )
}
