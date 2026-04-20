import { useParams } from 'react-router-dom'
import {
  Stack, Typography, Badge, Card, StatCard, Progress,
} from 'myk-library'
import styled from 'styled-components'
import { useTripStore, getTotalSpent } from '@/stores/tripStore'
import { formatCurrency } from '@/utils/currency'
import { formatDateShort, getTripDuration } from '@/utils/date'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import CountdownTimer from '@/components/dashboard/CountdownTimer'
import { Wallet, ListTodo, CalendarDays, Backpack } from 'lucide-react'

const PageWrapper = styled.div<{ $mobile: boolean }>`
  padding: ${({ $mobile }) => ($mobile ? '12px' : '24px')};
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const HeroCard = styled(Card)`
  text-align: center;
  padding: 32px 24px;
`

const EmojiHero = styled.div`
  font-size: 56px;
  line-height: 1;
  margin-bottom: 8px;
`

const StatsGrid = styled.div<{ $cols: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => $cols}, 1fr);
  gap: 16px;
`

const FamilyAvatars = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 0;
`

const Avatar = styled.div`
  font-size: 32px;
  title: attr(title);
`

const SectionTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.gray[500]};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
`

export default function Dashboard() {
  const { id } = useParams<{ id: string }>()
  const trip = useTripStore(s => s.trips.find(t => t.id === id))
  const { isMobile, isTablet } = useBreakpoint()

  if (!trip) return null

  const duration = getTripDuration(trip.startDate, trip.endDate)
  const totalSpent = getTotalSpent(trip)
  const totalBudget = trip.budget.totalBudget
  const currency = trip.budget.currency
  const budgetPct = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0

  const tasks = trip.tasks ?? []
  const doneTasks = tasks.filter(t => t.done).length
  const taskPct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0

  const packingItems = trip.packingItems ?? []
  const packedItems = packingItems.filter(i => i.packed).length
  const packingPct = packingItems.length > 0 ? Math.round((packedItems / packingItems.length) * 100) : 0

  // next upcoming event
  const today = new Date().toISOString().slice(0, 10)
  const nextEvent = trip.days
    .filter(d => d.date >= today)
    .flatMap(d => d.events.map(e => ({ ...e, date: d.date })))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))[0]

  const statCols = isMobile ? 2 : isTablet ? 2 : 4

  return (
    <PageWrapper $mobile={isMobile}>

      {/* Hero */}
      <HeroCard variant="elevated" padding="lg">
        <EmojiHero>{trip.coverEmoji}</EmojiHero>
        <Typography variant="h3" style={{ margin: '0 0 4px' }}>{trip.name}</Typography>
        <Stack direction="row" align="center" justify="center" spacing="sm" style={{ marginBottom: 8 }}>
          <Badge variant="info" size="sm">📍 {trip.destination}</Badge>
          <Badge variant="default" size="sm">🗓️ {formatDateShort(trip.startDate)} – {formatDateShort(trip.endDate)}</Badge>
          <Badge variant="default" size="sm">⏱️ {duration} ימים</Badge>
        </Stack>
      </HeroCard>

      {/* Countdown */}
      <Card variant="outlined" padding="lg">
        <SectionTitle>עוד כמה עד הטיול</SectionTitle>
        <CountdownTimer startDate={trip.startDate} endDate={trip.endDate} />
      </Card>

      {/* Stats */}
      <StatsGrid $cols={statCols}>
        <StatCard
          title="תקציב"
          value={formatCurrency(totalSpent, currency)}
          description={totalBudget > 0 ? `מתוך ${formatCurrency(totalBudget, currency)}` : 'לא הוגדר'}
          icon={<Wallet size={20} />}
          color={budgetPct > 90 ? '#ef4444' : '#f59e0b'}
        />
        <StatCard
          title="משימות"
          value={`${doneTasks}/${tasks.length}`}
          description={`${taskPct}% הושלמו`}
          icon={<ListTodo size={20} />}
          color={taskPct === 100 && tasks.length > 0 ? '#10b981' : '#f59e0b'}
        />
        <StatCard
          title="ימי טיול"
          value={duration}
          description={`${trip.days.flatMap(d => d.events).length} אירועים מתוכננים`}
          icon={<CalendarDays size={20} />}
          color="#f59e0b"
        />
        <StatCard
          title="ציוד"
          value={`${packedItems}/${packingItems.length}`}
          description={packingItems.length > 0 ? `${packingPct}% ארוז` : 'לא הוגדר'}
          icon={<Backpack size={20} />}
          color={packingPct === 100 && packingItems.length > 0 ? '#10b981' : '#f59e0b'}
        />
      </StatsGrid>

      {/* Progress bars */}
      {(totalBudget > 0 || tasks.length > 0) && (
        <Card variant="outlined" padding="md">
          <Stack direction="column" spacing="md">
            {totalBudget > 0 && (
              <Stack direction="column" spacing="xs">
                <Stack direction="row" justify="between">
                  <Typography variant="body2">💰 תקציב</Typography>
                  <Typography variant="body2">{budgetPct}%</Typography>
                </Stack>
                <Progress value={budgetPct} variant={budgetPct > 90 ? 'danger' : 'primary'} size="sm" />
              </Stack>
            )}
            {tasks.length > 0 && (
              <Stack direction="column" spacing="xs">
                <Stack direction="row" justify="between">
                  <Typography variant="body2">✅ משימות</Typography>
                  <Typography variant="body2">{doneTasks}/{tasks.length}</Typography>
                </Stack>
                <Progress value={taskPct} variant={taskPct === 100 ? 'success' : 'primary'} size="sm" />
              </Stack>
            )}
            {packingItems.length > 0 && (
              <Stack direction="column" spacing="xs">
                <Stack direction="row" justify="between">
                  <Typography variant="body2">🎒 ציוד</Typography>
                  <Typography variant="body2">{packedItems}/{packingItems.length}</Typography>
                </Stack>
                <Progress value={packingPct} variant={packingPct === 100 ? 'success' : 'primary'} size="sm" />
              </Stack>
            )}
          </Stack>
        </Card>
      )}

      {/* Family */}
      {trip.family.length > 0 && (
        <Card variant="outlined" padding="md">
          <SectionTitle>👨‍👩‍👧‍👦 משפחה</SectionTitle>
          <FamilyAvatars>
            {trip.family.map(m => (
              <Stack key={m.id} direction="column" align="center" spacing="xs">
                <Avatar title={m.name}>{m.emoji}</Avatar>
                <Typography variant="caption">{m.name}</Typography>
              </Stack>
            ))}
          </FamilyAvatars>
        </Card>
      )}

      {/* Next event */}
      {nextEvent && (
        <Card variant="outlined" padding="md">
          <SectionTitle>⏭️ האירוע הבא</SectionTitle>
          <Stack direction="column" spacing="xs">
            <Typography variant="body1" style={{ fontWeight: 600 }}>{nextEvent.title}</Typography>
            <Stack direction="row" spacing="sm">
              <Badge size="sm">{formatDateShort(nextEvent.date)}</Badge>
              <Badge size="sm">🕐 {nextEvent.startTime}</Badge>
              {nextEvent.location && <Badge size="sm">📍 {nextEvent.location}</Badge>}
            </Stack>
          </Stack>
        </Card>
      )}

    </PageWrapper>
  )
}
