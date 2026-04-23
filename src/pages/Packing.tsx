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
import { useArchiveStore } from '@/stores/archiveStore'
import { computeFamilyProfile } from '@/utils/profileCalculator'
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

  const archivedTrips = useArchiveStore(s => s.archivedTrips)
  const profile = useMemo(() => computeFamilyProfile(archivedTrips), [archivedTrips])
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
      <Stack direction={isMobile ? 'column' : 'row'} align={isMobile ? 'stretch' : 'center'} justify="between" spacing="sm">
        <Stack direction="row" align="center" spacing="sm" style={{ flexWrap: 'wrap' }}>
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

        <Stack direction="row" spacing="sm" justify={isMobile ? 'end' : undefined}>
          {items.length === 0 && (
            <Button variant="ghost" size="sm" onClick={handleAddDefaults} style={{ whiteSpace: 'nowrap' }}>
              הוסף סט בסיסי
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => setShowAdd(true)} style={{ whiteSpace: 'nowrap' }}>
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

      {profile && (profile.alwaysPackItems.length > 0 || profile.neverPackItems.length > 0) && (() => {
        const existingTitles = new Set(items.map(i => i.title.toLowerCase()))
        const toAdd = profile.alwaysPackItems.filter(t => !existingTitles.has(t.toLowerCase()))
        return (
          <div style={{ background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: 10, padding: '12px 14px' }}>
            <Stack direction="row" spacing="sm" align="center" style={{ marginBottom: 8 }}>
              <span>🧠</span>
              <Typography variant="body2" style={{ fontWeight: 700, color: '#92400e' }}>חכמות מניסיון שלנו</Typography>
            </Stack>
            {profile.alwaysPackItems.length > 0 && (
              <Stack direction="column" spacing="xs" style={{ marginBottom: 8 }}>
                <Typography variant="body2" style={{ fontSize: 12, color: '#78350f' }}>⭐ תמיד שימש בטיולים קודמים:</Typography>
                <Stack direction="row" spacing="xs" style={{ flexWrap: 'wrap' }}>
                  {profile.alwaysPackItems.map(t => {
                    const already = existingTitles.has(t.toLowerCase())
                    return (
                      <span key={t} style={{
                        background: already ? '#d1fae5' : '#fff',
                        border: `1.5px solid ${already ? '#10b981' : '#f59e0b'}`,
                        borderRadius: 14,
                        padding: '2px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: already ? '#065f46' : '#92400e',
                      }}>
                        {already ? '✓ ' : ''}{t}
                      </span>
                    )
                  })}
                </Stack>
              </Stack>
            )}
            {toAdd.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!id) return
                  addDefaultPackingItems(id, toAdd.map(title => ({ title, category: 'other' as const, packed: false })))
                }}
                style={{ fontSize: 12, padding: '4px 10px', color: '#92400e', border: '1px solid #d97706' }}
              >
                הוסף {toAdd.length} פריטים חכמים לרשימה
              </Button>
            )}
            {profile.neverPackItems.length > 0 && (
              <Stack direction="row" spacing="xs" style={{ flexWrap: 'wrap', marginTop: 6 }}>
                <Typography variant="body2" style={{ fontSize: 12, color: '#78350f', width: '100%' }}>🚫 לרוב לא שימש:</Typography>
                {profile.neverPackItems.map(t => (
                  <span key={t} style={{
                    background: '#fee2e2',
                    border: '1.5px solid #ef4444',
                    borderRadius: 14,
                    padding: '2px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#991b1b',
                  }}>
                    {t}
                  </span>
                ))}
              </Stack>
            )}
          </div>
        )
      })()}

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
