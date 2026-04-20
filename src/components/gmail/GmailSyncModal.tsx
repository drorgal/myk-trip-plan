import { useState } from 'react'
import { Modal, Button, Stack, Typography, Badge, Alert } from 'myk-library'
import { Mail, Plane, Home as HomeIcon, Calendar, Loader } from 'lucide-react'
import { authorizeGmail, fetchTravelEmails, isGmailEnabled } from '@/services/gmail'
import { parseEmails, type ParsedEmail } from '@/services/emailParser'
import { useTripStore } from '@/stores/tripStore'
import styled from 'styled-components'

interface Props {
  open: boolean
  onClose: () => void
  tripId: string
}

const EmailRow = styled.div<{ $selected: boolean }>`
  padding: 12px 16px;
  border-radius: 8px;
  border: 2px solid ${({ $selected }) => ($selected ? '#f59e0b' : '#e5e7eb')};
  background: ${({ $selected }) => ($selected ? '#fffbeb' : '#fff')};
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  &:hover { border-color: #f59e0b; }
`

const TypeIcon = ({ type }: { type: ParsedEmail['type'] }) => {
  if (type === 'flight') return <Plane size={16} color="#6366f1" />
  if (type === 'accommodation') return <HomeIcon size={16} color="#10b981" />
  return <Calendar size={16} color="#f59e0b" />
}

const typeLabel = (type: ParsedEmail['type']) => {
  if (type === 'flight') return 'טיסה'
  if (type === 'accommodation') return 'לינה'
  return 'אירוע'
}

const typeVariant = (type: ParsedEmail['type']): 'info' | 'success' | 'warning' => {
  if (type === 'flight') return 'info'
  if (type === 'accommodation') return 'success'
  return 'warning'
}

type Step = 'idle' | 'loading' | 'review' | 'done'

export default function GmailSyncModal({ open, onClose, tripId }: Props) {
  const addFlight = useTripStore(s => s.addFlight)
  const addAccommodation = useTripStore(s => s.addAccommodation)
  const addEvent = useTripStore(s => s.addEvent)
  const trips = useTripStore(s => s.trips)

  const [step, setStep] = useState<Step>('idle')
  const [parsed, setParsed] = useState<ParsedEmail[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')

  const trip = trips.find(t => t.id === tripId)

  const handleConnect = async () => {
    setError('')
    setStep('loading')
    try {
      const token = await authorizeGmail()
      const messages = await fetchTravelEmails(token)
      const results = parseEmails(messages)
      setParsed(results)
      setSelected(new Set(results.map(r => r.messageId)))
      setStep('review')
    } catch (err) {
      setError((err as Error).message || 'שגיאה בחיבור ל-Gmail')
      setStep('idle')
    }
  }

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleImport = () => {
    if (!trip) return
    const toImport = parsed.filter(p => selected.has(p.messageId))

    for (const item of toImport) {
      if (item.type === 'flight' && item.flight) {
        addFlight(tripId, item.flight)
      } else if (item.type === 'accommodation' && item.accommodation) {
        addAccommodation(tripId, item.accommodation)
      } else if (item.type === 'event' && item.event) {
        const firstDay = trip.days[0]?.date ?? trip.startDate
        addEvent(tripId, firstDay, item.event)
      }
    }
    setStep('done')
  }

  const handleClose = () => {
    setStep('idle')
    setParsed([])
    setSelected(new Set())
    setError('')
    onClose()
  }

  if (!isGmailEnabled()) {
    return (
      <Modal isOpen={open} onClose={handleClose} size="md" title="סנכרון Gmail">
        <Stack direction="column" spacing="md">
          <Alert variant="warning">
            Gmail Sync דורש הגדרת VITE_GOOGLE_CLIENT_ID.
            ראה הוראות ב-<strong>README</strong> ובקובץ <code>.env.example</code>.
          </Alert>
          <Stack direction="row" justify="end">
            <Button variant="ghost" onClick={handleClose}>סגור</Button>
          </Stack>
        </Stack>
      </Modal>
    )
  }

  return (
    <Modal isOpen={open} onClose={handleClose} size="lg" title="סנכרון מ-Gmail">
      <Stack direction="column" spacing="md">
        {step === 'idle' && (
          <>
            <Typography variant="body1" style={{ color: '#6b7280' }}>
              האפליקציה תחפש מיילי אישור של טיסות, לינה ופעילויות ותייבא אותם לטיול שלך.
            </Typography>
            <Typography variant="body2" style={{ color: '#9ca3af' }}>
              גישה לקריאה בלבד — לא נשמר, לא נשתף.
            </Typography>
            {error && <Alert variant="error">{error}</Alert>}
            <Stack direction="row" justify="end" spacing="sm">
              <Button variant="ghost" onClick={handleClose}>ביטול</Button>
              <Button variant="primary" onClick={handleConnect}>
                <Stack direction="row" spacing="xs" align="center">
                  <Mail size={16} />
                  <span>התחבר ל-Gmail</span>
                </Stack>
              </Button>
            </Stack>
          </>
        )}

        {step === 'loading' && (
          <Stack direction="column" spacing="md" align="center" style={{ padding: '32px 0' }}>
            <Loader size={32} style={{ animation: 'spin 1s linear infinite' }} />
            <Typography variant="body1">מחפש מיילים רלוונטיים...</Typography>
          </Stack>
        )}

        {step === 'review' && (
          <>
            <Typography variant="body2" style={{ color: '#6b7280' }}>
              נמצאו {parsed.length} מיילים רלוונטיים. בחר מה לייבא:
            </Typography>
            <Stack direction="column" spacing="sm" style={{ maxHeight: 340, overflowY: 'auto' }}>
              {parsed.length === 0 && (
                <Typography variant="body2" style={{ color: '#9ca3af', textAlign: 'center', padding: '24px 0' }}>
                  לא נמצאו מיילים רלוונטיים בשנתיים האחרונות
                </Typography>
              )}
              {parsed.map(item => (
                <EmailRow key={item.messageId} $selected={selected.has(item.messageId)} onClick={() => toggle(item.messageId)}>
                  <Stack direction="row" align="center" justify="between">
                    <Stack direction="row" spacing="sm" align="center">
                      <TypeIcon type={item.type} />
                      <Stack direction="column" spacing="xs">
                        <Typography variant="body2" style={{ fontWeight: 600, margin: 0 }}>{item.subject}</Typography>
                        <Typography variant="body2" style={{ color: '#9ca3af', fontSize: 12, margin: 0 }}>{item.from}</Typography>
                      </Stack>
                    </Stack>
                    <Badge variant={typeVariant(item.type)} size="sm">{typeLabel(item.type)}</Badge>
                  </Stack>
                </EmailRow>
              ))}
            </Stack>
            <Stack direction="row" justify="between" align="center">
              <Typography variant="body2" style={{ color: '#9ca3af' }}>{selected.size} נבחרו</Typography>
              <Stack direction="row" spacing="sm">
                <Button variant="ghost" onClick={handleClose}>ביטול</Button>
                <Button variant="primary" onClick={handleImport} disabled={selected.size === 0}>
                  ייבא נבחרים
                </Button>
              </Stack>
            </Stack>
          </>
        )}

        {step === 'done' && (
          <Stack direction="column" spacing="md" align="center" style={{ padding: '24px 0' }}>
            <Typography variant="h5" style={{ margin: 0 }}>✅ יובאו בהצלחה!</Typography>
            <Typography variant="body2" style={{ color: '#6b7280' }}>
              {selected.size} פריטים נוספו לטיול שלך.
            </Typography>
            <Button variant="primary" onClick={handleClose}>סגור</Button>
          </Stack>
        )}
      </Stack>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Modal>
  )
}
