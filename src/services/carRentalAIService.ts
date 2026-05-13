import type { CarRentalOffer } from './carRentalSearchService'
import type { TripPlan } from '@/types/trip-plan'

export interface AICarRecommendation {
  topPickId: string
  bestValueId: string
  premiumPickId?: string
  reasoning: string
  warnings: string[]
}

function buildContext(offers: CarRentalOffer[], trip: TripPlan | null): string {
  const tripInfo = trip
    ? `TRIP: ${trip.name}, יעד: ${trip.destination ?? 'לא צוין'}, תאריכים: ${trip.startDate} עד ${trip.endDate}
תקציב שנותר: ${trip.budget?.totalBudget != null ? `${trip.budget.totalBudget} ${trip.budget.currency}` : 'לא הוגדר'}`
    : 'TRIP: לא בחרת טיול'

  const offersText = offers
    .map((o, i) =>
      `[${i + 1}] ID=${o.offerId} | ${o.company} | ${o.carModel} (${o.carCategory}) | ` +
      `${o.transmission === 'automatic' ? 'אוטומט' : 'ידני'} | ${o.seats} מושבים | ` +
      `${o.totalPrice} ${o.currency} סה"כ (${o.pricePerDay} ליום) | ` +
      `ביטוח: ${o.includesInsurance ? 'כלול' : 'לא כלול'} | ` +
      `דלק: ${o.fuelPolicy} | דירוג: ${o.rating ?? 'N/A'}`
    )
    .join('\n')

  return `${tripInfo}

תוצאות חיפוש (${offers.length} הצעות):
${offersText}`
}

const SYSTEM_PROMPT = `אתה יועץ נסיעות מומחה. קבל רשימת הצעות להשכרת רכב ובחר את הטובות ביותר לפי:
1. יחס מחיר-איכות
2. ביטוח כלול
3. דירוג וביקורות
4. מדיניות דלק

ענה אך ורק ב-JSON תקין בפורמט הבא (בלי markdown, בלי קוד blocks):
{
  "topPickId": "id של ההמלצה הראשית",
  "bestValueId": "id של ה-value הכי טוב",
  "premiumPickId": "id של האפשרות הפרמיום (אופציונלי, null אם אין)",
  "reasoning": "הסבר קצר בעברית (2-3 משפטים) למה בחרת",
  "warnings": ["אזהרה 1", "אזהרה 2"]
}`

export async function getCarRentalRecommendation(
  offers: CarRentalOffer[],
  trip: TripPlan | null,
  openaiApiKey: string,
  model = 'gpt-4o-mini'
): Promise<AICarRecommendation> {
  if (!openaiApiKey) throw new Error('OpenAI API key חסר — הגדר אותו בדף הפרופיל')
  if (offers.length === 0) throw new Error('אין הצעות לניתוח')

  const userMessage = buildContext(offers, trip)

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 400,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`OpenAI error: ${err.error?.message ?? res.status}`)
  }

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content ?? ''

  try {
    const parsed = JSON.parse(raw)
    return {
      topPickId: parsed.topPickId ?? offers[0].offerId,
      bestValueId: parsed.bestValueId ?? offers[0].offerId,
      premiumPickId: parsed.premiumPickId ?? undefined,
      reasoning: parsed.reasoning ?? '',
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    }
  } catch {
    return {
      topPickId: offers[0].offerId,
      bestValueId: offers[0].offerId,
      reasoning: raw,
      warnings: [],
    }
  }
}
