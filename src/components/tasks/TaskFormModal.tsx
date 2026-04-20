import { useState } from 'react'
import { Modal, Button, Input, Select, Textarea, Stack, Checkbox } from 'myk-library'
import { useTripStore } from '@/stores/tripStore'
import type { FamilyMember } from '@/types/family'
import type { TripTask } from '@/types/task'

interface Props {
  open: boolean
  onClose: () => void
  tripId: string
  family: FamilyMember[]
  editTask?: TripTask
}

export default function TaskFormModal({ open, onClose, tripId, family, editTask }: Props) {
  const addTask = useTripStore(s => s.addTask)
  const updateTask = useTripStore(s => s.updateTask)

  const [title, setTitle] = useState(editTask?.title ?? '')
  const [description, setDescription] = useState(editTask?.description ?? '')
  const [dueDate, setDueDate] = useState(editTask?.dueDate ?? '')
  const [assignedTo, setAssignedTo] = useState(editTask?.assignedTo ?? '')
  const [done, setDone] = useState(editTask?.done ?? false)

  const handleSave = () => {
    if (!title.trim()) return

    if (editTask) {
      updateTask(tripId, editTask.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        assignedTo: assignedTo || undefined,
        done,
      })
    } else {
      addTask(tripId, {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        assignedTo: assignedTo || undefined,
      })
    }

    handleClose()
  }

  const handleClose = () => {
    setTitle('')
    setDescription('')
    setDueDate('')
    setAssignedTo('')
    setDone(false)
    onClose()
  }

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      size="md"
      title={editTask ? 'עריכת משימה' : 'הוספת משימה'}
    >
      <Stack direction="column" spacing="md">
        <Input
          label="כותרת"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="לדוגמה: ביטוח נסיעות"
          autoFocus
        />

        <Textarea
          label="תיאור (אופציונלי)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          resize="vertical"
          placeholder="פרטים נוספים, קישורים, הערות..."
        />

        <Stack direction="row" spacing="md">
          <Input
            type="date"
            label="תאריך יעד (אופציונלי)"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            style={{ flex: 1 }}
          />

          <Select
            label="אחראי/ת (אופציונלי)"
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">ללא</option>
            {family.map(m => (
              <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>
            ))}
          </Select>
        </Stack>

        {editTask && (
          <Checkbox
            checked={done}
            onChange={e => setDone(e.target.checked)}
            label="סמן כבוצע"
          />
        )}

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
