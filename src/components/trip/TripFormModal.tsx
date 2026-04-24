import { useState } from 'react'
import {
  Modal, Button, Input, Stack, Stepper, NumberInput, Select,
  ActionIcon, Badge, Typography,
} from 'myk-library'
import type { Step } from 'myk-library'
import { useTripStore } from '@/stores/tripStore'
import { useArchiveStore } from '@/stores/archiveStore'
import { predictBudget } from '@/utils/profileCalculator'
import { CURRENCY_OPTIONS } from '@/utils/currency'
import { formatDateISO, getTripDuration } from '@/utils/date'
import { Plus, Trash2, Lightbulb } from 'lucide-react'
import type { FamilyMember } from '@/types/family'
import { generateId } from '@/utils/id'

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: (tripId: string) => void
}

const EMOJI_OPTIONS = ['✈️', '🏖️', '🏔️', '🌍', '🗺️', '🧳', '🏕️', '🚢']
const MEMBER_EMOJIS = ['👨', '👩', '👦', '👧', '🧒', '👴', '👵']

export default function TripFormModal({ open, onClose, onCreated }: Props) {
  const createTrip = useTripStore(s => s.createTrip)
  const setBudget = useTripStore(s => s.setBudget)
  const archivedTrips = useArchiveStore(s => s.archivedTrips)
  const today = formatDateISO(new Date())

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [coverEmoji, setCoverEmoji] = useState('✈️')
  const [totalBudget, setTotalBudget] = useState(0)
  const [currency, setCurrency] = useState('ILS')
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberEmoji, setNewMemberEmoji] = useState('👨')
  const [newMemberIsChild, setNewMemberIsChild] = useState(false)

  const steps: Step[] = [
    { key: 'details', label: 'פרטי טיול', description: 'שם, יעד, תאריכים' },
    { key: 'budget', label: 'תקציב', description: 'סכום ומטבע' },
    { key: 'family', label: 'משפחה', description: 'חברי הטיול' },
  ]

  const handleNext = () => setStep(s => Math.min(s + 1, steps.length - 1))
  const handleBack = () => setStep(s => Math.max(s - 1, 0))

  const addMember = () => {
    if (!newMemberName.trim()) return
    setMembers(prev => [
      ...prev,
      { id: generateId(), name: newMemberName.trim(), emoji: newMemberEmoji, isChild: newMemberIsChild },
    ])
    setNewMemberName('')
    setNewMemberIsChild(false)
  }

  const removeMember = (id: string) => setMembers(prev => prev.filter(m => m.id !== id))

  const handleCreate = () => {
    const trip = createTrip({
      name: name || `טיול ל${destination}`,
      destination,
      startDate,
      endDate,
      coverEmoji,
      family: members,
      packingItems: [],
      carRentals: [],
    })
    if (totalBudget > 0 || currency !== 'ILS') {
      setBudget(trip.id, totalBudget, currency)
    }
    handleClose()
    onCreated?.(trip.id)
  }

  const handleClose = () => {
    setStep(0)
    setName('')
    setDestination('')
    setStartDate(today)
    setEndDate(today)
    setCoverEmoji('✈️')
    setTotalBudget(0)
    setCurrency('ILS')
    setMembers([])
    setNewMemberName('')
    onClose()
  }

  const canFinish = name.trim() && destination.trim() && startDate && endDate

  return (
    <Modal isOpen={open} onClose={handleClose} size="lg" title="טיול חדש" closeOnBackdropClick={false}>
      <Stack direction="column" spacing="lg">
        <Stepper
          steps={steps}
          activeStep={step}
          orientation="horizontal"
        />

        {step === 0 && (
          <Stack direction="column" spacing="md">
            <Stack direction="row" spacing="sm" align="end">
              <div>
                <Typography variant="body2" style={{ fontWeight: 600 }}>אמוג'י</Typography>
                <Stack direction="row" spacing="xs" style={{ marginTop: 4 }}>
                  {EMOJI_OPTIONS.map(e => (
                    <button
                      key={e}
                      onClick={() => setCoverEmoji(e)}
                      style={{
                        fontSize: 24,
                        background: coverEmoji === e ? '#fef3c7' : 'transparent',
                        border: `2px solid ${coverEmoji === e ? '#f59e0b' : 'transparent'}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        padding: '4px 6px',
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </Stack>
              </div>
            </Stack>
            <Input label="שם הטיול" value={name} onChange={e => setName(e.target.value)} placeholder="טיול משפחתי לאיטליה" />
            <Input label="יעד" value={destination} onChange={e => setDestination(e.target.value)} placeholder="איטליה" />
            <Stack direction="row" spacing="md">
              <Input type="date" label="תאריך יציאה" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ flex: 1 }} />
              <Input type="date" label="תאריך חזרה" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ flex: 1 }} />
            </Stack>
          </Stack>
        )}

        {step === 1 && (() => {
          const days = startDate && endDate ? getTripDuration(startDate, endDate) : 1
          const familyCount = members.length || 2
          const prediction = predictBudget(archivedTrips, days, familyCount)
          return (
            <Stack direction="column" spacing="md">
              {prediction && (
                <div style={{
                  background: '#fef3c7',
                  border: '1.5px solid #f59e0b',
                  borderRadius: 10,
                  padding: '10px 14px',
                }}>
                  <Stack direction="row" spacing="sm" align="center" style={{ marginBottom: 6 }}>
                    <Lightbulb size={16} style={{ color: '#d97706' }} />
                    <Typography variant="body2" style={{ fontWeight: 700, color: '#92400e' }}>
                      תחזית מניסיון ({prediction.basedOnTrips} טיול{prediction.basedOnTrips > 1 ? 'ים' : ''})
                    </Typography>
                    <Badge variant="warning" size="sm">ביטחון {prediction.confidence === 'high' ? 'גבוה' : prediction.confidence === 'medium' ? 'בינוני' : 'נמוך'}</Badge>
                  </Stack>
                  <Typography variant="body2" style={{ color: '#78350f', marginBottom: 8 }}>
                    {days} ימים × {familyCount} נוסעים × {prediction.avgDailyPerPerson}₪ ≈ <strong>{prediction.suggested.toLocaleString('he-IL')} ₪</strong>
                  </Typography>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTotalBudget(prediction.suggested)}
                    style={{ fontSize: 12, padding: '4px 10px', color: '#92400e', border: '1px solid #d97706' }}
                  >
                    השתמש בתחזית
                  </Button>
                </div>
              )}
              <Select
                label="מטבע"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
              >
                {CURRENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
              <NumberInput
                label="תקציב כולל"
                value={totalBudget}
                onChange={val => setTotalBudget(val ?? 0)}
                min={0}
                step={100}
              />
            </Stack>
          )
        })()}

        {step === 2 && (
          <Stack direction="column" spacing="md">
            <Stack direction="row" spacing="sm" align="end">
              <Stack direction="row" spacing="xs" style={{ marginBottom: 4 }}>
                {MEMBER_EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setNewMemberEmoji(e)}
                    style={{
                      fontSize: 22,
                      background: newMemberEmoji === e ? '#fef3c7' : 'transparent',
                      border: `2px solid ${newMemberEmoji === e ? '#f59e0b' : 'transparent'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      padding: '2px 4px',
                    }}
                  >
                    {e}
                  </button>
                ))}
              </Stack>
            </Stack>
            <Stack direction="row" spacing="sm" align="end">
              <Input
                label="שם"
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                placeholder="שם חבר המשפחה"
                style={{ flex: 1 }}
                onKeyDown={e => e.key === 'Enter' && addMember()}
              />
              <Select
                label="סוג"
                value={newMemberIsChild ? 'child' : 'adult'}
                onChange={e => setNewMemberIsChild(e.target.value === 'child')}
              >
                <option value="adult">מבוגר</option>
                <option value="child">ילד</option>
              </Select>
              <ActionIcon variant="filled" onClick={addMember} style={{ marginBottom: 2 }}>
                <Plus size={16} />
              </ActionIcon>
            </Stack>
            <Stack direction="column" spacing="xs">
              {members.map(m => (
                <Stack key={m.id} direction="row" align="center" justify="between" style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: 8 }}>
                  <Stack direction="row" spacing="sm" align="center">
                    <span style={{ fontSize: 20 }}>{m.emoji}</span>
                    <span>{m.name}</span>
                    <Badge size="sm" variant={m.isChild ? 'warning' : 'default'}>{m.isChild ? 'ילד' : 'מבוגר'}</Badge>
                  </Stack>
                  <ActionIcon variant="subtle" size="sm" onClick={() => removeMember(m.id)}>
                    <Trash2 size={14} />
                  </ActionIcon>
                </Stack>
              ))}
              {members.length === 0 && (
                <Typography variant="body2" style={{ color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>
                  לא נוספו חברי משפחה עדיין
                </Typography>
              )}
            </Stack>
          </Stack>
        )}

        <Stack direction="row" justify="between" style={{ marginTop: 8 }}>
          <Button variant="ghost" onClick={step === 0 ? handleClose : handleBack}>
            {step === 0 ? 'ביטול' : 'חזרה'}
          </Button>
          {step < steps.length - 1 ? (
            <Button variant="primary" onClick={handleNext} disabled={step === 0 && (!name.trim() || !destination.trim())}>
              המשך
            </Button>
          ) : (
            <Button variant="primary" onClick={handleCreate} disabled={!canFinish}>
              צור טיול
            </Button>
          )}
        </Stack>
      </Stack>
    </Modal>
  )
}
