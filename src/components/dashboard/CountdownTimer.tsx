import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { Typography } from 'myk-library'

const Row = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: nowrap;
`

const Unit = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 0;
`

const Num = styled.div`
  font-size: clamp(28px, 8vw, 40px);
  font-weight: 700;
  line-height: 1;
  color: ${({ theme }) => theme.colors.primary[500]};
  font-variant-numeric: tabular-nums;
`

const Label = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.gray[500]};
  margin-top: 4px;
`

interface Props {
  startDate: string
  endDate: string
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default function CountdownTimer({ startDate, endDate }: Props) {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const now = Date.now()
  const start = new Date(startDate + 'T00:00:00').getTime()
  const end = new Date(endDate + 'T23:59:59').getTime()

  if (now > end) {
    return (
      <Typography variant="h4" style={{ textAlign: 'center', margin: 0 }}>
        🎉 טיול נהדר!
      </Typography>
    )
  }

  if (now >= start) {
    return (
      <Typography variant="h4" style={{ textAlign: 'center', margin: 0 }}>
        ✈️ בטיול עכשיו!
      </Typography>
    )
  }

  const diff = start - now
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return (
    <Row>
      <Unit><Num>{days}</Num><Label>ימים</Label></Unit>
      <Unit><Num>{pad(hours)}</Num><Label>שעות</Label></Unit>
      <Unit><Num>{pad(minutes)}</Num><Label>דקות</Label></Unit>
      <Unit><Num>{pad(seconds)}</Num><Label>שניות</Label></Unit>
    </Row>
  )
}
