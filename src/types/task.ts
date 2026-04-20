import type { ID } from './family'

export interface TripTask {
  id: ID
  title: string
  description?: string
  dueDate?: string // yyyy-MM-dd
  assignedTo?: ID
  done: boolean
  completedAt?: string
  createdAt: string
  updatedAt: string
}

