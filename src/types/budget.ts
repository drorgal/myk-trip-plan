import type { ID } from './family'

export type BudgetCategory = 'flights' | 'accommodation' | 'food' | 'activities' | 'transport' | 'shopping' | 'other'

export interface BudgetItem {
  id: ID
  category: BudgetCategory
  label: string
  planned: number
  actual?: number
  date?: string
  paidBy?: ID
  notes?: string
}

export interface Budget {
  currency: string
  totalBudget: number
  items: BudgetItem[]
}
