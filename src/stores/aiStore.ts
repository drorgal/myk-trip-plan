import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { generateId } from '@/utils/id'

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface AiSettings {
  provider: 'openai' | 'ollama'
  openaiApiKey: string
  openaiModel: string
  ollamaUrl: string
  ollamaModel: string
}

interface AiStore extends AiSettings {
  chatHistory: Record<string, AiMessage[]>
  updateSettings: (patch: Partial<AiSettings>) => void
  addMessage: (tripId: string, msg: Omit<AiMessage, 'id' | 'timestamp'>) => AiMessage
  clearHistory: (tripId: string) => void
}

export const useAiStore = create<AiStore>()(
  persist(
    (set) => ({
      provider: 'openai',
      openaiApiKey: '',
      openaiModel: 'gpt-4o-mini',
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: 'llama3.2',
      chatHistory: {},

      updateSettings: (patch) => set(state => ({ ...state, ...patch })),

      addMessage: (tripId, msg) => {
        const full: AiMessage = { ...msg, id: generateId(), timestamp: new Date().toISOString() }
        set(state => ({
          chatHistory: {
            ...state.chatHistory,
            [tripId]: [...(state.chatHistory[tripId] ?? []), full],
          },
        }))
        return full
      },

      clearHistory: (tripId) =>
        set(state => ({
          chatHistory: { ...state.chatHistory, [tripId]: [] },
        })),
    }),
    {
      name: 'ai-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
