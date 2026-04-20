const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

export const isGmailEnabled = (): boolean => !!CLIENT_ID

export interface GmailMessage {
  id: string
  subject: string
  from: string
  date: string
  body: string
  snippet: string
}

function buildOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    redirect_uri: window.location.origin,
    response_type: 'token',
    scope: SCOPE,
    prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export function authorizeGmail(): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = buildOAuthUrl()
    const popup = window.open(url, 'gmail-auth', 'width=500,height=600,left=200,top=100')
    if (!popup) return reject(new Error('Popup blocked'))

    const interval = setInterval(() => {
      try {
        const hash = popup.location.hash
        if (hash) {
          const params = new URLSearchParams(hash.slice(1))
          const token = params.get('access_token')
          const error = params.get('error')
          clearInterval(interval)
          popup.close()
          if (token) resolve(token)
          else reject(new Error(error ?? 'OAuth failed'))
        }
      } catch {
        // cross-origin — still loading
      }
      if (popup.closed) {
        clearInterval(interval)
        reject(new Error('Popup closed'))
      }
    }, 500)
  })
}

async function gmailFetch(token: string, path: string): Promise<unknown> {
  const res = await fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Gmail API error: ${res.status}`)
  return res.json()
}

function decodeBase64(encoded: string): string {
  const fixed = encoded.replace(/-/g, '+').replace(/_/g, '/')
  try {
    return decodeURIComponent(escape(atob(fixed)))
  } catch {
    return atob(fixed)
  }
}

function extractBody(payload: Record<string, unknown>): string {
  const parts = payload.parts as Array<Record<string, unknown>> | undefined
  const body = payload.body as Record<string, unknown> | undefined

  if (body?.data) return decodeBase64(body.data as string)
  if (parts) {
    for (const part of parts) {
      const mimeType = part.mimeType as string
      const partBody = part.body as Record<string, unknown>
      if ((mimeType === 'text/plain' || mimeType === 'text/html') && partBody?.data) {
        return decodeBase64(partBody.data as string)
      }
      const sub = extractBody(part)
      if (sub) return sub
    }
  }
  return ''
}

function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

export async function fetchTravelEmails(token: string): Promise<GmailMessage[]> {
  const query = [
    'from:elal.co.il', 'from:israir.co.il', 'from:ryanair.com',
    'from:easyjet.com', 'from:wizzair.com', 'from:lufthansa.com',
    'from:booking.com', 'from:airbnb.com', 'from:hotels.com',
    'from:getyourguide.com', 'from:viator.com','from:arbitrip.com',
  ].join(' OR ')

  const listRes = await gmailFetch(token, `/messages?q=(${query}) newer_than:2y&maxResults=30`) as { messages?: Array<{ id: string }> }
  const ids = listRes.messages ?? []

  const messages = await Promise.all(
    ids.map(async ({ id }) => {
      const msg = await gmailFetch(token, `/messages/${id}?format=full`) as Record<string, unknown>
      const payload = msg.payload as Record<string, unknown>
      const headers = payload.headers as Array<{ name: string; value: string }>
      return {
        id,
        subject: getHeader(headers, 'Subject'),
        from: getHeader(headers, 'From'),
        date: getHeader(headers, 'Date'),
        snippet: (msg.snippet as string) ?? '',
        body: extractBody(payload),
      }
    })
  )

  return messages
}
