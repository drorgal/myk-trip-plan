import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Grid, EmptyState, Button, Stack, Typography } from 'myk-library'
import { useTripStore } from '@/stores/tripStore'
import TripCard from '@/components/trip/TripCard'
import TripFormModal from '@/components/trip/TripFormModal'
import { Plus, Upload } from 'lucide-react'
import styled from 'styled-components'
import { importTripFromFile } from '@/utils/export'
import { generateId } from '@/utils/id'

const Header = styled.div`
  padding: 32px 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

export default function Home() {
  const navigate = useNavigate()
  const trips = useTripStore(s => s.trips)
  const [showCreate, setShowCreate] = useState(false)

  const handleImport = async () => {
    try {
      const imported = await importTripFromFile()
      const now = new Date().toISOString()
      useTripStore.setState(state => ({
        trips: [...state.trips, { ...imported, id: generateId(), createdAt: now, updatedAt: now }],
      }))
    } catch {
      // user cancelled or bad file — ignore silently
    }
  }

  return (
    <Container size="xl" style={{ padding: '0 24px' }}>
      <Header>
        <Stack direction="column" spacing="xs">
          <Typography variant="h3" style={{ margin: 0 }}>✈️ הטיולים שלנו</Typography>
          <Typography variant="body2" style={{ color: '#6b7280' }}>
            תכנן את הטיול המשפחתי הבא שלך
          </Typography>
        </Stack>
        <Stack direction="row" spacing="sm">
          <Button variant="ghost" onClick={handleImport} title="ייבא טיול מ-JSON">
            <Stack direction="row" spacing="xs" align="center">
              <Upload size={16} />
              <span>ייבא</span>
            </Stack>
          </Button>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Stack direction="row" spacing="xs" align="center">
              <Plus size={16} />
              <span>טיול חדש</span>
            </Stack>
          </Button>
        </Stack>
      </Header>

      {trips.length === 0 ? (
        <EmptyState
          title="אין טיולים עדיין"
          description="צור טיול חדש כדי להתחיל לתכנן!"
          actionText="צור טיול ראשון"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <Grid columns={3} gap="md">
          {trips.map(trip => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </Grid>
      )}

      <TripFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={id => navigate(`/trip/${id}/itinerary`)}
      />
    </Container>
  )
}
