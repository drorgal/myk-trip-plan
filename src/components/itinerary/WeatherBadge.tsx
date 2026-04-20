import styled from 'styled-components'
import { weatherCodeToEmoji, weatherCodeToLabel } from '@/services/weatherService'
import type { DayWeather } from '@/services/weatherService'

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.gray[600]};
  padding: 2px 0;
`

const Temps = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.gray[800]};
`

const Rain = styled.span`
  opacity: 0.7;
  font-size: 11px;
`

interface Props {
  data: DayWeather
}

export default function WeatherBadge({ data }: Props) {
  return (
    <Wrapper title={weatherCodeToLabel(data.weatherCode)}>
      <span>{weatherCodeToEmoji(data.weatherCode)}</span>
      <Temps>{data.maxTemp}° / {data.minTemp}°</Temps>
      {data.precipitation > 0 && <Rain>💧{data.precipitation}mm</Rain>}
    </Wrapper>
  )
}
