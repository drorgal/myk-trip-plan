import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Stack, Typography, Button, Badge, ActionIcon, EmptyState, Select,
  Progress, Checkbox, Box,
} from 'myk-library'
import { DataTable } from 'myk-library'
import type { ColumnDef } from 'myk-library'
import { Plus, Pencil, Trash2, Backpack } from 'lucide-react'
import styled from 'styled-components'
import { useTripStore } from '@/stores/tripStore'
import type { PackingItem, PackingCategory } from '@/types/packing'
import { PACKING_CATEGORY_LABEL, DEFAULT_PACKING_ITEMS } from '@/types/packing'
import PackingFormModal from '@/components/packing/PackingFormModal'
import { useBreakpoint } from '@/hooks/useBreakpoint'

const PageWrapper = styled.div<{ $mobile: boolean }>`
  padding: ${({ $mobile }) => ($mobile ? '12px' : '24px')};
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const ProgressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

export default function Packing() {
  const { id } = useParams<{ id: string }>()
  const trip = useTripStore(s => s.trips.find(t => t.id === id))
  const togglePackingItem = useTripStore(s => s.togglePackingItem)
  const removePackingItem = useTripStore(s => s.removePackingItem)
  const addDefaultPackingItems = useTripStore(s => s.addDefaultPackingItems)

  const { isMobile } = useBreakpoint()
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<PackingItem | undefined>()
  const [categoryFilter, setCategoryFilter] = useState<PackingCategory | ''>('')
  const [packedFilter, setPackedFilter] = useState<'all' | 'packed' | 'unpacked'>('all')

  const items = trip?.packingItems ?? []

  const { filtered, packedCount, totalCount } = useMemo(() => {
    const packed = items.filter(i => i.packed).length
    const filtered = items.filter(i => {
      if (categoryFilter && i.category !== categoryFilter) return false
      if (packedFilter === 'packed' && !i.packed) return false
      if (packedFilter === 'unpacked' && i.packed) return false
      return true
    })
    return { filtered, packedCount: packed, totalCount: items.length }
  }, [items, categoryFilter, packedFilter])

  const progressPct = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0

  const handleAddDefaults = () => {
    const existing = new Set(items.map(i => i.title.toLowerCase()))
    const toAdd = DEFAULT_PACKING_ITEMS.filter(i => !existing.has(i.title.toLowerCase()))
    if (toAdd.length > 0 && id) addDefaultPackingItems(id, toAdd)
  }

  const columns: ColumnDef<PackingItem>[] = useMemo(() => [
    {
      key: 'packed',
      header: '',
      width: 48,
      cell: (item) => (
        <div onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={item.packed}
            onChange={() => id && togglePackingItem(id, item.id)}
            aria-label={`${item.packed ? 'בטל' : 'סמן'}: ${item.title}`}
          />
        </div>
      ),
    },
    {
      key: 'title',
      header: 'פריט',
      cell: (item) => (
        <Stack direction="column" spacing="xs">
          <Typography
            variant="body2"
            weight="semibold"
            style={{ textDecoration: item.packed ? 'line-through' : undefined, opacity: item.packed ? 0.6 : 1 }}
          >
            {item.title}
            {item.quantity && item.quantity > 1 && (
              <span style={{ fontWeight: 400, marginRight: 6, opacity: 0.7 }}>×{item.quantity}</span>
            )}
          </Typography>
          {item.notes && (
            <Typography variant="caption" color="#6b7280">{item.notes}</Typography>
          )}
        </Stack>
      ),
    },
    {
      key: 'category',
      header: 'קטגוריה',
      width: 160,
      cell: (item) => <Badge size="sm">{PACKING_CATEGORY_LABEL[item.category]}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      width: 88,
      cell: (item) => (
        <Stack direction="row" spacing="xs">
          <ActionIcon size="sm" variant="subtle" onClick={() => setEditItem(item)}>
            <Pencil size={12} />
          </ActionIcon>
          <ActionIcon
            size="sm"
            variant="subtle"
            onClick={() => {
              if (!id) return
              if (confirm(`למחוק "${item.title}"?`)) removePackingItem(id, item.id)
            }}
          >
            <Trash2 size={12} />
          </ActionIcon>
        </Stack>
      ),
    },
  ], [id, removePackingItem, togglePackingItem])

  if (!trip) return null

  return (
    <PageWrapper $mobile={isMobile}>
      <Stack direction="row" align="center" justify="between" spacing="md">
        <Stack direction="row" align="center" spacing="sm">
          <Typography variant="h5" style={{ margin: 0 }}>
            <Stack direction="row" spacing="xs" align="center">
              <Backpack size={18} />
              <span>ציוד לטיול</span>
            </Stack>
          </Typography>
          <Badge variant="info" size="sm">{totalCount} פריטים</Badge>
          <Badge variant="success" size="sm">{packedCount} ארוזים</Badge>
          {totalCount - packedCount > 0 && (
            <Badge variant="warning" size="sm">{totalCount - packedCount} נשארו</Badge>
          )}
        </Stack>

        <Stack direction="row" spacing="sm">
          {items.length === 0 && (
            <Button variant="ghost" size="sm" onClick={handleAddDefaults}>
              הוסף סט בסיסי
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
            <Stack direction="row" spacing="xs" align="center">
              <Plus size={14} />
              <span>הוסף פריט</span>
            </Stack>
          </Button>
        </Stack>
      </Stack>

      {totalCount > 0 && (
        <ProgressRow>
          <Typography variant="body2" style={{ minWidth: 40 }}>{progressPct}%</Typography>
          <div style={{ flex: 1 }}>
          <Progress value={progressPct} variant={progressPct === 100 ? 'success' : 'primary'} size="sm" />
        </div>
          <Typography variant="body2" style={{ opacity: 0.6 }}>{packedCount}/{totalCount}</Typography>
        </ProgressRow>
      )}

      <Stack direction={isMobile ? 'column' : 'row'} spacing="md" align={isMobile ? 'stretch' : 'end'}>
        <Select
          label="קטגוריה"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as PackingCategory | '')}
          style={isMobile ? {} : { width: 200 }}
        >
          <option value="">כל הקטגוריות</option>
          {(Object.keys(PACKING_CATEGORY_LABEL) as PackingCategory[]).map(cat => (
            <option key={cat} value={cat}>{PACKING_CATEGORY_LABEL[cat]}</option>
          ))}
        </Select>

        <Select
          label="סטטוס"
          value={packedFilter}
          onChange={e => setPackedFilter(e.target.value as typeof packedFilter)}
          style={isMobile ? {} : { width: 160 }}
        >
          <option value="all">הכול</option>
          <option value="unpacked">לא ארוז</option>
          <option value="packed">ארוז</option>
        </Select>
      </Stack>

      {items.length === 0 ? (
        <EmptyState
          title="רשימת הציוד ריקה"
          description="הוסף פריטים לציוד שתצטרך לטיול, או לחץ על 'הוסף סט בסיסי' להתחלה מהירה"
          actionText="הוסף סט בסיסי"
          onAction={handleAddDefaults}
        />
      ) : (
        <Box style={{ overflowX: 'auto' }}>
          <DataTable
            columns={columns}
            data={filtered}
            variant="striped"
            size="sm"
            emptyState={(
              <EmptyState
                title="אין תוצאות"
                description="נסה לשנות את הפילטרים"
                actionText="נקה פילטרים"
                onAction={() => { setCategoryFilter(''); setPackedFilter('all') }}
              />
            )}
          />
        </Box>
      )}

      <PackingFormModal open={showAdd} onClose={() => setShowAdd(false)} tripId={trip.id} />
      {editItem && (
        <PackingFormModal
          key={editItem.id}
          open={!!editItem}
          onClose={() => setEditItem(undefined)}
          tripId={trip.id}
          editItem={editItem}
        />
      )}
    </PageWrapper>
  )
}
