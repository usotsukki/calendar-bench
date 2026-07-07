import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { CalendarEvent } from './types'

interface EventsState {
  events: CalendarEvent[]
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void
  removeEvent: (id: string) => void
  clearAll: () => void
}

function makeId(): string {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export const useEventsStore = create<EventsState>()(
  persist(
    set => ({
      events: [],
      addEvent: input =>
        set(state => {
          const now = new Date().toISOString()
          return {
            events: [...state.events, { ...input, id: makeId(), createdAt: now, updatedAt: now }],
          }
        }),
      removeEvent: id => set(state => ({ events: state.events.filter(event => event.id !== id) })),
      clearAll: () => set({ events: [] }),
    }),
    {
      name: 'calendar-bench-events',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
