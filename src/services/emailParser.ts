import type { GmailMessage } from './gmail'
import type { Flight, Accommodation } from '@/types/accommodation'
import type { TripEvent } from '@/types/trip'

export type ParsedEmailType = 'flight' | 'accommodation' | 'event' | 'unknown'

export interface ParsedEmail {
  messageId: string
  type: ParsedEmailType
  subject: string
  from: string
  date: string
  flight?: Omit<Flight, 'id'>
  accommodation?: Omit<Accommodation, 'id'>
  event?: Omit<TripEvent, 'id' | 'dayId'>
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function text(msg: GmailMessage): string {
  return `${msg.subject} ${msg.snippet} ${msg.body}`.replace(/<[^>]*>/g, ' ')
}

function isoDate(raw: string): string {
  const d = new Date(raw)
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function find(src: string, re: RegExp): string {
  return re.exec(src)?.[1]?.trim() ?? ''
}

// ── Flight Parsers ────────────────────────────────────────────────────────────

const IATA_RE = /\b([A-Z]{3})\b/g
const FLIGHT_NUM_RE = /\b(LY|FR|U2|W6|LH|IZ|TK|AY|BA)\s*(\d{1,4})\b/i
const DATETIME_RE = /(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})[^\d]*(\d{2}:\d{2})/g
const PRICE_RE = /(?:ILS|₪|EUR|€|USD|\$)\s*([\d,]+)|(\d[\d,]+)\s*(?:ILS|₪|EUR|€|USD|\$)/

function parseDateTime(raw: string): string {
  const match = /(\d{1,2})[-/.:](\d{1,2})[-/.:](\d{2,4})[T\s]+(\d{2}:\d{2})/.exec(raw)
  if (!match) return ''
  const [, d, m, y, t] = match
  const year = y.length === 2 ? `20${y}` : y
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${t}`
}

function parseFlightFromText(txt: string, from: string): Omit<Flight, 'id'> | null {
  const flightMatch = FLIGHT_NUM_RE.exec(txt)
  if (!flightMatch) return null

  const airline = resolveAirline(flightMatch[1].toUpperCase(), from)
  const flightNumber = `${flightMatch[1].toUpperCase()} ${flightMatch[2]}`

  const iataCodes = [...txt.matchAll(IATA_RE)].map(m => m[1])
  const departure = iataCodes[0] ?? 'TLV'
  const arrival = iataCodes[1] ?? ''

  const datetimes: string[] = []
  for (const m of txt.matchAll(DATETIME_RE)) {
    const dt = parseDateTime(`${m[1]} ${m[2]}`)
    if (dt) datetimes.push(dt)
  }

  const priceMatch = PRICE_RE.exec(txt)
  const cost = priceMatch ? parseFloat((priceMatch[1] ?? priceMatch[2]).replace(/,/g, '')) : 0
  const currency = /EUR|€/.test(txt) ? 'EUR' : /USD|\$/.test(txt) ? 'USD' : 'ILS'
  const direction = /חזרה|return|back/i.test(txt) ? 'return' : 'outbound'
  const baggageIncluded = /כבודה|baggage included|bag included/i.test(txt)

  return {
    airline,
    flightNumber,
    departureAirport: departure,
    arrivalAirport: arrival,
    departureTime: datetimes[0] ?? '',
    arrivalTime: datetimes[1] ?? '',
    cost,
    currency,
    direction,
    cabinClass: 'economy',
    baggageIncluded,
  }
}

function resolveAirline(iata: string, fromEmail: string): string {
  const map: Record<string, string> = {
    LY: 'El Al', FR: 'Ryanair', U2: 'EasyJet',
    W6: 'Wizz Air', LH: 'Lufthansa', IZ: 'Arkia', TK: 'Turkish Airlines',
  }
  if (map[iata]) return map[iata]
  if (/elal/i.test(fromEmail)) return 'El Al'
  if (/ryanair/i.test(fromEmail)) return 'Ryanair'
  if (/easyjet/i.test(fromEmail)) return 'EasyJet'
  return iata
}

// ── Accommodation Parsers ────────────────────────────────────────────────────

function parseAccommodationFromText(txt: string, subject: string): Omit<Accommodation, 'id'> | null {
  const checkInMatch = /(?:check.in|צ'ק.אין|arrival|הגעה)[:\s]+([^\n,|]{5,30})/i.exec(txt)
  const checkOutMatch = /(?:check.out|צ'ק.אאוט|departure|עזיבה)[:\s]+([^\n,|]{5,30})/i.exec(txt)
  const confirmMatch = /(?:confirmation|אישור|booking|הזמנה)\s*(?:#|number|num|מספר)?[:\s]*([A-Z0-9]{6,20})/i.exec(txt)
  const nameMatch = /(?:hotel|מלון|hostel|אירבנב|airbnb|villa|וילה)[:\s]+([^\n,|]{3,50})/i.exec(txt)
  const priceMatch = PRICE_RE.exec(txt)

  if (!checkInMatch && !checkOutMatch) return null

  const checkIn = isoDate(checkInMatch?.[1] ?? '') || isoDate(new Date().toISOString())
  const checkOut = isoDate(checkOutMatch?.[1] ?? '') || checkIn
  const cost = priceMatch ? parseFloat((priceMatch[1] ?? priceMatch[2]).replace(/,/g, '')) : 0
  const currency = /EUR|€/.test(txt) ? 'EUR' : /USD|\$/.test(txt) ? 'USD' : 'ILS'

  let type: Accommodation['type'] = 'hotel'
  if (/airbnb/i.test(txt)) type = 'airbnb'
  else if (/hostel/i.test(txt)) type = 'hostel'
  else if (/villa/i.test(txt)) type = 'villa'

  return {
    name: nameMatch?.[1] ?? find(subject, /(?:at|ב|:)\s*(.+)$/) ?? 'לינה',
    type,
    checkIn,
    checkOut,
    cost,
    currency,
    confirmationNumber: confirmMatch?.[1],
    rating: 3,
  }
}

// ── Event Parser ─────────────────────────────────────────────────────────────

function parseEventFromText(txt: string, subject: string): Omit<TripEvent, 'id' | 'dayId'> | null {
  const dateMatch = /(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/g.exec(txt)
  const timeMatch = /(\d{2}:\d{2})/.exec(txt)
  if (!dateMatch) return null

  const priceMatch = PRICE_RE.exec(txt)
  const cost = priceMatch ? parseFloat((priceMatch[1] ?? priceMatch[2]).replace(/,/g, '')) : 0

  return {
    startTime: timeMatch?.[1] ?? '10:00',
    title: subject.replace(/^(?:re:|fwd?:)\s*/i, '').slice(0, 60),
    category: 'activity',
    cost,
  }
}

// ── Classifier ───────────────────────────────────────────────────────────────

function classify(msg: GmailMessage): ParsedEmailType {
  const from = msg.from.toLowerCase()
  const subj = msg.subject.toLowerCase()
  const body = msg.body.toLowerCase()

  if (/elal|ryanair|easyjet|wizzair|lufthansa|israir|arkia|turkish|flight|טיסה/i.test(`${from} ${subj}`)) return 'flight'
  if (/booking\.com|airbnb|hotels\.com|hostelworld|מלון|hotel|check.in/i.test(`${from} ${subj} ${body}`)) return 'accommodation'
  if (/getyourguide|viator|klook|activity|tour|tickets?/i.test(`${from} ${subj}`)) return 'event'
  if (FLIGHT_NUM_RE.test(body)) return 'flight'
  return 'unknown'
}

// ── Main Parse Function ───────────────────────────────────────────────────────

export function parseEmails(messages: GmailMessage[]): ParsedEmail[] {
  return messages
    .map((msg): ParsedEmail => {
      const type = classify(msg)
      const txt = text(msg)
      const base = { messageId: msg.id, type, subject: msg.subject, from: msg.from, date: msg.date }

      if (type === 'flight') {
        const flight = parseFlightFromText(txt, msg.from)
        if (flight) return { ...base, flight }
      }
      if (type === 'accommodation') {
        const accommodation = parseAccommodationFromText(txt, msg.subject)
        if (accommodation) return { ...base, accommodation }
      }
      if (type === 'event') {
        const event = parseEventFromText(txt, msg.subject)
        if (event) return { ...base, event }
      }
      return { ...base, type: 'unknown' }
    })
    .filter(p => p.type !== 'unknown')
}
