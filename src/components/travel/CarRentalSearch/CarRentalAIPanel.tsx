import { Alert, Stack, Typography, Chip, Spinner } from 'myk-library'
import { Sparkles } from 'lucide-react'
import type { AICarRecommendation } from '@/services/carRentalAIService'

interface Props {
  recommendation: AICarRecommendation | null
  loading: boolean
  error: string | null
}

export default function CarRentalAIPanel({ recommendation, loading, error }: Props) {
  if (!loading && !recommendation && !error) return null

  if (loading) {
    return (
      <Stack direction="row" spacing="sm" align="center" style={{ padding: '12px 0' }}>
        <Spinner size="sm" />
        <Typography variant="body2" style={{ color: '#9ca3af' }}>AI מנתח את ההצעות...</Typography>
      </Stack>
    )
  }

  if (error) {
    return (
      <Alert variant="warning" style={{ marginBottom: 8 }}>
        ⚠️ המלצת AI לא זמינה: {error}
      </Alert>
    )
  }

  if (!recommendation) return null

  return (
    <Alert variant="info" style={{ marginBottom: 8 }}>
      <Stack direction="column" spacing="sm">
        <Stack direction="row" spacing="xs" align="center">
          <Sparkles size={16} />
          <Typography variant="body1" style={{ fontWeight: 700, margin: 0 }}>המלצת AI</Typography>
        </Stack>

        <Typography variant="body2">{recommendation.reasoning}</Typography>

        <Stack direction="row" spacing="sm" style={{ flexWrap: 'wrap' }}>
          <Chip size="sm" variant="success">⭐ המלצה ראשית</Chip>
          {recommendation.bestValueId !== recommendation.topPickId && (
            <Chip size="sm" variant="info">💰 הכי שווה</Chip>
          )}
          {recommendation.premiumPickId && (
            <Chip size="sm">✨ פרמיום</Chip>
          )}
        </Stack>

        {recommendation.warnings.length > 0 && (
          <Stack direction="column" spacing="xs">
            {recommendation.warnings.map((w, i) => (
              <Typography key={i} variant="body2" style={{ color: '#f59e0b', fontSize: 12 }}>
                ⚠️ {w}
              </Typography>
            ))}
          </Stack>
        )}
      </Stack>
    </Alert>
  )
}
