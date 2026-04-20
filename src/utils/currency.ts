export const formatCurrency = (amount: number, currency = 'ILS'): string => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const CURRENCY_OPTIONS = [
  { value: 'ILS', label: '₪ שקל' },
  { value: 'USD', label: '$ דולר' },
  { value: 'EUR', label: '€ יורו' },
  { value: 'GBP', label: '£ פאונד' },
]
