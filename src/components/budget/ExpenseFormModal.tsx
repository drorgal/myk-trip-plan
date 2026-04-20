import { useState } from 'react'
import { Modal, Button, Input, Select, Textarea, NumberInput, Stack } from 'myk-library'
import { useTripStore } from '@/stores/tripStore'
import { formatDateISO } from '@/utils/date'
import type { BudgetItem, BudgetCategory } from '@/types/budget'

const CATEGORY_OPTIONS = [
  { value: 'flights', label: '✈️ טיסות' },
  { value: 'accommodation', label: '🏨 לינה' },
  { value: 'food', label: '🍽️ אוכל' },
  { value: 'activities', label: '🎯 פעילויות' },
  { value: 'transport', label: '🚌 תחבורה' },
  { value: 'shopping', label: '🛍️ קניות' },
  { value: 'other', label: '💰 אחר' },
]

interface Props {
  open: boolean
  onClose: () => void
  tripId: string
  editItem?: BudgetItem
}

export default function ExpenseFormModal({ open, onClose, tripId, editItem }: Props) {
  const addExpense = useTripStore(s => s.addExpense)
  const updateExpense = useTripStore(s => s.updateExpense)

  const today = formatDateISO(new Date())
  const [label, setLabel] = useState(editItem?.label ?? '')
  const [category, setCategory] = useState<BudgetCategory>(editItem?.category ?? 'other')
  const [planned, setPlanned] = useState<number>(editItem?.planned ?? 0)
  const [actual, setActual] = useState<number | undefined>(editItem?.actual)
  const [date, setDate] = useState(editItem?.date ?? today)
  const [notes, setNotes] = useState(editItem?.notes ?? '')

  const handleSave = () => {
    if (!label.trim()) return
    const data = { label, category, planned, actual, date, notes: notes || undefined }
    if (editItem) {
      updateExpense(tripId, editItem.id, data)
    } else {
      addExpense(tripId, data)
    }
    handleClose()
  }

  const handleClose = () => {
    setLabel('')
    setCategory('other')
    setPlanned(0)
    setActual(undefined)
    setDate(today)
    setNotes('')
    onClose()
  }

  return (
    <Modal isOpen={open} onClose={handleClose} size="md" title={editItem ? 'עריכת הוצאה' : 'הוספת הוצאה'}>
      <Stack direction="column" spacing="md">
        <Input label="תיאור" value={label} onChange={e => setLabel(e.target.value)} placeholder="שם ההוצאה" autoFocus />
        <Select label="קטגוריה" value={category} onChange={e => setCategory(e.target.value as BudgetCategory)}>
          {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Stack direction="row" spacing="md">
          <NumberInput label="מתוכנן" value={planned} onChange={val => setPlanned(val ?? 0)} min={0} style={{ flex: 1 }} />
          <NumberInput label="בפועל" value={actual} onChange={val => setActual(val ?? undefined)} min={0} style={{ flex: 1 }} />
        </Stack>
        <Input type="date" label="תאריך" value={date} onChange={e => setDate(e.target.value)} />
        <Textarea label="הערות" value={notes} onChange={e => setNotes(e.target.value)} resize="vertical" />
        <Stack direction="row" justify="end" spacing="sm">
          <Button variant="ghost" onClick={handleClose}>ביטול</Button>
          <Button variant="primary" onClick={handleSave} disabled={!label.trim()}>שמור</Button>
        </Stack>
      </Stack>
    </Modal>
  )
}
