import { useState } from 'react'
import { Modal, Button, Input, Select, Stack, ActionIcon, Typography } from 'myk-library'
import { useTripStore } from '@/stores/tripStore'
import type { FamilyMember } from '@/types/family'

const EMOJI_SUGGESTIONS = ['👤', '👨', '👩', '🧑', '👦', '👧', '🧒', '👶', '👴', '👵']

interface Props {
  open: boolean
  onClose: () => void
  tripId: string
  editMember?: FamilyMember
}

export default function FamilyMemberFormModal({ open, onClose, tripId, editMember }: Props) {
  const addFamilyMember = useTripStore(s => s.addFamilyMember)
  const updateFamilyMember = useTripStore(s => s.updateFamilyMember)

  const [name, setName] = useState(editMember?.name ?? '')
  const [emoji, setEmoji] = useState(editMember?.emoji ?? '👤')
  const [isChild, setIsChild] = useState(editMember?.isChild ?? false)

  const handleSave = () => {
    if (!name.trim()) return

    const cleanEmoji = emoji.trim() || '👤'

    if (editMember) {
      updateFamilyMember(tripId, editMember.id, {
        name: name.trim(),
        emoji: cleanEmoji,
        isChild,
      })
    } else {
      addFamilyMember(tripId, {
        name: name.trim(),
        emoji: cleanEmoji,
        isChild,
      })
    }

    handleClose()
  }

  const handleClose = () => {
    setName('')
    setEmoji('👤')
    setIsChild(false)
    onClose()
  }

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      size="md"
      title={editMember ? 'עריכת בן/בת משפחה' : 'הוספת בן/בת משפחה'}
    >
      <Stack direction="column" spacing="md">
        <Input
          label="שם"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="לדוגמה: אבא"
          autoFocus
        />

        <Stack direction="column" spacing="xs">
          <Input
            label="אייקון (אימוג׳י)"
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            placeholder="👤"
          />
          <Stack direction="row" spacing="xs" align="center" style={{ flexWrap: 'wrap' }}>
            <Typography variant="caption" color="#6b7280">בחירה מהירה:</Typography>
            {EMOJI_SUGGESTIONS.map(e => (
              <ActionIcon
                key={e}
                size="sm"
                variant={emoji === e ? 'filled' : 'subtle'}
                onClick={() => setEmoji(e)}
                aria-label={`בחר אייקון ${e}`}
                title={e}
              >
                <span style={{ fontSize: 18 }}>{e}</span>
              </ActionIcon>
            ))}
          </Stack>
        </Stack>

        <Select
          label="סוג"
          value={isChild ? 'child' : 'adult'}
          onChange={e => setIsChild(e.target.value === 'child')}
        >
          <option value="adult">מבוגר</option>
          <option value="child">ילד</option>
        </Select>

        <Stack direction="row" justify="end" spacing="sm">
          <Button variant="ghost" onClick={handleClose}>ביטול</Button>
          <Button variant="primary" onClick={handleSave} disabled={!name.trim()}>
            שמור
          </Button>
        </Stack>
      </Stack>
    </Modal>
  )
}
