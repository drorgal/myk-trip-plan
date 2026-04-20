export type PackingCategory = 'clothing' | 'toiletries' | 'documents' | 'electronics' | 'other'

export interface PackingItem {
  id: string
  title: string
  category: PackingCategory
  packed: boolean
  quantity?: number
  notes?: string
}

export const PACKING_CATEGORY_LABEL: Record<PackingCategory, string> = {
  clothing: '👕 ביגוד',
  toiletries: '🪥 טיפוח',
  documents: '📄 מסמכים',
  electronics: '🔌 אלקטרוניקה',
  other: '🎒 אחר',
}

export const DEFAULT_PACKING_ITEMS: Omit<PackingItem, 'id'>[] = [
  { title: 'דרכון', category: 'documents', packed: false },
  { title: 'כרטיסי טיסה', category: 'documents', packed: false },
  { title: 'ביטוח נסיעות', category: 'documents', packed: false },
  { title: 'מטען לטלפון', category: 'electronics', packed: false },
  { title: 'אוזניות', category: 'electronics', packed: false },
  { title: 'מצלמה', category: 'electronics', packed: false },
  { title: 'חולצות', category: 'clothing', packed: false, quantity: 5 },
  { title: 'מכנסיים', category: 'clothing', packed: false, quantity: 2 },
  { title: 'נעליים נוחות', category: 'clothing', packed: false },
  { title: 'מברשת שיניים', category: 'toiletries', packed: false },
  { title: 'קרם הגנה', category: 'toiletries', packed: false },
  { title: 'תרופות', category: 'other', packed: false },
]
