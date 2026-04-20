import { useState } from 'react'
import { Modal, Button, Input, Select, Textarea, Stack } from 'myk-library'
import { useTripStore } from '@/stores/tripStore'
import type { PackingItem, PackingCategory } from '@/types/packing'
import { PACKING_CATEGORY_LABEL } from '@/types/packing'

interface Props {
  open: boolean
  onClose: () => void
  tripId: string
  editItem?: PackingItem
}

export default function PackingFormModal({ open, onClose, tripId, editItem }: Props) {
  const addPackingItem = useTripStore(s => s.addPackingItem)
  const updatePackingItem = useTripStore(s => s.updatePackingItem)

  const [title, setTitle] = useState(editItem?.title ?? '')
  const [category, setCategory] = useState<PackingCategory>(editItem?.category ?? 'other')
  const [quantity, setQuantity] = useState(editItem?.quantity?.toString() ?? '')
  const [notes, setNotes] = useState(editItem?.notes ?? '')

  const handleSave = () => {
    if (!title.trim()) return
    const qty = quantity ? parseInt(quantity, 10) : undefined

    if (editItem) {
      updatePackingItem(tripId, editItem.id, {
        title: title.trim(),
        category,
        quantity: qty,
        notes: notes.trim() || undefined,
      })
    } else {
      addPackingItem(tripId, {
        title: title.trim(),
        category,
        packed: false,
        quantity: qty,
        notes: notes.trim() || undefined,
      })
    }
    handleClose()
  }

  const handleClose = () => {
    setTitle('')
    setCategory('other')
    setQuantity('')
    setNotes('')
    onClose()
  }

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      size="md"
      title={editItem ? 'עריכת פריט' : 'הוספת פריט לציוד'}
    >
      <Stack direction="column" spacing="md">
        <Input
          label="שם הפריט"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="לדוגמה: מטען לטלפון"
          autoFocus
        />

        <Stack direction="row" spacing="md">
          <Select
            label="קטגוריה"
            value={category}
            onChange={e => setCategory(e.target.value as PackingCategory)}
            style={{ flex: 1 }}
          >
            {(Object.keys(PACKING_CATEGORY_LABEL) as PackingCategory[]).map(cat => (
              <option key={cat} value={cat}>{PACKING_CATEGORY_LABEL[cat]}</option>
            ))}
          </Select>

          <Input
            label="כמות (אופציונלי)"
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="1"
            style={{ width: 120 }}
          />
        </Stack>

        <Textarea
          label="הערות (אופציונלי)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          resize="vertical"
          placeholder="מידע נוסף..."
        />

        <Stack direction="row" justify="end" spacing="sm">
          <Button variant="ghost" onClick={handleClose}>ביטול</Button>
          <Button variant="primary" onClick={handleSave} disabled={!title.trim()}>
            שמור
          </Button>
        </Stack>
      </Stack>
    </Modal>
  )
}
