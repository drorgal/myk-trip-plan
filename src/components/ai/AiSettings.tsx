import { useState } from 'react'
import { Card, Stack, Typography, Button, Select } from 'myk-library'
import type { ChangeEvent } from 'react'
import styled from 'styled-components'
import { Sparkles } from 'lucide-react'
import { useAiStore } from '@/stores/aiStore'

const SectionTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.gray[500]};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
`

const ProviderToggle = styled.div`
  display: flex;
  gap: 8px;
`

const ProviderBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: 2px solid ${({ $active, theme }) => ($active ? theme.colors.primary[500] : theme.colors.gray[200])};
  background: ${({ $active, theme }) => ($active ? 'rgba(245,158,11,0.1)' : theme.colors.gray[50])};
  color: ${({ $active, theme }) => ($active ? theme.colors.primary[500] : theme.colors.gray[600])};
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
`

const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.gray[700]};
  display: block;
  margin-bottom: 4px;
`

const StyledInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.gray[200]};
  background: ${({ theme }) => theme.colors.gray[50]};
  color: ${({ theme }) => theme.colors.gray[900]};
  font-size: 14px;
  font-family: inherit;
  box-sizing: border-box;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary[500]};
  }
`

const OPENAI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (מהיר וחסכוני)' },
  { value: 'gpt-4o', label: 'GPT-4o (חזק יותר)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
]

function handleModelChange(e: ChangeEvent<HTMLSelectElement>, updater: (val: string) => void) {
  updater(e.target.value)
}

export default function AiSettings() {
  const { provider, openaiApiKey, openaiModel, ollamaUrl, ollamaModel, updateSettings, clearHistory, chatHistory } = useAiStore()

  const [localKey, setLocalKey] = useState(openaiApiKey)
  const [localOllamaUrl, setLocalOllamaUrl] = useState(ollamaUrl)
  const [localOllamaModel, setLocalOllamaModel] = useState(ollamaModel)
  const [saved, setSaved] = useState(false)

  const totalMessages = Object.values(chatHistory).reduce((s, msgs) => s + msgs.length, 0)

  function handleSave() {
    updateSettings({
      openaiApiKey: localKey,
      ollamaUrl: localOllamaUrl,
      ollamaModel: localOllamaModel,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleClearAll() {
    Object.keys(chatHistory).forEach(tripId => clearHistory(tripId))
  }

  return (
    <Card padding="md">
      <SectionTitle>
        <Stack direction="row" spacing="xs" align="center">
          <Sparkles size={14} />
          <span>עוזר AI</span>
        </Stack>
      </SectionTitle>

      <Stack direction="column" spacing="md">
        <div>
          <Label>ספק AI</Label>
          <ProviderToggle>
            <ProviderBtn
              $active={provider === 'openai'}
              onClick={() => updateSettings({ provider: 'openai' })}
              type="button"
            >
              ☁️ OpenAI
            </ProviderBtn>
            <ProviderBtn
              $active={provider === 'ollama'}
              onClick={() => updateSettings({ provider: 'ollama' })}
              type="button"
            >
              🦙 Ollama (מקומי)
            </ProviderBtn>
          </ProviderToggle>
        </div>

        {provider === 'openai' && (
          <>
            <div>
              <Label>OpenAI API Key</Label>
              <StyledInput
                type="password"
                value={localKey}
                onChange={e => setLocalKey(e.target.value)}
                placeholder="sk-..."
                dir="ltr"
              />
            </div>
            <div>
              <Label>מודל</Label>
              <Select
                value={openaiModel}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => handleModelChange(e, val => updateSettings({ openaiModel: val }))}
                fullWidth
              >
                {OPENAI_MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </Select>
            </div>
          </>
        )}

        {provider === 'ollama' && (
          <>
            <div>
              <Label>Ollama URL</Label>
              <StyledInput
                type="text"
                value={localOllamaUrl}
                onChange={e => setLocalOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
                dir="ltr"
              />
            </div>
            <div>
              <Label>מודל</Label>
              <StyledInput
                type="text"
                value={localOllamaModel}
                onChange={e => setLocalOllamaModel(e.target.value)}
                placeholder="llama3.2"
                dir="ltr"
              />
            </div>
          </>
        )}

        <Stack direction="row" spacing="sm">
          <Button onClick={handleSave} size="sm">
            {saved ? '✓ נשמר' : 'שמור הגדרות'}
          </Button>
          {totalMessages > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
              נקה היסטוריית שיחות ({totalMessages} הודעות)
            </Button>
          )}
        </Stack>

        {provider === 'ollama' && (
          <Typography variant="body2" style={{ color: '#9ca3af', fontSize: 12 }}>
            ודא ש-Ollama רץ מקומית עם המודל המבוקש: <code>ollama run {localOllamaModel}</code>
          </Typography>
        )}
      </Stack>
    </Card>
  )
}
