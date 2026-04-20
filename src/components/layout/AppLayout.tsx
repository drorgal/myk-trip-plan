import { useEffect, useState } from 'react'
import { Outlet, useParams, Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  AppShell, Navbar, Sidebar,
  SidebarContent, SidebarNavItem, SidebarSection, SidebarSectionTitle,
  Stack, Badge, Typography,
} from 'myk-library'
import { useTripStore } from '@/stores/tripStore'
import styled from 'styled-components'
import { Map, Wallet, Plane, Home } from 'lucide-react'

const TripTitle = styled.div`
  font-weight: 600;
  font-size: 16px;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 8px;
`

const NavIcon = styled.span`
  display: flex;
  align-items: center;
  flex-shrink: 0;
`

const NavLabel = styled.span<{ $collapsed: boolean }>`
  ${({ $collapsed }) => $collapsed && 'display: none;'}
`

const FamilyRow = styled.div<{ $collapsed: boolean }>`
  padding: 4px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  ${({ $collapsed }) => $collapsed && 'justify-content: center; padding: 4px;'}
`

const NavItems = [
  { label: 'לוח זמנים', path: 'itinerary', icon: <Map size={18} /> },
  { label: 'תקציב', path: 'budget', icon: <Wallet size={18} /> },
  { label: 'טיסות ולינה', path: 'travel', icon: <Plane size={18} /> },
]

export default function AppLayout() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const trips = useTripStore(s => s.trips)
  const activeTripId = useTripStore(s => s.activeTripId)
  const setActiveTrip = useTripStore(s => s.setActiveTrip)
  const [collapsed, setCollapsed] = useState(false)

  const trip = trips.find(t => t.id === id)

  useEffect(() => {
    if (id && activeTripId !== id) {
      setActiveTrip(id)
    }
  }, [id, activeTripId, setActiveTrip])

  if (!trip) return <Navigate to="/" replace />

  const currentPath = location.pathname.split('/').pop()

  return (
    <AppShell
      fixedNavbar
      navbarHeight={60}
      sidebarWidth={collapsed ? 60 : 220}
      navbar={
        <Navbar height="sm">
          <Stack direction="row" align="center" spacing="md" style={{ padding: '0 16px', height: '100%' }}>
            <button
              onClick={() => navigate('/')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
              title="חזרה לרשימת טיולים"
            >
              <Home size={20} />
            </button>
            <TripTitle>
              <span>{trip.coverEmoji}</span>
              <span>{trip.name}</span>
            </TripTitle>
            <Badge variant="info" size="sm">{trip.destination}</Badge>
          </Stack>
        </Navbar>
      }
      sidebar={
        <Sidebar
          position="right"
          collapsible
          collapsedWidth={60}
          withBorder
          collapsed={collapsed}
          onCollapse={setCollapsed}
        >
          <SidebarContent>
            <SidebarSection $collapsed={collapsed}>
              <SidebarSectionTitle $collapsed={collapsed}>ניווט</SidebarSectionTitle>
              {NavItems.map(item => (
                <SidebarNavItem
                  key={item.path}
                  $active={currentPath === item.path}
                  $collapsed={collapsed}
                  onClick={() => navigate(`/trip/${id}/${item.path}`)}
                  title={item.label}
                >
                  <NavIcon>{item.icon}</NavIcon>
                  <NavLabel $collapsed={collapsed}>{item.label}</NavLabel>
                </SidebarNavItem>
              ))}
            </SidebarSection>

            {trip.family.length > 0 && (
              <SidebarSection $collapsed={collapsed}>
                <SidebarSectionTitle $collapsed={collapsed}>משפחה</SidebarSectionTitle>
                <FamilyRow $collapsed={collapsed}>
                  {trip.family.map(m => (
                    <Typography key={m.id} variant="body1" title={m.name} style={{ fontSize: 22, cursor: 'default' }}>
                      {m.emoji}
                    </Typography>
                  ))}
                </FamilyRow>
              </SidebarSection>
            )}
          </SidebarContent>
        </Sidebar>
      }
    >
      <Outlet />
    </AppShell>
  )
}
