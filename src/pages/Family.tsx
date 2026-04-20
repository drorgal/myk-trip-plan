import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Stack, Typography, Button, Badge, ActionIcon, EmptyState, Box } from 'myk-library'
import { DataTable } from 'myk-library'
import type { ColumnDef } from 'myk-library'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import styled from 'styled-components'
import { useTripStore } from '@/stores/tripStore'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import type { FamilyMember } from '@/types/family'
import FamilyMemberFormModal from '@/components/family/FamilyMemberFormModal'

const PageWrapper = styled.div<{ $mobile: boolean }>`
  padding: ${({ $mobile }) => ($mobile ? '12px' : '24px')};
  display: flex;
  flex-direction: column;
  gap: 24px;
`

export default function Family() {
  const { id } = useParams<{ id: string }>()
  const trip = useTripStore(s => s.trips.find(t => t.id === id))

  const removeFamilyMember = useTripStore(s => s.removeFamilyMember)

  const [showAdd, setShowAdd] = useState(false)
  const [editMember, setEditMember] = useState<FamilyMember | undefined>()

  const { isMobile } = useBreakpoint()

  const counts = useMemo(() => {
    const family = trip?.family ?? []
    const children = family.filter(m => m.isChild).length
    const adults = family.length - children
    return { total: family.length, adults, children }
  }, [trip?.family])

  const columns: ColumnDef<FamilyMember>[] = useMemo(() => [
    {
      key: 'member',
      header: 'בן/בת משפחה',
      cell: (m) => (
        <Stack direction="row" spacing="sm" align="center">
          <Typography variant="h6" style={{ margin: 0 }}>{m.emoji}</Typography>
          <Stack direction="column" spacing="xs">
            <Typography variant="body2" weight="semibold">{m.name}</Typography>
            <Badge size="sm" variant={m.isChild ? 'warning' : 'default'}>
              {m.isChild ? 'ילד' : 'מבוגר'}
            </Badge>
          </Stack>
        </Stack>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 88,
      cell: (m) => (
        <Stack direction="row" spacing="xs">
          <ActionIcon size="sm" variant="subtle" onClick={() => setEditMember(m)} aria-label={`ערוך ${m.name}`}>
            <Pencil size={12} />
          </ActionIcon>
          <ActionIcon
            size="sm"
            variant="subtle"
            onClick={() => {
              if (!trip) return
              if (confirm(`למחוק את "${m.name}"?`)) {
                removeFamilyMember(trip.id, m.id)
              }
            }}
            aria-label={`מחק ${m.name}`}
          >
            <Trash2 size={12} />
          </ActionIcon>
        </Stack>
      ),
    },
  ], [removeFamilyMember, trip])

  if (!trip) return null

  return (
    <PageWrapper $mobile={isMobile}>
      <Stack direction="row" align="center" justify="between">
        <Stack direction="row" align="center" spacing="sm">
          <Typography variant="h5" style={{ margin: 0 }}>
            <Stack direction="row" spacing="xs" align="center">
              <Users size={18} />
              <span>משפחה</span>
            </Stack>
          </Typography>
          <Badge variant="info" size="sm">{counts.total} נוסעים</Badge>
          {counts.adults > 0 && <Badge size="sm">{counts.adults} מבוגרים</Badge>}
          {counts.children > 0 && <Badge variant="warning" size="sm">{counts.children} ילדים</Badge>}
        </Stack>

        <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
          <Stack direction="row" spacing="xs" align="center">
            <Plus size={14} />
            <span>הוסף בן/בת משפחה</span>
          </Stack>
        </Button>
      </Stack>

      {trip.family.length === 0 ? (
        <EmptyState
          title="אין בני משפחה עדיין"
          description="הוסף נוסעים כדי לסדר אחריות, משימות והוצאות"
          actionText="הוסף בן/בת משפחה"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <Box style={{ overflowX: 'auto' }}>
          <DataTable
            columns={columns}
            data={trip.family}
            variant="striped"
            size="sm"
            onRowClick={(m) => setEditMember(m)}
          />
        </Box>
      )}

      <FamilyMemberFormModal open={showAdd} onClose={() => setShowAdd(false)} tripId={trip.id} />
      {editMember && (
        <FamilyMemberFormModal
          key={editMember.id}
          open={!!editMember}
          onClose={() => setEditMember(undefined)}
          tripId={trip.id}
          editMember={editMember}
        />
      )}
    </PageWrapper>
  )
}

